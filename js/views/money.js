// Invoices, receipts, requisitions and expenses.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  // ====================== Invoices ======================
  M.views.invoices = {
    title: 'Invoices',
    admin: true,
    render(id) { return id ? invoiceDetail(id) : invoiceList(); }
  };

  function invoiceList() {
    const all = Store.all('invoices').slice().sort((a, b) => (b.issueDate + b.number).localeCompare(a.issueDate + a.number));
    const f = UI.segVal('inv', 'outstanding');
    const q = (M.state.q.inv || '').toLowerCase();
    const n = (fn) => all.filter(fn).length;
    const match = {
      outstanding: (i) => L.isOutstanding(i), overdue: (i) => L.invoiceStatus(i) === 'overdue', paid: (i) => L.invoiceStatus(i) === 'paid',
      draft: (i) => i.status === 'draft', all: () => true
    }[f] || (() => true);
    let list = all.filter(match);
    if (q) list = list.filter((i) => (i.number + ' ' + L.clientName(i.clientId)).toLowerCase().includes(q));
    const outstanding = L.outstandingTotal();
    const overdue = L.sum(all.filter((i) => L.invoiceStatus(i) === 'overdue'), (i) => L.balance(i));
    const t = L.today();
    const collected = L.moneyIn(L.monthKey(t) + '-01', t);
    return `
      ${UI.pageHead('Invoices', '', UI.btn('New invoice', 'invoice-new', { kind: 'primary', icon: 'plus' }))}
      <div class="kpis three">
        <div class="kpi accent"><div class="kpi-label">Outstanding</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(outstanding)}</div></div>
        <div class="kpi"><div class="kpi-label">Overdue</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(overdue)}</div></div>
        <div class="kpi"><div class="kpi-label">Collected this month</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(collected)}</div></div>
      </div>
      <div class="toolbar">
        ${UI.seg('inv', [['outstanding', 'Unpaid', n(L.isOutstanding)], ['overdue', 'Overdue', n((i) => L.invoiceStatus(i) === 'overdue')], ['paid', 'Paid'], ['draft', 'Drafts'], ['all', 'All']], 'outstanding')}
        ${UI.search('inv', 'Search number or client')}
      </div>
      <div class="card">${list.length ? `<div class="list">${list.map((i) => {
        const st = L.invoiceStatus(i), bal = L.balance(i);
        return UI.row({
          href: '#/invoices/' + i.id, lead: UI.avatar(L.clientName(i.clientId)), title: esc(L.clientName(i.clientId)),
          sub: `${esc(i.number)} · due ${UI.date(i.dueDate)}`,
          right: money(bal > 0 && st !== 'void' && st !== 'draft' ? bal : L.totals(i).total),
          rightSub: (bal > 0 && st !== 'void' && st !== 'draft' && st !== 'sent' ? 'balance · ' : '') + UI.pill(st)
        });
      }).join('')}</div>` : UI.empty('invoice', f === 'outstanding' ? 'Nothing unpaid' : 'No invoices here', f === 'outstanding' ? 'Every issued invoice has been paid in full.' : '')}</div>`;
  }

  function invoiceDetail(id) {
    const inv = Store.get('invoices', id);
    if (!inv) return UI.empty('invoice', 'Invoice not found', '', UI.btn('Back', '', { href: '#/invoices' }));
    const st = L.invoiceStatus(inv);
    const t = L.totals(inv);
    const receipts = L.receiptsFor(id);
    const paid = L.paid(inv), bal = L.balance(inv);
    const booking = inv.bookingId && Store.get('bookings', inv.bookingId);
    const actions = [
      UI.btn('Print / PDF', 'print', { icon: 'print', data: { kind: 'invoice', id } }),
      !receipts.length && st !== 'void' ? UI.btn('Edit', 'invoice-edit', { icon: 'edit', data: { id } }) : '',
      st === 'draft' ? UI.btn('Mark as sent', 'invoice-status', { data: { id, status: 'sent' } }) : '',
      bal > 0 && st !== 'void' && st !== 'draft' ? UI.btn('Record payment', 'receipt-new', { kind: 'primary', icon: 'receipt', data: { invoice: id } }) : ''
    ].join('');
    return `
      ${UI.pageHead(`${esc(inv.number)} ${UI.pill(st)}`, `<a class="link" href="#/clients/${inv.clientId}">${esc(L.clientName(inv.clientId))}</a>${booking ? ` · <a class="link" href="#/bookings/${booking.id}">${esc(booking.eventType)} on ${UI.date(booking.date)}</a>` : ''}`,
        actions, { href: '#/invoices', label: 'Invoices' })}
      <div class="split doc-split">
        <div class="doc-frame">${M.Docs.invoice(inv)}</div>
        <div class="stack">
          ${UI.card('Summary', `<div class="card-body"><dl class="dl">
            <dt>Total</dt><dd class="num">${money(t.total)}</dd>
            <dt>Paid</dt><dd class="num">${money(paid)}</dd>
            <dt class="total">Balance due</dt><dd class="total num gold">${money(bal)}</dd>
            <dt>Due date</dt><dd>${UI.date(inv.dueDate)}${st === 'overdue' ? ` <span class="faint">(${L.daysBetween(inv.dueDate, L.today())} days late)</span>` : ''}</dd>
          </dl></div>`)}
          ${UI.card('Payments', receipts.length ? `<div class="list">${receipts.map((r) => UI.row({
            href: '#/receipts/' + r.id, lead: UI.tile('receipt', true), title: money(r.amount), sub: `${esc(r.number)} · ${esc(L.methodLabel(r.method))}`, rightSub: UI.dateShort(r.date)
          })).join('')}</div>` : UI.emptySm('No payments recorded yet.'))}
          ${!receipts.length && st !== 'void' ? `<div style="display:flex;gap:16px;padding:0 4px">
            ${st !== 'draft' ? `<button class="link" data-act="invoice-void" data-id="${id}">Void invoice</button>` : ''}
            ${st === 'draft' ? `<button class="link" style="color:var(--bad)" data-act="invoice-delete" data-id="${id}">Delete draft</button>` : ''}</div>` : ''}
        </div>
      </div>`;
  }

  const invoiceForm = (inv = {}) => {
    const co = L.company();
    const issue = inv.issueDate || L.today();
    UI.modal({
      title: inv.id ? `Edit ${inv.number}` : 'New invoice',
      form: 'invoice', wide: true, submit: inv.id ? 'Save' : 'Create invoice',
      body: `<input type="hidden" name="id" value="${esc(inv.id || '')}"><input type="hidden" name="quotationId" value="${esc(inv.quotationId || '')}">` + UI.fields([
        { label: 'Client', name: 'clientId', type: 'select', options: M.opts.clients('Choose a client…'), value: inv.clientId, required: true },
        { label: 'Booking', name: 'bookingId', type: 'select', options: M.opts.bookings(null), value: inv.bookingId },
        { label: 'Issue date', name: 'issueDate', type: 'date', value: issue, required: true },
        { label: 'Due date', name: 'dueDate', type: 'date', after: 'issueDate', value: inv.dueDate || L.addDays(issue, Number(co.invoiceDueDays) || 7), required: true },
        M.lineEditor(inv.lines, inv.discount, inv.vat ?? L.company().vatDefault, inv.vatRate),
        { label: 'Notes on the invoice', name: 'notes', type: 'textarea', value: inv.notes, full: true, placeholder: 'e.g. Balance due one week before the event.' },
        { label: 'Status', name: 'status', type: 'select', options: [['sent', 'Issued — counts as money owed'], ['draft', 'Draft — not sent yet']], value: inv.status || 'sent' }
      ])
    });
  };

  Object.assign(M.actions, {
    'invoice-new': (el) => {
      const pre = { clientId: el.dataset.client };
      if (el.dataset.booking) {
        const b = Store.get('bookings', el.dataset.booking);
        Object.assign(pre, { clientId: b.clientId, bookingId: b.id });
        const q = b.quotationId && Store.get('quotations', b.quotationId);
        if (q) Object.assign(pre, { lines: q.lines, discount: q.discount, vat: q.vat, vatRate: q.vatRate, quotationId: q.id });
      }
      if (el.dataset.quote) {
        const q = Store.get('quotations', el.dataset.quote);
        Object.assign(pre, { clientId: q.clientId, bookingId: q.bookingId, lines: q.lines, discount: q.discount, vat: q.vat, vatRate: q.vatRate, quotationId: q.id });
      }
      invoiceForm(pre);
    },
    'invoice-edit': (el) => invoiceForm(Store.get('invoices', el.dataset.id)),
    'invoice-status': (el) => { const i = Store.get('invoices', el.dataset.id); Store.save('invoices', Object.assign({}, i, { status: el.dataset.status })); UI.toast(`${i.number} marked as sent`); },
    'invoice-void': (el) => {
      const i = Store.get('invoices', el.dataset.id);
      UI.confirm(`Void ${i.number}?`, 'The invoice stays on record marked VOID and no longer counts as money owed.', () => { Store.save('invoices', Object.assign({}, i, { status: 'void' })); UI.toast('Invoice voided'); }, { label: 'Void invoice', danger: true });
    },
    'invoice-delete': (el) => {
      const i = Store.get('invoices', el.dataset.id);
      UI.confirm(`Delete ${i.number}?`, 'This draft will be removed permanently.', () => { Store.remove('invoices', i.id); M.go('invoices'); UI.toast('Draft deleted'); }, { label: 'Delete', danger: true });
    }
  });

  M.forms.invoice = (d) => {
    const lines = M.readLines(d);
    if (!d.clientId) throw UI.invalid('clientId', 'Choose a client');
    if (d.dueDate < d.issueDate) throw UI.invalid('dueDate', 'The due date is before the issue date');
    const rec = { clientId: d.clientId, bookingId: d.bookingId, issueDate: d.issueDate, dueDate: d.dueDate, lines, discount: Number(d.discount) || 0, vat: !!d.vat, vatRate: Number(d.vatRate) || 18, notes: d.notes, status: d.status };
    if (d.quotationId) rec.quotationId = d.quotationId;
    if (d.id) rec.id = d.id; else rec.number = L.nextNumber('invoices', 'INV');
    const saved = Store.save('invoices', rec);
    UI.toast(d.id ? 'Invoice updated' : `${saved.number} created`);
    M.go('invoices/' + saved.id);
  };

  // ====================== Receipts ======================
  M.views.receipts = {
    title: 'Receipts',
    admin: true,
    render(id) { return id ? receiptDetail(id) : receiptList(); }
  };

  function receiptList() {
    const f = UI.segVal('rcp', 'all');
    const q = (M.state.q.rcp || '').toLowerCase();
    let list = Store.all('receipts').slice().sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    if (f !== 'all') list = list.filter((r) => r.method === f);
    if (q) list = list.filter((r) => (r.number + ' ' + L.clientName(r.clientId) + ' ' + (r.reference || '')).toLowerCase().includes(q));
    const t = L.today();
    return `
      ${UI.pageHead('Receipts', `${money(L.moneyIn(L.monthKey(t) + '-01', t))} received this month`, UI.btn('Record payment', 'receipt-new', { kind: 'primary', icon: 'plus' }))}
      <div class="toolbar">${UI.seg('rcp', [['all', 'All'], ...L.METHODS.map(([v, l]) => [v, l.replace(' Mobile Money', ' MoMo')])], 'all')}${UI.search('rcp', 'Search number, client or reference')}</div>
      <div class="card">${list.length ? `<div class="list">${list.map((r) => UI.row({
        href: '#/receipts/' + r.id, lead: UI.tile('receipt', true), title: esc(L.clientName(r.clientId)),
        sub: `${esc(r.number)} · ${esc(L.methodLabel(r.method))}`, right: money(r.amount), rightSub: UI.date(r.date)
      })).join('')}</div>` : UI.empty('receipt', 'No receipts here', 'Receipts are created when you record a payment against an invoice.')}</div>`;
  }

  function receiptDetail(id) {
    const r = Store.get('receipts', id);
    if (!r) return UI.empty('receipt', 'Receipt not found', '', UI.btn('Back', '', { href: '#/receipts' }));
    const inv = Store.get('invoices', r.invoiceId);
    return `
      ${UI.pageHead(esc(r.number), `${money(r.amount)} from ${esc(L.clientName(r.clientId))}${inv ? ` · for <a class="link" href="#/invoices/${inv.id}">${esc(inv.number)}</a>` : ''}`,
        UI.btn('Delete', 'receipt-delete', { kind: 'danger', icon: 'trash', data: { id } }) + UI.btn('Print / PDF', 'print', { kind: 'primary', icon: 'print', data: { kind: 'receipt', id } }),
        { href: '#/receipts', label: 'Receipts' })}
      <div class="doc-frame">${M.Docs.receipt(r)}</div>`;
  }

  const receiptForm = (invoiceId) => {
    const open = L.issuedInvoices().filter((i) => L.balance(i) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (!open.length) return UI.toast('There are no unpaid invoices to record a payment against.', 'warn');
    const inv = invoiceId ? Store.get('invoices', invoiceId) : null;
    UI.modal({
      title: 'Record payment', form: 'receipt', submit: 'Save & create receipt',
      body: UI.fields([
        { label: 'Invoice', name: 'invoiceId', type: 'select', options: open.map((i) => [i.id, `${i.number} — ${L.clientName(i.clientId)} — ${money(L.balance(i))} due`]), value: invoiceId || open[0].id, required: true, full: true, attrs: ' data-change="receipt-inv"' },
        { label: 'Amount received (UGX)', name: 'amount', type: 'number', value: L.balance(inv || open[0]), required: true, min: 1 },
        { label: 'Date received', name: 'date', type: 'date', value: L.today(), required: true },
        { label: 'Method', name: 'method', type: 'select', options: L.METHODS, value: 'cash' },
        { label: 'Reference', name: 'reference', requiredIf: 'method!=cash', placeholder: 'MoMo transaction ID or bank ref', hint: 'Required for Mobile Money and bank payments.' },
        { label: 'Notes', name: 'notes', type: 'textarea', full: true, placeholder: 'e.g. Deposit, balance…' }
      ])
    });
  };
  M.live['receipt-inv'] = (el) => {
    const inv = Store.get('invoices', el.value);
    const amt = el.form.querySelector('[name=amount]');
    if (inv && amt) amt.value = L.balance(inv);
  };

  Object.assign(M.actions, {
    'receipt-new': (el) => receiptForm(el.dataset.invoice),
    'receipt-delete': (el) => {
      const r = Store.get('receipts', el.dataset.id);
      UI.confirm(`Delete ${r.number}?`, 'The payment will be removed and the invoice balance will go back up. Only do this if it was recorded by mistake.', () => {
        Store.remove('receipts', r.id); M.go(r.invoiceId ? 'invoices/' + r.invoiceId : 'receipts'); UI.toast('Receipt deleted');
      }, { label: 'Delete receipt', danger: true });
    }
  });

  M.forms.receipt = (d) => {
    const inv = Store.get('invoices', d.invoiceId);
    if (!inv) throw UI.invalid('invoiceId', 'Choose an invoice');
    const amount = Math.round(Number(d.amount) || 0);
    const bal = L.balance(inv);
    if (amount <= 0) throw UI.invalid('amount', 'Enter the amount received');
    if (amount > bal) throw UI.invalid('amount', `That is more than the balance of ${money(bal)}`);
    if (d.method !== 'cash' && !d.reference) throw UI.invalid('reference', 'Add the transaction reference');
    const saved = Store.save('receipts', {
      number: L.nextNumber('receipts', 'RCP'), invoiceId: inv.id, clientId: inv.clientId,
      date: d.date, amount, method: d.method, reference: d.reference, notes: d.notes
    });
    UI.toast(`${saved.number} saved — ${amount === bal ? 'invoice paid in full' : money(bal - amount) + ' still due'}`);
    M.go('receipts/' + saved.id);
  };

  // ====================== Requisitions ======================
  M.views.requisitions = {
    title: 'Requisitions',
    render(id) { return id ? reqDetail(id) : reqList(); }
  };

  function reqList() {
    const admin = M.isAdmin();
    let all = Store.all('requisitions').slice();
    if (!admin) all = all.filter((r) => r.requestedBy === M.user.id);
    all.sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    const f = UI.segVal('req', admin ? 'pending' : 'all');
    const n = (s) => all.filter((r) => r.status === s).length;
    const list = f === 'all' ? all : all.filter((r) => r.status === f);
    const waiting = L.sum(all.filter((r) => r.status === 'pending'), (r) => r.amount);
    const toPay = L.sum(all.filter((r) => r.status === 'approved'), (r) => r.amount);
    return `
      ${UI.pageHead('Requisitions', admin ? `${money(waiting)} awaiting approval · ${money(toPay)} approved, not yet paid` : 'Request money for shoots and studio needs. An admin approves and pays it.',
        UI.btn('Request pay', 'pay-request', { icon: 'wallet' }) + UI.btn('New requisition', 'req-new', { kind: 'primary', icon: 'plus' }))}
      <div class="toolbar">${UI.seg('req', [['pending', 'Awaiting approval', n('pending')], ['approved', 'To pay', n('approved')], ['paid', 'Paid'], ['rejected', 'Rejected'], ['all', 'All']], admin ? 'pending' : 'all')}</div>
      <div class="card">${list.length ? `<div class="list">${list.map((r) => UI.row({
        href: '#/requisitions/' + r.id, lead: L.userAvatar(r.requestedBy), title: esc(r.purpose),
        sub: `${esc(r.number)} · ${esc(L.userName(r.requestedBy))} · ${UI.dateShort(r.date)}`, right: money(r.amount), rightSub: UI.pill(r.status)
      })).join('')}</div>` : UI.empty('request', 'No requisitions here', admin ? 'Requests from your team will appear here for approval.' : 'Need money for transport, printing or crew? Request it here.', UI.btn('New requisition', 'req-new', { kind: 'primary', icon: 'plus' }))}</div>`;
  }

  // Requisitions and expenses list their items. Older records had a single amount; show those as one line.
  const itemLines = (rec, name) => rec.lines && rec.lines.length ? rec.lines : rec.amount ? [{ name, qty: 1, price: rec.amount }] : [];
  const itemsCard = (lines) => UI.card('Items', `<div class="list">${lines.map((l) => UI.row({
    title: esc(l.name), sub: `${UI.num(l.qty)} × ${money(l.price)}`, right: money(l.qty * l.price)
  })).join('')}</div>`, { action: `<span class="hint num">${money(L.totals({ lines }).total)}</span>` });

  function reqDetail(id) {
    const r = Store.get('requisitions', id);
    if (!r || (!M.isAdmin() && r.requestedBy !== M.user.id)) return UI.empty('request', 'Requisition not found', '', UI.btn('Back', '', { href: '#/requisitions' }));
    const admin = M.isAdmin();
    const b = r.bookingId && Store.get('bookings', r.bookingId);
    const mine = r.requestedBy === M.user.id;
    const actions = [
      admin && r.status === 'pending' ? UI.btn('Reject', 'req-reject', { kind: 'danger', data: { id } }) + UI.btn('Approve', 'req-approve', { kind: 'primary', icon: 'check', data: { id } }) : '',
      admin && r.status === 'approved' ? UI.btn('Mark as paid', 'req-pay', { kind: 'primary', icon: 'wallet', data: { id } }) : '',
      r.status === 'pending' && (mine || admin) ? UI.btn('Edit', 'req-edit', { icon: 'edit', data: { id } }) : ''
    ].join('');
    const step = (done, label, sub) => `<div class="row" style="min-height:52px">${done ? `<div class="tile gold">${icon('check', 18, 2)}</div>` : `<div class="tile">${icon('clock', 18)}</div>`}<div class="row-main"><div class="row-title"><span>${label}</span></div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div></div>`;
    return `
      ${UI.pageHead(`${money(r.amount)} ${UI.pill(r.status)}`, esc(r.purpose), actions, { href: '#/requisitions', label: 'Requisitions' })}
      <div class="split">
        <div class="stack">
          ${UI.card('Progress', `<div class="list">
            ${step(true, `Requested by ${esc(L.userName(r.requestedBy))}`, UI.date(r.date))}
            ${r.status === 'rejected' ? step(true, `Rejected by ${esc(L.userName(r.decidedBy))}`, `${UI.date(r.decidedAt)}${r.note ? ' · ' + esc(r.note) : ''}`)
              : step(['approved', 'paid'].includes(r.status), r.decidedBy ? `Approved by ${esc(L.userName(r.decidedBy))}` : 'Waiting for approval', r.decidedAt ? UI.date(r.decidedAt) : '')}
            ${r.status !== 'rejected' ? step(r.status === 'paid', r.status === 'paid' ? `Paid via ${esc(L.methodLabel(r.paidMethod))}` : 'Payment', r.paidAt ? `${UI.date(r.paidAt)}${r.paidReference ? ' · Ref ' + esc(r.paidReference) : ''}` : '') : ''}
          </div>`)}
          ${itemsCard(itemLines(r, r.purpose))}
          ${r.attachment ? UI.card('Attachment', `<div class="card-body att">${UI.filePreview(r.attachment, false, ` data-col="requisitions" data-id="${esc(id)}" data-key="attachment"`)}</div>`) : ''}
          ${r.paidProof ? UI.card('Proof of payment', `<div class="card-body att">${UI.filePreview(r.paidProof, false, ` data-col="requisitions" data-id="${esc(id)}" data-key="paidProof"`)}</div>`) : ''}
        </div>
        ${UI.card('Details', `<div class="card-body"><dl class="dl">
          <dt>Number</dt><dd>${esc(r.number)}</dd>
          <dt>Category</dt><dd>${esc(r.category)}</dd>
          <dt>Amount</dt><dd class="num">${money(r.amount)}</dd>
          <dt>For shoot</dt><dd>${b ? `<a class="link" href="#/bookings/${b.id}">${esc(L.bookingTitle(b))}</a>` : '—'}</dd>
        </dl>${r.details ? `<p class="muted" style="margin:16px 0 0;white-space:pre-line">${esc(r.details)}</p>` : ''}</div>`,
          { foot: r.status === 'pending' && (mine || admin) ? `<button class="link" style="color:var(--bad)" data-act="req-delete" data-id="${id}">Withdraw request</button>` : '' })}
      </div>`;
  }

  const reqForm = (r = {}) => UI.modal({
    title: r.id ? 'Edit requisition' : 'New requisition', form: 'req', submit: r.id ? 'Save' : 'Submit request', wide: true,
    body: `<input type="hidden" name="id" value="${esc(r.id || '')}">` + UI.fields([
      { label: 'What is it for?', name: 'purpose', value: r.purpose, required: true, full: true, placeholder: 'e.g. Fuel for venue recce — Ivan & Eve' },
      { label: 'Category', name: 'category', type: 'select', options: L.EXPENSE_CATEGORIES, value: r.category || 'Transport' },
      { label: 'Shoot', name: 'bookingId', type: 'select', options: M.opts.bookings(null, 'General studio expense'), value: r.bookingId },
      M.costEditor(itemLines(r, r.purpose)),
      { label: 'Notes', name: 'details', type: 'textarea', value: r.details, full: true, placeholder: 'Supplier, why it is needed, anything the approver should know' },
      { label: 'Supplier quote or photo (optional)', name: 'attachment', type: 'file', accept: 'image/*,application/pdf', value: r.attachment, full: true }
    ])
  });

  Object.assign(M.actions, {
    'req-new': (el) => reqForm({ bookingId: el.dataset.booking }),
    'req-edit': (el) => { const r = Store.get('requisitions', el.dataset.id); return r.kind === 'pay' ? M.payRequestForm(r) : reqForm(r); },
    'req-delete': (el) => UI.confirm('Withdraw this request?', 'It will be removed.', () => { Store.remove('requisitions', el.dataset.id); M.go('requisitions'); UI.toast('Request withdrawn'); }, { label: 'Withdraw', danger: true }),
    'req-approve': (el) => {
      const r = Store.get('requisitions', el.dataset.id);
      Store.save('requisitions', Object.assign({}, r, { status: 'approved', decidedBy: M.user.id, decidedAt: L.today() }));
      UI.toast(`${r.number} approved`);
    },
    'req-reject': (el) => UI.modal({
      title: 'Reject requisition', form: 'req-reject', submit: 'Reject',
      body: `<input type="hidden" name="id" value="${esc(el.dataset.id)}">` + UI.fields([{ label: 'Reason (shown to the requester)', name: 'note', type: 'textarea', required: true, full: true }])
    }),
    'req-pay': (el) => {
      // Pay requests are paid on the payroll form, with any deductions.
      if ((Store.get('requisitions', el.dataset.id) || {}).kind === 'pay') return M.actions['pay-staff']({ dataset: { req: el.dataset.id } });
      const r = Store.get('requisitions', el.dataset.id);
      UI.modal({
        title: `Pay ${money(r.amount)}`, form: 'req-pay', submit: 'Mark as paid',
        body: `<input type="hidden" name="id" value="${esc(r.id)}">` + UI.fields([
          { label: 'Date paid', name: 'paidAt', type: 'date', value: L.today(), required: true },
          { label: 'Method', name: 'paidMethod', type: 'select', options: L.METHODS, value: 'mtn' },
          { label: 'Reference', name: 'paidReference', requiredIf: 'paidMethod!=cash', full: true, placeholder: 'MoMo transaction ID or bank ref' },
          { label: 'Proof of payment (photo or PDF)', name: 'paidProof', type: 'file', accept: 'image/*,application/pdf', full: true },
          `<div class="field full"><div class="hint">This also records ${esc(money(r.amount))} under Expenses → ${esc(r.category)}.</div></div>`
        ])
      });
    }
  });

  M.forms.req = (d) => {
    const lines = M.readLines(d).map(({ name, qty, price }) => ({ name, qty, price }));
    const amount = Math.round(L.totals({ lines }).total);
    if (amount <= 0) throw UI.invalid('l_price[]', 'Enter what each item costs');
    const rec = { purpose: d.purpose, amount, lines, category: d.category, bookingId: d.bookingId, details: d.details, attachment: d.attachment };
    if (d.id) rec.id = d.id;
    else {
      // With Supabase, staff only see their own requests, so a counter could clash; use a short unique code instead.
      const number = Store.mode === 'supabase' && !M.isAdmin()
        ? `REQ-${L.today().slice(0, 4)}-${Date.now().toString(36).slice(-5).toUpperCase()}`
        : L.nextNumber('requisitions', 'REQ');
      Object.assign(rec, { number, requestedBy: M.user.id, date: L.today(), status: 'pending' });
    }
    const saved = Store.save('requisitions', rec);
    UI.toast(d.id ? 'Request updated' : `${saved.number} sent for approval`);
    M.go('requisitions/' + saved.id);
  };
  M.forms['req-reject'] = (d) => {
    const r = Store.get('requisitions', d.id);
    Store.save('requisitions', Object.assign({}, r, { status: 'rejected', decidedBy: M.user.id, decidedAt: L.today(), note: d.note }));
    UI.toast(`${r.number} rejected`);
  };
  M.forms['req-pay'] = (d) => {
    const r = Store.get('requisitions', d.id);
    if (d.paidMethod !== 'cash' && !d.paidReference) throw UI.invalid('paidReference', 'Add the transaction reference');
    Store.save('requisitions', Object.assign({}, r, { status: 'paid', paidAt: d.paidAt, paidMethod: d.paidMethod, paidReference: d.paidReference, paidProof: d.paidProof }));
    Store.save('expenses', { date: d.paidAt, category: r.category, description: r.purpose, amount: r.amount, lines: itemLines(r, r.purpose), method: d.paidMethod, reference: d.paidReference, proof: d.paidProof, bookingId: r.bookingId, requisitionId: r.id });
    UI.toast(`${r.number} paid and added to expenses`);
  };

  // ====================== Expenses ======================
  M.views.expenses = {
    title: 'Expenses',
    admin: true,
    render() {
      const cat = UI.segVal('expcat', 'all');
      const q = (M.state.q.exp || '').toLowerCase();
      let list = Store.all('expenses').slice().sort((a, b) => b.date.localeCompare(a.date));
      if (cat !== 'all') list = list.filter((e) => e.category === cat);
      if (q) list = list.filter((e) => [e.description, e.category, e.paidTo, e.reference, ...(e.lines || []).map((l) => l.name)].join(' ').toLowerCase().includes(q));
      const t = L.today();
      const months = {};
      list.forEach((e) => { (months[L.monthKey(e.date)] = months[L.monthKey(e.date)] || []).push(e); });
      const used = [...new Set(Store.all('expenses').map((e) => e.category))];
      return `
        ${UI.pageHead('Expenses', `${money(L.moneyOut(L.monthKey(t) + '-01', t))} spent this month`, UI.btn('Add expense', 'expense-new', { kind: 'primary', icon: 'plus' }))}
        <div class="toolbar">${UI.seg('expcat', [['all', 'All'], ...L.EXPENSE_CATEGORIES.filter((c) => used.includes(c)).map((c) => [c, c])], 'all')}${UI.search('exp', 'Search expenses')}</div>
        ${Object.keys(months).length ? Object.keys(months).sort().reverse().map((k) => UI.card(UI.monthLabel(k, true), `<div class="list">${months[k].map((e) => UI.row({
          act: 'expense-edit', data: { id: e.id }, lead: UI.tile('wallet'), title: esc(e.description),
          sub: [esc(e.category), e.paidTo && esc(e.paidTo), esc(L.methodLabel(e.method)), e.lines && e.lines.length > 1 && `${e.lines.length} items`, e.requisitionId && 'from requisition',
            e.proof ? '<span class="proof-tag">Proof attached</span>' : '<span class="proof-tag none">No proof</span>'].filter(Boolean).join(' · '),
          right: money(e.amount), rightSub: UI.dateShort(e.date)
        })).join('')}</div>`, { action: `<span class="hint num">${money(L.sum(months[k], (e) => e.amount))}</span>` })).join('')
          : `<div class="card">${UI.empty('wallet', 'No expenses here', 'Paid requisitions and equipment repairs appear here automatically.')}</div>`}`;
    }
  };

  const expenseForm = (e = {}) => UI.modal({
    title: e.id ? 'Edit expense' : 'Add expense', form: 'expense', wide: true,
    foot: `${e.id ? `<button type="button" class="btn danger left" data-act="expense-delete" data-id="${esc(e.id)}">Delete</button>` : ''}<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">Save</button>`,
    body: `<input type="hidden" name="id" value="${esc(e.id || '')}">` + UI.fields([
      { label: 'What was it for?', name: 'description', value: e.description, required: true, full: true, placeholder: 'e.g. Crew costs — Kato & Nalwoga wedding' },
      { label: 'Date', name: 'date', type: 'date', value: e.date || L.today(), required: true },
      { label: 'Category', name: 'category', type: 'select', options: L.EXPENSE_CATEGORIES, value: e.category || 'Other' },
      { label: 'Paid to', name: 'paidTo', value: e.paidTo, placeholder: 'Supplier or person' },
      { label: 'Paid by', name: 'method', type: 'select', options: L.METHODS, value: e.method || 'cash' },
      { label: 'Reference', name: 'reference', value: e.reference, requiredIf: 'method!=cash', placeholder: 'MoMo transaction ID or bank ref' },
      { label: 'Shoot', name: 'bookingId', type: 'select', options: M.opts.bookings(null, 'General studio expense'), value: e.bookingId },
      M.costEditor(itemLines(e, e.description)),
      { label: 'Proof of payment (photo or PDF)', name: 'proof', type: 'file', accept: 'image/*,application/pdf', value: e.proof, full: true, hint: 'Receipt, MoMo message screenshot or bank slip.' }
    ])
  });

  Object.assign(M.actions, {
    'expense-new': () => expenseForm(),
    'expense-edit': (el) => { const e = Store.get('expenses', el.dataset.id); return e && e.staffId ? M.payForm(e) : expenseForm(e); },
    'expense-delete': (el) => {
      const e = Store.get('expenses', el.dataset.id);
      UI.confirm('Delete expense?', e.requisitionId ? 'This came from a paid requisition. The requisition will stay marked as paid.' : 'This removes it permanently.', () => { Store.remove('expenses', e.id); UI.toast('Expense deleted'); }, { label: 'Delete', danger: true });
    }
  });
  M.forms.expense = (d) => {
    const lines = M.readLines(d).map(({ name, qty, price }) => ({ name, qty, price }));
    const amount = Math.round(L.totals({ lines }).total);
    if (amount <= 0) throw UI.invalid('l_price[]', 'Enter what each item cost');
    if (d.method !== 'cash' && !d.reference) throw UI.invalid('reference', 'Add the transaction reference');
    const rec = { description: d.description, amount, lines, date: d.date, category: d.category, paidTo: d.paidTo, method: d.method, reference: d.reference, proof: d.proof, bookingId: d.bookingId };
    // Keep links to the requisition or repair this expense came from.
    if (d.id) Object.assign(rec, { id: d.id }, (({ requisitionId, maintenanceId }) => ({ requisitionId, maintenanceId }))(Store.get('expenses', d.id) || {}));
    Store.save('expenses', rec);
    UI.toast(d.id ? 'Expense updated' : 'Expense added');
  };
})();
