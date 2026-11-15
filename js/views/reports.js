// Reports for a day, a week, a month or a year: money in and out, profit, what
// sells, where money goes, how it was paid, and who owes what.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money } = UI;

  const years = () => {
    const ys = new Set([L.today().slice(0, 4)]);
    ['receipts', 'expenses'].forEach((c) => Store.all(c).forEach((r) => r.date && ys.add(r.date.slice(0, 4))));
    Store.all('invoices').forEach((i) => i.issueDate && ys.add(i.issueDate.slice(0, 4)));
    return [...ys].sort().reverse();
  };

  const monthly = (y) => Array.from({ length: 12 }, (_, i) => L.monthTotals(`${y}-${String(i + 1).padStart(2, '0')}`));

  const within = (d, from, to) => !!d && d >= from && d <= to;
  const yearRange = (y) => [y + '-01-01', y + '-12-31'];

  const byService = (from, to) => {
    const m = {};
    L.issuedInvoices().filter((i) => within(i.issueDate, from, to)).forEach((i) => {
      (i.lines || []).forEach((l) => { m[l.name] = (m[l.name] || 0) + (Number(l.qty) || 0) * (Number(l.price) || 0); });
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const byCategory = (from, to) => {
    const m = {};
    Store.find('expenses', (e) => within(e.date, from, to)).forEach((e) => { m[e.category] = (m[e.category] || 0) + (Number(e.amount) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const byMethod = (from, to) => L.METHODS.map(([key, label]) => ({
    label,
    in: L.sum(Store.find('receipts', (r) => within(r.date, from, to) && r.method === key), (r) => r.amount),
    out: L.sum(Store.find('expenses', (e) => within(e.date, from, to) && e.method === key), (e) => e.amount)
  }));
  const receiptsIn = (from, to) => Store.find('receipts', (r) => within(r.date, from, to)).sort((a, b) => a.date.localeCompare(b.date));
  const expensesIn = (from, to) => Store.find('expenses', (e) => within(e.date, from, to)).sort((a, b) => a.date.localeCompare(b.date));

  // ---- Periods ----
  // Weeks run Monday to Sunday. `anchor` is any day inside the period.
  const PERIODS = [['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']];
  const dow = (iso) => { const [y, m, d] = iso.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; };
  const monthEnd = (key) => { const [y, m] = key.split('-').map(Number); return L.isoOf(new Date(y, m, 0)); };
  const range = (kind, anchor) => {
    if (kind === 'day') return [anchor, anchor];
    if (kind === 'week') { const from = L.addDays(anchor, -dow(anchor)); return [from, L.addDays(from, 6)]; }
    if (kind === 'month') return [anchor.slice(0, 7) + '-01', monthEnd(anchor.slice(0, 7))];
    return yearRange(anchor.slice(0, 4));
  };
  const shift = (kind, anchor, n) => {
    if (kind === 'day') return L.addDays(anchor, n);
    if (kind === 'week') return L.addDays(anchor, 7 * n);
    const [y, m] = anchor.split('-').map(Number);
    return kind === 'month' ? L.isoOf(new Date(y, m - 1 + n, 1)) : `${y + n}-01-01`;
  };
  const periodLabel = (kind, from, to) => {
    if (kind === 'day') return `${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dow(from)]}, ${UI.dateLong(from)}`;
    if (kind === 'week') return `${UI.dateShort(from)} – ${UI.date(to)}`;
    if (kind === 'month') return UI.monthLabel(from.slice(0, 7), true);
    return from.slice(0, 4);
  };
  const totals = (from, to) => { const i = L.moneyIn(from, to), o = L.moneyOut(from, to); return { in: i, out: o, net: i - o }; };
  // The rows of the breakdown table: each day of a week, each week of a month.
  const breakdown = (kind, from, to) => {
    const out = [];
    if (kind === 'week') {
      for (let d = from; d <= to; d = L.addDays(d, 1)) out.push({ label: `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dow(d)]} ${UI.dateShort(d)}`, ...totals(d, d) });
    } else if (kind === 'month') {
      for (let d = from; d <= to; d = L.addDays(d, 7 - dow(d))) {
        const end = L.addDays(d, 6 - dow(d)) < to ? L.addDays(d, 6 - dow(d)) : to;
        out.push({ label: d === end ? UI.dateShort(d) : `${UI.dateShort(d)} – ${UI.dateShort(end)}`, ...totals(d, end) });
      }
    }
    return out;
  };

  const hbars = (rows) => {
    if (!rows.length) return UI.emptySm('Nothing recorded in this period.');
    const max = Math.max(...rows.map((r) => r[1]));
    return `<div class="card-body">${rows.map(([k, v]) => `<div class="hbar"><span>${esc(k)}</span><div class="track"><div class="fill" style="width:${Math.max(2, (v / max) * 100)}%"></div></div><span class="v">${UI.moneyShort(v)}</span></div>`).join('')}</div>`;
  };

  const signed = (n) => `${n < 0 ? '−' : ''}${UI.num(Math.abs(n))}`;

  const inOutTable = (head, rows) => {
    const tin = L.sum(rows, (r) => r.in), tout = L.sum(rows, (r) => r.out);
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr><th>${head}</th><th class="r">Money in</th><th class="r">Money out</th><th class="r">Profit</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.label}</td><td class="r">${UI.num(r.in)}</td><td class="r">${UI.num(r.out)}</td><td class="r${r.net < 0 ? ' neg' : ''}">${signed(r.net)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="r">${UI.num(tin)}</td><td class="r">${UI.num(tout)}</td><td class="r${tin - tout < 0 ? ' neg' : ''}">${signed(tin - tout)}</td></tr></tfoot>
    </table></div>`;
  };

  // What came in and went out, item by item.
  const movements = (from, to) => {
    const rec = receiptsIn(from, to), exp = expensesIn(from, to);
    const list = (items, row) => items.length ? `<div class="list">${items.map(row).join('')}</div>` : UI.emptySm('Nothing recorded in this period.');
    return `<div class="grid-2 section-gap">
      ${UI.card(`Money in · ${rec.length}`, list(rec, (r) => UI.row({ href: '#/receipts/' + r.id, title: esc(L.clientName(r.clientId)), sub: `${UI.dateShort(r.date)} · ${esc(r.number)} · ${esc(L.methodLabel(r.method))}`, right: UI.num(r.amount) })))}
      ${UI.card(`Money out · ${exp.length}`, list(exp, (e) => UI.row({ act: 'expense-edit', data: { id: e.id }, title: esc(e.description), sub: `${UI.dateShort(e.date)} · ${esc(e.category)} · ${esc(L.methodLabel(e.method))}`, right: UI.num(e.amount) })))}
    </div>`;
  };

  // Work done in the period, beyond the money.
  const activity = (from, to) => {
    const inv = L.issuedInvoices().filter((i) => within(i.issueDate, from, to));
    const quotes = Store.find('quotations', (q) => within(q.date, from, to));
    const shoots = Store.find('bookings', (b) => within(b.date, from, to) && b.status !== 'cancelled');
    const reqs = Store.find('requisitions', (r) => within(r.date, from, to));
    const item = (label, count, value) => `<div class="kpi" style="box-shadow:none;background:var(--surface-2);padding:12px 14px"><div class="kpi-label">${label}</div><div class="kpi-value" style="font-size:18px">${count}</div>${value != null ? `<div class="kpi-foot">${UI.moneyShort(value)}</div>` : ''}</div>`;
    return `<div class="card-body"><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin:0;gap:10px">
      ${item('Invoices issued', inv.length, L.sum(inv, (i) => L.totals(i).total))}
      ${item('Quotations', quotes.length, L.sum(quotes, (q) => L.totals(q).total))}
      ${item('Shoots', shoots.length)}
      ${item('Requisitions', reqs.length, L.sum(reqs, (r) => r.amount))}
    </div></div>`;
  };

  M.views.reports = {
    title: 'Reports',
    admin: true,
    render() {
      const kind = UI.segVal('rperiod', 'month');
      const anchor = M.state.rdate || L.today();
      const [from, to] = range(kind, anchor);
      const label = periodLabel(kind, from, to);
      const t = totals(from, to);
      const csv = (report, text = 'CSV') => UI.btn(text, 'csv', { size: 'sm', icon: 'download', data: { report, from, to, year: from.slice(0, 4) } });
      const aged = L.aged();
      const buckets = L.AGE_BUCKETS.map((b) => [b, L.sum(aged.filter((a) => a.bucket === b), (a) => a.balance)]);

      let detail = '';
      if (kind === 'year') {
        const y = from.slice(0, 4);
        const rows = monthly(y);
        const shown = y === L.today().slice(0, 4) ? rows.slice(0, Number(L.today().slice(5, 7))) : rows;
        detail = UI.card('Profit by month', `${M.inOutChart(rows.map((r) => r.key), 'yr')}
          ${inOutTable('Month', shown.slice().reverse().map((r) => ({ ...r, label: UI.monthLabel(r.key, true) })))}`, { action: csv('monthly') });
      } else if (kind !== 'day') {
        detail = UI.card(kind === 'week' ? 'Day by day' : 'Week by week', inOutTable(kind === 'week' ? 'Day' : 'Week', breakdown(kind, from, to)));
      }

      return `
        ${UI.pageHead('Reports', 'Money in is cash received (receipts). Money out is recorded expenses.', UI.btn('Download period', 'csv', { icon: 'download', data: { report: 'period', from, to } }))}
        <div class="toolbar">${UI.seg('rperiod', PERIODS, 'month')}</div>
        <div class="toolbar period-nav">
          <button type="button" class="icon-btn" data-act="rperiod-step" data-n="-1" aria-label="Previous">${UI.icon('back', 18, 2)}</button>
          <strong class="period-label">${esc(label)}</strong>
          <button type="button" class="icon-btn" data-act="rperiod-step" data-n="1" aria-label="Next"${to >= L.today() ? ' disabled' : ''}>${UI.icon('chevron', 18, 2)}</button>
          <input type="date" class="period-pick" value="${esc(anchor)}" max="${L.today()}" data-change="rperiod-date" aria-label="Jump to a date">
          ${from <= L.today() && to >= L.today() ? '' : '<button type="button" class="btn sm ghost" data-act="rperiod-today">Today</button>'}
        </div>
        <div class="kpis three">
          <div class="kpi"><div class="kpi-label">Money in</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(t.in)}</div></div>
          <div class="kpi"><div class="kpi-label">Money out</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(t.out)}</div></div>
          <div class="kpi accent"><div class="kpi-label">Profit</div><div class="kpi-value"><span class="cur">UGX</span>${signed(t.net)}</div>
            <div class="kpi-foot">${t.in ? Math.round((t.net / t.in) * 100) + '% margin' : '—'}</div></div>
        </div>

        ${detail}
        ${kind === 'year' ? '' : movements(from, to)}

        <div class="section-gap">${UI.card('Activity', activity(from, to))}</div>

        <div class="grid-2 section-gap">
          ${UI.card('Invoiced by service', hbars(byService(from, to)), { action: csv('services') })}
          ${UI.card('Spending by category', hbars(byCategory(from, to)), { action: csv('expenses') })}
        </div>

        <div class="section-gap">${UI.card('Money by payment method', `<div class="table-wrap"><table class="tbl">
          <thead><tr><th>Method</th><th class="r">Money in</th><th class="r">Money out</th></tr></thead>
          <tbody>${byMethod(from, to).map((m) => `<tr><td>${esc(m.label)}</td><td class="r">${UI.num(m.in)}</td><td class="r">${UI.num(m.out)}</td></tr>`).join('')}</tbody>
        </table></div>`)}</div>

        <div class="section-gap">${UI.card('Who owes you — by age, today', `
          <div class="card-body" style="padding-bottom:6px"><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:0;gap:10px">
            ${buckets.map(([b, v]) => `<div class="kpi" style="box-shadow:none;background:var(--surface-2);padding:12px 14px"><div class="kpi-label">${b}</div><div class="kpi-value" style="font-size:18px">${UI.moneyShort(v)}</div></div>`).join('')}
          </div></div>
          ${aged.length ? `<div class="table-wrap"><table class="tbl">
            <thead><tr><th>Client</th><th>Invoice</th><th>Due</th><th>Age</th><th class="r">Balance (UGX)</th></tr></thead>
            <tbody>${aged.map((a) => `<tr><td>${esc(L.clientName(a.inv.clientId))}</td><td><a class="link" href="#/invoices/${a.inv.id}">${esc(a.inv.number)}</a></td><td>${UI.date(a.inv.dueDate)}</td><td>${a.late > 0 ? `${a.late} days late` : 'Not yet due'}</td><td class="r">${UI.num(a.balance)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="4">Total owed</td><td class="r">${UI.num(L.sum(aged, (a) => a.balance))}</td></tr></tfoot>
          </table></div>` : UI.emptySm('Nobody owes you money right now.')}`,
          { action: csv('aged') })}</div>`;
    },
    after() { if (UI.segVal('rperiod', 'month') === 'year') M.bindChart('yr'); }
  };

  Object.assign(M.actions, {
    'rperiod-step': (el) => {
      const kind = UI.segVal('rperiod', 'month');
      const next = shift(kind, M.state.rdate || L.today(), Number(el.dataset.n));
      M.state.rdate = next > L.today() ? L.today() : next;
      M.render();
    },
    'rperiod-today': () => { M.state.rdate = L.today(); M.render(); }
  });
  M.live['rperiod-date'] = (el) => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) { M.state.rdate = el.value; M.render(); } };

  M.actions.csv = (el) => {
    const { report, year, from, to } = el.dataset;
    const span = from === to ? from : `${from}_to_${to}`;
    let rows, name;
    if (report === 'monthly') {
      rows = [['Month', 'Money in (UGX)', 'Money out (UGX)', 'Profit (UGX)'], ...monthly(year).map((r) => [r.key, r.in, r.out, r.net])];
      name = `merit-profit-${year}.csv`;
    } else if (report === 'services') {
      rows = [['Service', 'Invoiced (UGX)'], ...byService(from, to)];
      name = `merit-services-${span}.csv`;
    } else if (report === 'expenses') {
      rows = [['Date', 'Category', 'Description', 'Items', 'Paid to', 'Method', 'Reference', 'Proof', 'Amount (UGX)'], ...expensesIn(from, to).map((e) => [
        e.date, e.category, e.description, (e.lines || []).map((l) => `${l.name} ${l.qty} x ${l.price}`).join('; '), e.paidTo || '', L.methodLabel(e.method), e.reference || '', e.proof ? 'Yes' : 'No', e.amount])];
      name = `merit-expenses-${span}.csv`;
    } else if (report === 'period') {
      rows = [['Date', 'Type', 'Number', 'Client / paid to', 'Description', 'Category', 'Method', 'Reference', 'Money in (UGX)', 'Money out (UGX)'],
        ...[...receiptsIn(from, to).map((r) => [r.date, 'Receipt', r.number, L.clientName(r.clientId), r.notes || '', '', L.methodLabel(r.method), r.reference || '', r.amount, '']),
          ...expensesIn(from, to).map((e) => [e.date, 'Expense', '', e.paidTo || '', e.description, e.category, L.methodLabel(e.method), e.reference || '', '', e.amount])]
          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))];
      const t = totals(from, to);
      rows.push([], ['Total', '', '', '', '', '', '', '', t.in, t.out], ['Profit', '', '', '', '', '', '', '', t.net, '']);
      name = `merit-report-${span}.csv`;
    } else {
      rows = [['Client', 'Phone', 'Invoice', 'Issued', 'Due', 'Days late', 'Total (UGX)', 'Paid (UGX)', 'Balance (UGX)'], ...L.aged().map((a) => {
        const c = L.client(a.inv.clientId) || {};
        return [c.name, c.phone, a.inv.number, a.inv.issueDate, a.inv.dueDate, Math.max(0, a.late), L.totals(a.inv).total, L.paid(a.inv), a.balance];
      })];
      name = `merit-owed-${L.today()}.csv`;
    }
    UI.download(name, UI.csv(rows), 'text/csv');
  };
})();
