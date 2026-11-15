// Salaries & wages. Staff request pay (a requisition of kind "pay"); an admin pays it
// with any deductions, or pays staff directly. Each payment is an expense in the
// "Salaries & wages" category carrying the payslip details, so it counts in money
// out, Reports and Cash at bank / Mobile money like any other expense.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money } = UI;

  const CATEGORY = 'Salaries & wages';
  const PAY_TYPES = [['salary', 'Monthly salary'], ['wage', 'Wage — days worked'], ['advance', 'Salary advance'], ['allowance', 'Allowance or overtime']];
  const typeLabel = (t) => (PAY_TYPES.find((x) => x[0] === t) || [t, 'Pay'])[1];
  // Short names for titles and payslips ("Wages — November 2026").
  const shortLabel = (t) => ({ salary: 'Salary', wage: 'Wages', advance: 'Salary advance', allowance: 'Allowance / overtime' })[t] || 'Pay';
  const periodLabel = (p) => (/^\d{4}-\d{2}$/.test(p || '') ? UI.monthLabel(p, true) : '—');
  const thisMonth = () => L.today().slice(0, 7);
  const payments = () => Store.find('expenses', (e) => !!e.staffId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const payRequests = () => Store.find('requisitions', (r) => r.kind === 'pay');
  const deductions = (e) => (Number(e.paye) || 0) + (Number(e.nssf) || 0) + (Number(e.otherDeductions) || 0);

  // ---- Page ----
  M.views.payroll = {
    title: 'Salaries & wages',
    render() { return M.isAdmin() ? adminView() : staffView(); }
  };

  const requestRow = (r) => UI.row({
    href: '#/requisitions/' + r.id, lead: L.userAvatar(r.requestedBy), title: esc(r.purpose),
    sub: `${esc(r.number)} · ${esc(L.userName(r.requestedBy))} · ${UI.dateShort(r.date)}`, right: money(r.amount), rightSub: UI.pill(r.status)
  });

  function staffView() {
    const mine = payRequests().filter((r) => r.requestedBy === M.user.id).sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    return `
      ${UI.pageHead('My pay', 'Request your salary, wages for days worked, an advance or an allowance. An admin approves and pays it.', UI.btn('Request pay', 'pay-request', { kind: 'primary', icon: 'plus' }))}
      <div class="card">${mine.length ? `<div class="list">${mine.map(requestRow).join('')}</div>`
        : UI.empty('wallet', 'No pay requests yet', 'Your requests and their progress will appear here.', UI.btn('Request pay', 'pay-request', { kind: 'primary', icon: 'plus' }))}</div>`;
  }

  function adminView() {
    const month = M.state.payMonth || thisMonth();
    const all = payments();
    const inMonth = all.filter((e) => (e.period || L.monthKey(e.date)) === month);
    const waiting = payRequests().filter((r) => ['pending', 'approved'].includes(r.status));
    const byStaff = {};
    inMonth.forEach((e) => {
      const s = (byStaff[e.staffId] = byStaff[e.staffId] || { n: 0, gross: 0, ded: 0, net: 0 });
      s.n++; s.gross += Number(e.gross) || Number(e.amount) || 0; s.ded += deductions(e); s.net += Number(e.amount) || 0;
    });
    const staffRows = Object.entries(byStaff).sort((a, b) => b[1].net - a[1].net);
    const months = {};
    all.forEach((e) => { const k = e.period || L.monthKey(e.date); (months[k] = months[k] || []).push(e); });

    return `
      ${UI.pageHead('Salaries & wages', `${money(L.sum(inMonth, (e) => e.amount))} paid for ${periodLabel(month)}`, UI.btn('Pay staff', 'pay-staff', { kind: 'primary', icon: 'plus' }))}
      <div class="toolbar"><label class="hint" for="pay-month">Pay period</label>
        <input id="pay-month" type="month" class="period-pick" value="${esc(month)}" data-change="pay-month"></div>
      <div class="kpis three">
        <div class="kpi accent"><div class="kpi-label">Net paid · ${esc(periodLabel(month))}</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(L.sum(inMonth, (e) => e.amount))}</div></div>
        <div class="kpi"><div class="kpi-label">Gross pay · ${esc(periodLabel(month))}</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(L.sum(inMonth, (e) => Number(e.gross) || e.amount))}</div><div class="kpi-foot">${UI.num(L.sum(inMonth, deductions))} in deductions</div></div>
        <div class="kpi"><div class="kpi-label">Pay requests waiting</div><div class="kpi-value">${waiting.length}</div><div class="kpi-foot">${money(L.sum(waiting, (r) => r.amount))}</div></div>
      </div>

      ${waiting.length ? `<div class="section-gap">${UI.card('Pay requests to approve or pay', `<div class="list">${waiting.map(requestRow).join('')}</div>`)}</div>` : ''}

      <div class="section-gap">${UI.card(`By staff member · ${esc(periodLabel(month))}`, staffRows.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Staff member</th><th class="r">Payments</th><th class="r">Gross</th><th class="r">Deductions</th><th class="r">Net paid</th></tr></thead>
        <tbody>${staffRows.map(([id, s]) => `<tr><td>${esc(L.userName(id))}</td><td class="r">${s.n}</td><td class="r">${UI.num(s.gross)}</td><td class="r">${UI.num(s.ded)}</td><td class="r">${UI.num(s.net)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="r">${L.sum(staffRows, (x) => x[1].n)}</td><td class="r">${UI.num(L.sum(staffRows, (x) => x[1].gross))}</td><td class="r">${UI.num(L.sum(staffRows, (x) => x[1].ded))}</td><td class="r">${UI.num(L.sum(staffRows, (x) => x[1].net))}</td></tr></tfoot>
      </table></div>` : UI.emptySm('Nobody has been paid for this period yet.'), { action: UI.btn('CSV', 'pay-csv', { size: 'sm', icon: 'download', data: { month } }) })}</div>

      ${Object.keys(months).length ? Object.keys(months).sort().reverse().map((k) => `<div class="section-gap">${UI.card(periodLabel(k), `<div class="list">${months[k].map((e) => UI.row({
        act: 'pay-edit', data: { id: e.id }, lead: L.userAvatar(e.staffId), title: esc(L.userName(e.staffId)),
        sub: [esc(shortLabel(e.payType)), UI.dateShort(e.date), esc(L.methodLabel(e.method)), deductions(e) ? `${UI.num(deductions(e))} deducted` : ''].filter(Boolean).join(' · '),
        right: money(e.amount), rightSub: Number(e.gross) && Number(e.gross) !== Number(e.amount) ? `Gross ${UI.num(e.gross)}` : ''
      })).join('')}</div>`, { action: `<span class="hint num">${money(L.sum(months[k], (e) => e.amount))}</span>` })}</div>`).join('')
        : `<div class="section-gap"><div class="card">${UI.empty('wallet', 'No salaries or wages paid yet', 'Pay staff directly, or approve and pay their pay requests. Each payment also appears under Expenses.')}</div></div>`}`;
  }
  M.live['pay-month'] = (el) => { if (/^\d{4}-\d{2}$/.test(el.value)) { M.state.payMonth = el.value; M.render(); } };

  // ---- Staff: request pay (a requisition of kind "pay") ----
  const requestForm = (r = {}) => UI.modal({
    title: r.id ? 'Edit pay request' : 'Request pay', form: 'pay-request', submit: r.id ? 'Save' : 'Submit request',
    body: `<input type="hidden" name="id" value="${esc(r.id || '')}">` + UI.fields([
      { label: 'What are you requesting?', name: 'payType', type: 'select', options: PAY_TYPES, value: r.payType || 'wage', full: true },
      { label: 'Pay period', name: 'period', type: 'month', value: r.period || thisMonth(), required: true },
      { label: 'For shoot (optional)', name: 'bookingId', type: 'select', options: M.opts.bookings(null, 'Not for a particular shoot'), value: r.bookingId },
      { label: 'Days worked', name: 'days', type: 'number', value: r.days, requiredIf: 'payType=wage', attrs: ' step="0.5"', hint: 'For wages only.' },
      { label: 'Rate per day (UGX)', name: 'rate', type: 'number', value: r.rate, requiredIf: 'payType=wage' },
      { label: 'Amount (UGX)', name: 'amount', type: 'number', value: r.payType && r.payType !== 'wage' ? r.amount : '', requiredIf: 'payType!=wage', hint: 'For salary, advance or allowance.' },
      { label: 'Notes', name: 'details', type: 'textarea', value: r.details, full: true, placeholder: 'Which days or shoots, overtime hours, how you would like to be paid…' }
    ])
  });

  M.forms['pay-request'] = (d) => {
    const wage = d.payType === 'wage';
    const days = Number(d.days) || 0, rate = Math.round(Number(d.rate) || 0);
    const amount = wage ? Math.round(days * rate) : Math.round(Number(d.amount) || 0);
    if (wage && !(days > 0)) throw UI.invalid('days', 'Enter the days worked');
    if (wage && !(rate > 0)) throw UI.invalid('rate', 'Enter the rate per day');
    if (!wage && !(amount > 0)) throw UI.invalid('amount', 'Enter the amount');
    const purpose = `${shortLabel(d.payType)} — ${periodLabel(d.period)}${wage ? ` (${UI.num(days)} day${days === 1 ? '' : 's'})` : ''}`;
    const rec = {
      kind: 'pay', payType: d.payType, period: d.period, days: wage ? days : '', rate: wage ? rate : '', amount, purpose,
      category: CATEGORY, bookingId: d.bookingId, details: d.details,
      lines: [wage ? { name: 'Days worked', qty: days, price: rate } : { name: shortLabel(d.payType), qty: 1, price: amount }]
    };
    if (d.id) rec.id = d.id;
    else {
      // Same numbering rule as other requisitions: staff can't see everyone's, so they get a short unique code.
      const number = Store.mode === 'supabase' && !M.isAdmin()
        ? `REQ-${L.today().slice(0, 4)}-${Date.now().toString(36).slice(-5).toUpperCase()}`
        : L.nextNumber('requisitions', 'REQ');
      Object.assign(rec, { number, requestedBy: M.user.id, date: L.today(), status: 'pending' });
    }
    const saved = Store.save('requisitions', Object.assign({}, d.id ? Store.get('requisitions', d.id) : {}, rec));
    UI.toast(d.id ? 'Request updated' : `${saved.number} sent for approval`);
    M.go('requisitions/' + saved.id);
  };

  // ---- Admin: pay staff (directly, or paying a pay request) ----
  const payForm = (e = {}) => {
    const staff = Store.all('users').slice().sort((a, b) => a.name.localeCompare(b.name)).map((u) => [u.id, u.title ? `${u.name} (${u.title})` : u.name]);
    UI.modal({
      title: e.id ? 'Edit payment' : e.requisitionId ? 'Pay request' : 'Pay staff', form: 'pay', wide: true,
      foot: `${e.id ? `<button type="button" class="btn danger left" data-act="pay-delete" data-id="${esc(e.id)}">Delete</button><button type="button" class="btn" data-act="payslip" data-id="${esc(e.id)}">${UI.icon('download', 16, 2)}Payslip</button>` : ''}<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">${e.id ? 'Save' : 'Record payment'}</button>`,
      body: `<input type="hidden" name="id" value="${esc(e.id || '')}"><input type="hidden" name="requisitionId" value="${esc(e.requisitionId || '')}">` + UI.fields([
        { label: 'Staff member', name: 'staffId', type: 'select', options: [['', 'Choose a staff member…'], ...staff], value: e.staffId, required: true },
        { label: 'Pay type', name: 'payType', type: 'select', options: PAY_TYPES, value: e.payType || 'salary' },
        { label: 'Pay period', name: 'period', type: 'month', value: e.period || thisMonth(), required: true },
        { label: 'Date paid', name: 'date', type: 'date', value: e.date || L.today(), required: true },
        { label: 'Gross pay (UGX)', name: 'gross', type: 'number', value: e.gross ?? e.amount, required: true, min: 1, attrs: ' data-live="pay-net"' },
        { label: 'PAYE (UGX)', name: 'paye', type: 'number', value: e.paye, attrs: ' data-live="pay-net"', hint: 'Income tax withheld, if any.' },
        { label: 'NSSF — employee 5% (UGX)', name: 'nssf', type: 'number', value: e.nssf, attrs: ' data-live="pay-net"' },
        { label: 'Other deductions (UGX)', name: 'otherDeductions', type: 'number', value: e.otherDeductions, attrs: ' data-live="pay-net"', hint: 'e.g. an advance being paid back.' },
        `<div class="field full"><div class="pay-net">Net pay <strong id="pay-net">${money(Math.max(0, (Number(e.gross ?? e.amount) || 0) - deductions(e)))}</strong></div></div>`,
        { label: 'Paid by', name: 'method', type: 'select', options: L.METHODS, value: e.method || 'mtn' },
        { label: 'Reference', name: 'reference', value: e.reference, requiredIf: 'method!=cash', placeholder: 'MoMo transaction ID or bank ref' },
        { label: 'Proof of payment (photo or PDF)', name: 'proof', type: 'file', accept: 'image/*,application/pdf', value: e.proof, full: true },
        { label: 'Notes', name: 'notes', type: 'textarea', value: e.notes, full: true }
      ])
    });
  };
  M.payForm = payForm;
  M.live['pay-net'] = (el) => {
    const f = el.form, n = (k) => Number(f.elements.namedItem(k).value) || 0;
    const out = document.getElementById('pay-net');
    if (out) out.textContent = money(n('gross') - n('paye') - n('nssf') - n('otherDeductions'));
  };

  M.forms.pay = (d) => {
    const gross = Math.round(Number(d.gross) || 0);
    const paye = Math.round(Number(d.paye) || 0), nssf = Math.round(Number(d.nssf) || 0), other = Math.round(Number(d.otherDeductions) || 0);
    const net = gross - paye - nssf - other;
    if (gross <= 0) throw UI.invalid('gross', 'Enter the gross pay');
    if (net <= 0) throw UI.invalid('otherDeductions', 'Deductions are more than the gross pay');
    if (d.method !== 'cash' && !d.reference) throw UI.invalid('reference', 'Add the transaction reference');
    const name = L.userName(d.staffId);
    const rec = {
      date: d.date, category: CATEGORY, description: `${shortLabel(d.payType)} — ${name}, ${periodLabel(d.period)}`, amount: net,
      lines: [{ name: `${shortLabel(d.payType)} (net of deductions)`, qty: 1, price: net }], paidTo: name, method: d.method, reference: d.reference, proof: d.proof,
      staffId: d.staffId, payType: d.payType, period: d.period, gross, paye, nssf, otherDeductions: other, notes: d.notes
    };
    const old = d.id ? Store.get('expenses', d.id) || {} : {};
    const reqId = d.requisitionId || old.requisitionId;
    if (reqId) rec.requisitionId = reqId;
    const r = reqId && Store.get('requisitions', reqId);
    if (r) rec.bookingId = r.bookingId;
    else if (old.bookingId) rec.bookingId = old.bookingId;
    if (d.id) rec.id = d.id;
    const saved = Store.save('expenses', rec);
    if (r && r.status !== 'paid') {
      Store.save('requisitions', Object.assign({}, r, { status: 'paid', paidAt: d.date, paidMethod: d.method, paidReference: d.reference, paidProof: d.proof, expenseId: saved.id }));
    }
    UI.toast(d.id ? 'Payment updated' : `${money(net)} paid to ${name}`);
  };

  Object.assign(M.actions, {
    'pay-request': () => requestForm(),
    'pay-staff': (el) => {
      const r = el.dataset.req && Store.get('requisitions', el.dataset.req);
      payForm(r ? { staffId: r.requestedBy, payType: r.payType, period: r.period, gross: r.amount, requisitionId: r.id, notes: r.details } : {});
    },
    'pay-edit': (el) => payForm(Store.get('expenses', el.dataset.id)),
    'pay-delete': (el) => UI.confirm('Delete this payment?', 'It is also removed from Expenses. A pay request it came from stays marked as paid.', () => {
      Store.remove('expenses', el.dataset.id); UI.closeModal(); UI.toast('Payment deleted');
    }, { label: 'Delete', danger: true }),
    payslip: (el) => {
      const e = Store.get('expenses', el.dataset.id);
      if (e) M.Docs.print(M.Docs.payslip(e), `Payslip ${L.userName(e.staffId)} ${e.period || ''}`.trim());
    },
    'pay-csv': (el) => {
      const month = el.dataset.month;
      const rows = payments().filter((e) => (e.period || L.monthKey(e.date)) === month).map((e) => [
        L.userName(e.staffId), typeLabel(e.payType), e.period || '', e.date, Number(e.gross) || e.amount, Number(e.paye) || 0, Number(e.nssf) || 0, Number(e.otherDeductions) || 0, e.amount, L.methodLabel(e.method), e.reference || '']);
      UI.download(`merit-salaries-${month}.csv`, UI.csv([['Staff member', 'Pay type', 'Period', 'Date paid', 'Gross (UGX)', 'PAYE (UGX)', 'NSSF (UGX)', 'Other deductions (UGX)', 'Net paid (UGX)', 'Method', 'Reference'], ...rows]), 'text/csv');
    }
  });
  M.payRequestForm = requestForm;
  M.PAY_TYPES = PAY_TYPES;
  M.payTypeLabel = shortLabel;
})();
