// Business rules. Every money figure in Merit is calculated here from the
// underlying records — totals and balances are never typed in by hand.
(function () {
  const M = window.M;
  const S = () => M.Store;

  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoOf(new Date());
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
  const daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  const monthKey = (iso) => String(iso || '').slice(0, 7);
  const monthsBack = (n, from = today()) => {
    const [y, m] = from.split('-').map(Number);
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
    return out;
  };
  const sum = (list, fn) => list.reduce((s, x) => s + (Number(fn(x)) || 0), 0);

  const METHODS = [['cash', 'Cash'], ['mtn', 'MTN Mobile Money'], ['airtel', 'Airtel Money'], ['bank', 'Bank transfer']];
  const ACCOUNTS = [['bank', 'Cash at bank'], ['mtn', 'MTN Mobile Money'], ['airtel', 'Airtel Money']];
  const EXPENSE_CATEGORIES = ['Transport', 'Crew fees', 'Printing', 'Equipment', 'Maintenance', 'Data & internet', 'Marketing', 'Rent & utilities', 'Meals', 'Salaries & wages', 'Other'];
  const EVENT_TYPES = ['Wedding', 'Introduction', 'Kukyala', 'Livestream', 'School term', 'Birthday', 'Graduation', 'Corporate', 'Event', 'Portrait session', 'Other'];
  const EQ_CATEGORIES = ['Camera', 'Lens', 'Drone', 'Stabiliser', 'Lighting', 'Audio', 'Tripod & support', 'Storage', 'Computer', 'Other'];
  const CONDITIONS = [['excellent', 'Excellent'], ['good', 'Good'], ['fair', 'Fair'], ['needs-repair', 'Needs repair'], ['retired', 'Retired']];

  const L = {
    today, addDays, daysBetween, monthKey, monthsBack, isoOf, sum,
    METHODS, ACCOUNTS, EXPENSE_CATEGORIES, EVENT_TYPES, EQ_CATEGORIES, CONDITIONS,
    accountLabel: (a) => (ACCOUNTS.find((x) => x[0] === a) || [a, a || '—'])[1],
    methodLabel: (m) => (METHODS.find((x) => x[0] === m) || [m, m || '—'])[1],
    conditionLabel: (c) => (CONDITIONS.find((x) => x[0] === c) || [c, c || '—'])[1],

    company: () => Object.assign({}, M.DEFAULT_COMPANY, S().get('settings', 'company') || {}),
    client: (id) => S().get('clients', id),
    clientName: (id) => (S().get('clients', id) || {}).name || 'Unknown client',
    user: (id) => S().get('users', id),
    userName: (id) => (S().get('users', id) || {}).name || '—',
    userAvatar: (id, gold) => { const u = S().get('users', id) || {}; return M.UI.avatar(u.name, gold, u.photo); },
    // WhatsApp link for a Ugandan number typed as 07…, +256… or 256…
    waLink: (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d ? 'https://wa.me/' + (d.startsWith('0') ? '256' + d.slice(1) : d) : ''; },

    // Next document number for this year, e.g. INV-2026-0012.
    nextNumber(col, prefix) {
      const year = today().slice(0, 4);
      const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      // Continue from the last number used before Merit (Settings → Numbering), for this year only.
      const co = L.company();
      const floor = co.numbersYear === year ? Number((co.lastNumbers || {})[prefix]) || 0 : 0;
      const max = S().all(col).reduce((m, r) => { const x = re.exec(r.number || ''); return x ? Math.max(m, +x[1]) : m; }, floor);
      return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
    },
    nextEquipmentCode() {
      const max = S().all('equipment').reduce((m, r) => { const x = /^EQ-(\d+)$/.exec(r.code || ''); return x ? Math.max(m, +x[1]) : m; }, 0);
      return 'EQ-' + String(max + 1).padStart(3, '0');
    },

    // ---- Documents ----
    // VAT, when ticked, is added on top of the amount after discount. Each document keeps
    // the rate it was created with, so changing the rate later never alters old invoices.
    totals(doc) {
      const subtotal = sum(doc.lines || [], (l) => (Number(l.qty) || 0) * (Number(l.price) || 0));
      const discount = Math.min(subtotal, Number(doc.discount) || 0);
      const net = subtotal - discount;
      const vatRate = doc.vat ? (Number(doc.vatRate) || Number(L.company().vatRate) || 18) : 0;
      const vat = Math.round((net * vatRate) / 100);
      return { subtotal, discount, net, vat, vatRate, total: net + vat };
    },
    receiptsFor: (invId) => S().find('receipts', (r) => r.invoiceId === invId).sort((a, b) => (a.date + a.number).localeCompare(b.date + b.number)),
    paid: (inv) => sum(L.receiptsFor(inv.id), (r) => r.amount),
    balance: (inv) => Math.max(0, L.totals(inv).total - L.paid(inv)),
    invoiceStatus(inv) {
      if (inv.status === 'void') return 'void';
      if (inv.status === 'draft') return 'draft';
      const { total } = L.totals(inv);
      const paid = L.paid(inv);
      if (total > 0 && paid >= total) return 'paid';
      if (inv.dueDate && inv.dueDate < today()) return 'overdue';
      if (paid > 0) return 'part-paid';
      return 'sent';
    },
    isOutstanding: (inv) => ['sent', 'part-paid', 'overdue'].includes(L.invoiceStatus(inv)),
    issuedInvoices: () => S().all('invoices').filter((i) => i.status !== 'void' && i.status !== 'draft'),
    quoteStatus(q) {
      if (q.status === 'sent' && q.validUntil && q.validUntil < today()) return 'expired';
      return q.status || 'draft';
    },

    // ---- Clients ----
    clientStats(id) {
      const invs = L.issuedInvoices().filter((i) => i.clientId === id);
      const billed = sum(invs, (i) => L.totals(i).total);
      const paid = sum(invs, (i) => L.paid(i));
      return { billed, paid, outstanding: sum(invs, (i) => L.balance(i)), bookings: S().find('bookings', (b) => b.clientId === id).length };
    },
    // Clients whose names look the same (e.g. "Dr Felix Ocom" entered twice).
    duplicateIds() {
      const norm = (n) => String(n || '').toLowerCase().replace(/\b(dr|eng|mr|mrs|miss|ms|prof)\b\.?/g, '').replace(/&|\band\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').sort().join(' ');
      const groups = {};
      S().all('clients').forEach((c) => { const k = norm(c.name); (groups[k] = groups[k] || []).push(c.id); });
      const dupes = new Set();
      Object.values(groups).forEach((ids) => { if (ids.length > 1) ids.forEach((i) => dupes.add(i)); });
      S().all('clients').forEach((c) => {
        if (!c.phone) return;
        const same = S().all('clients').filter((o) => o.id !== c.id && o.phone && o.phone.replace(/\D/g, '').slice(-9) === c.phone.replace(/\D/g, '').slice(-9));
        if (same.length) { dupes.add(c.id); same.forEach((o) => dupes.add(o.id)); }
      });
      return dupes;
    },

    // ---- Bookings ----
    bookingTitle: (b) => `${b.eventType || 'Booking'} · ${L.clientName(b.clientId)}`,
    clashes: (b) => b.status === 'cancelled' ? [] : S().find('bookings', (o) => o.id !== b.id && o.date === b.date && o.status !== 'cancelled'),
    // Shoots from today up to `days` ahead that everyone is reminded about.
    comingUp: (days = 3) => S().find('bookings', (b) => b.status !== 'cancelled' && b.status !== 'completed' && b.date >= today() && b.date <= addDays(today(), days))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))),
    daysAway: (iso) => { const n = daysBetween(today(), iso); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`; },
    upcoming: (days = 60) => S().find('bookings', (b) => b.status !== 'cancelled' && b.status !== 'completed' && b.date >= today() && b.date <= addDays(today(), days)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))),

    // ---- Equipment ----
    openCheckout: (eqId) => S().all('checkouts').find((c) => c.equipmentId === eqId && !c.inAt),
    equipmentStatus(eq) {
      if (eq.condition === 'retired') return 'retired';
      const co = L.openCheckout(eq.id);
      if (co) return co.dueBack && co.dueBack < today() ? 'overdue-return' : 'out';
      if (eq.condition === 'needs-repair') return 'needs-repair';
      return 'available';
    },
    serviceDue: (eq) => eq.condition !== 'retired' && !!eq.nextServiceDate && eq.nextServiceDate <= addDays(today(), 14),
    warrantyEnding: (eq) => eq.condition !== 'retired' && !!eq.warrantyExpiry && eq.warrantyExpiry >= today() && eq.warrantyExpiry <= addDays(today(), 30),
    needsAttention: (eq) => ['overdue-return', 'needs-repair'].includes(L.equipmentStatus(eq)) || L.serviceDue(eq),

    // ---- Money in / out ----
    // Money in = receipts (cash actually received). Money out = expenses.
    moneyIn: (from, to) => sum(S().find('receipts', (r) => r.date >= from && r.date <= to), (r) => r.amount),
    moneyOut: (from, to) => sum(S().find('expenses', (e) => e.date >= from && e.date <= to), (e) => e.amount),
    monthTotals(key) {
      const from = key + '-01', to = key + '-31';
      const inn = L.moneyIn(from, to), out = L.moneyOut(from, to);
      return { key, in: inn, out, net: inn - out };
    },
    outstandingTotal: () => sum(L.issuedInvoices(), (i) => L.balance(i)),
    // Money in and out for one year, split by how it was paid.
    byMethod: (y) => METHODS.map(([key, label]) => ({
      key, label,
      in: sum(S().find('receipts', (r) => (r.date || '').startsWith(y) && r.method === key), (r) => r.amount),
      out: sum(S().find('expenses', (e) => (e.date || '').startsWith(y) && e.method === key), (e) => e.amount)
    })),
    // Everything through the given accounts, oldest first, with a running balance:
    // receipts in, expenses out, plus entries added by hand. A transfer counts out of
    // one account and into the other.
    accountRows(keys) {
      const has = (a) => keys.includes(a);
      const rows = [];
      S().find('receipts', (r) => has(r.method)).forEach((r) => rows.push({
        id: r.id, account: r.method, date: r.date, amount: Number(r.amount) || 0, type: 'receipt', href: '#/receipts/' + r.id,
        title: L.clientName(r.clientId), sub: `Receipt ${r.number}`, reference: r.reference
      }));
      S().find('expenses', (e) => has(e.method)).forEach((e) => rows.push({
        id: e.id, account: e.method, date: e.date, amount: -(Number(e.amount) || 0), type: 'expense', act: 'expense-edit',
        title: e.description, sub: `Expense · ${e.category}`, reference: e.reference
      }));
      S().all('accountEntries').forEach((e) => {
        const amount = Number(e.amount) || 0;
        const base = { id: e.id, date: e.date, type: e.type, act: 'entry-edit', title: e.description, reference: e.reference };
        if (has(e.account)) rows.push({ ...base, account: e.account, amount: e.type === 'out' ? -amount : amount, sub: e.type === 'opening' ? 'Opening balance' : e.toAccount ? `Moved to ${L.accountLabel(e.toAccount)}` : 'Added record' });
        if (e.type === 'out' && e.toAccount && has(e.toAccount)) rows.push({ ...base, account: e.toAccount, amount, sub: `Moved from ${L.accountLabel(e.account)}` });
      });
      rows.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (b.type === 'opening') - (a.type === 'opening'));
      let balance = 0;
      rows.forEach((r) => { balance += r.amount; r.balance = balance; });
      return rows;
    },
    // Work moving towards money, worked out from the records so it can't drift.
    pipeline() {
      const requests = L.newRequests();
      const quotes = S().find('quotations', (q) => L.quoteStatus(q) === 'sent');
      const invoiced = new Set(S().all('invoices').filter((i) => i.status !== 'void' && i.bookingId).map((i) => i.bookingId));
      const booked = S().find('bookings', (b) => !['cancelled', 'completed'].includes(b.status) && !invoiced.has(b.id));
      const unpaid = L.issuedInvoices().filter((i) => L.balance(i) > 0);
      const quoted = (b) => { const q = b.quotationId && S().get('quotations', b.quotationId); return q ? L.totals(q).total : 0; };
      return [
        { label: 'New requests', href: '#/requests', count: requests.length, value: sum(requests, (r) => r.packagePrice) },
        { label: 'Quoted', href: '#/quotations', count: quotes.length, value: sum(quotes, (q) => L.totals(q).total) },
        { label: 'Booked, not invoiced', href: '#/bookings', count: booked.length, value: sum(booked, quoted) },
        { label: 'Invoiced, unpaid', href: '#/invoices', count: unpaid.length, value: sum(unpaid, (i) => L.balance(i)) }
      ];
    },

    // Unpaid invoices grouped by how long they are past due.
    aged() {
      const t = today();
      return L.issuedInvoices().filter((i) => L.balance(i) > 0).map((i) => {
        const late = i.dueDate ? daysBetween(i.dueDate, t) : 0;
        const bucket = late <= 0 ? 'Not yet due' : late <= 30 ? '1–30 days' : late <= 60 ? '31–60 days' : late <= 90 ? '61–90 days' : '90+ days';
        return { inv: i, late, bucket, balance: L.balance(i) };
      }).sort((a, b) => b.late - a.late);
    },
    AGE_BUCKETS: ['Not yet due', '1–30 days', '31–60 days', '61–90 days', '90+ days'],

    // ---- Requisitions ----
    pendingRequisitions: () => S().find('requisitions', (r) => r.status === 'pending'),

    // ---- Packages & public booking requests ----
    slugify: (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'package',
    // The public booking page sits next to index.html wherever Merit is hosted.
    bookingLink(pkg) {
      const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'book.html';
      return pkg ? `${base}?p=${encodeURIComponent(pkg.slug)}` : base;
    },
    categoryLink: (cat) => L.bookingLink().concat('?c=', encodeURIComponent(cat)),
    packages: () => S().all('packages').slice().sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.name.localeCompare(b.name)),
    newRequests: () => S().find('requests', (r) => r.status === 'new'),
    phoneKey: (p) => String(p || '').replace(/\D/g, '').slice(-9)
  };

  M.L = L;
})();
