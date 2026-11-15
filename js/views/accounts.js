// Cash at bank and Mobile money: every payment in and out of each account, with a
// running balance. Receipts and expenses appear here by how they were paid; deposits,
// withdrawals, transfers and opening balances are added as records of their own.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc } = UI;

  const TYPE_LABEL = { opening: 'Opening balance', in: 'Money in', out: 'Money out' };

  const page = (route, title, accounts, intro) => ({
    title,
    admin: true,
    render() {
      const pick = accounts.length > 1 ? UI.segVal(route + 'acct', 'all') : accounts[0][0];
      const keys = pick === 'all' ? accounts.map((a) => a[0]) : [pick];
      const dir = UI.segVal(route + 'dir', 'all');
      const q = (M.state.q[route] || '').toLowerCase();
      const all = L.accountRows(keys);
      const balance = all.length ? all[all.length - 1].balance : 0;
      const month = L.monthKey(L.today());
      const thisMonth = all.filter((r) => L.monthKey(r.date) === month);
      const inn = L.sum(thisMonth.filter((r) => r.amount > 0 && r.type !== 'opening'), (r) => r.amount);
      const out = L.sum(thisMonth.filter((r) => r.amount < 0), (r) => -r.amount);

      let list = all.slice().reverse();
      if (dir !== 'all') list = list.filter((r) => (dir === 'in' ? r.amount > 0 : r.amount < 0));
      if (q) list = list.filter((r) => [r.title, r.sub, r.reference].join(' ').toLowerCase().includes(q));
      const months = {};
      list.forEach((r) => { (months[L.monthKey(r.date)] = months[L.monthKey(r.date)] || []).push(r); });

      const rowFor = (r) => UI.row({
        ...(r.href ? { href: r.href } : { act: r.act, data: { id: r.id } }),
        lead: UI.tile(r.amount > 0 ? 'receipt' : 'wallet', r.amount > 0),
        title: esc(r.title),
        sub: [UI.dateShort(r.date), esc(r.sub), keys.length > 1 && esc(L.accountLabel(r.account)), r.reference && `Ref ${esc(r.reference)}`].filter(Boolean).join(' · '),
        right: `${r.amount > 0 ? '+' : '−'} ${UI.num(Math.abs(r.amount))}`,
        rightSub: `Bal ${r.balance < 0 ? '−' : ''}${UI.num(Math.abs(r.balance))}`
      });

      return `
        ${UI.pageHead(title, intro, `${UI.btn('CSV', 'account-csv', { icon: 'download', data: { route } })}${UI.btn('Add record', 'entry-new', { kind: 'primary', icon: 'plus', data: { route } })}`)}
        <div class="kpis three">
          <div class="kpi accent"><div class="kpi-label">Balance now</div><div class="kpi-value"><span class="cur">UGX</span>${balance < 0 ? '−' : ''}${UI.num(Math.abs(balance))}</div></div>
          <div class="kpi"><div class="kpi-label">Money in · this month</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(inn)}</div></div>
          <div class="kpi"><div class="kpi-label">Money out · this month</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(out)}</div></div>
        </div>
        <div class="toolbar">
          ${accounts.length > 1 ? UI.seg(route + 'acct', [['all', 'All'], ...accounts.map(([v, l]) => [v, l.replace(' Mobile Money', ' MoMo')])], 'all') : ''}
          ${UI.seg(route + 'dir', [['all', 'All'], ['in', 'Money in'], ['out', 'Money out']], 'all')}
          ${UI.search(route, 'Search records or references')}
        </div>
        ${Object.keys(months).length ? Object.keys(months).sort().reverse().map((k) => UI.card(UI.monthLabel(k, true), `<div class="list">${months[k].map(rowFor).join('')}</div>`)).join('')
          : `<div class="card">${UI.empty(route === 'bank' ? 'bank' : 'phone', 'No records here', 'Add an opening balance to start. Receipts and expenses paid this way appear here automatically.')}</div>`}`;
    }
  });

  const BANK = L.ACCOUNTS.filter((a) => a[0] === 'bank');
  const MOMO = L.ACCOUNTS.filter((a) => a[0] !== 'bank');
  M.views.bank = page('bank', 'Cash at bank', BANK, 'Money in and out of the company bank account.');
  M.views.momo = page('momo', 'Mobile money', MOMO, 'Money in and out of MTN Mobile Money and Airtel Money.');

  const entryForm = (e, accounts) => UI.modal({
    title: e.id ? 'Edit record' : 'Add record', form: 'account-entry',
    foot: `${e.id ? `<button type="button" class="btn danger left" data-act="entry-delete" data-id="${esc(e.id)}">Delete</button>` : ''}<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">Save</button>`,
    body: `<input type="hidden" name="id" value="${esc(e.id || '')}">` + UI.fields([
      accounts.length > 1 ? { label: 'Account', name: 'account', type: 'select', options: accounts, value: e.account || accounts[0][0] } : `<input type="hidden" name="account" value="${esc(accounts[0][0])}">`,
      { label: 'Type', name: 'type', type: 'select', options: Object.entries(TYPE_LABEL), value: e.type || 'in', hint: 'Spending that should count in profit, including bank charges, goes under Expenses.' },
      { label: 'Date', name: 'date', type: 'date', value: e.date || L.today(), required: true },
      { label: 'Amount (UGX)', name: 'amount', type: 'number', value: e.amount, required: true, min: 1 },
      { label: 'Description', name: 'description', value: e.description, required: true, full: true, placeholder: 'e.g. Cash deposit, transfer to bank' },
      { label: 'Reference', name: 'reference', value: e.reference, placeholder: 'Bank slip or transaction ID' },
      { label: 'Moved to (optional)', name: 'toAccount', type: 'select', options: [['', 'Not a transfer'], ...L.ACCOUNTS], value: e.toAccount || '', hint: 'For Money out moved to another account.' },
      { label: 'Proof (photo or PDF)', name: 'proof', type: 'file', accept: 'image/*,application/pdf', value: e.proof, full: true }
    ])
  });

  Object.assign(M.actions, {
    'entry-new': (el) => entryForm({}, el.dataset.route === 'bank' ? BANK : MOMO),
    'entry-edit': (el) => {
      const e = Store.get('accountEntries', el.dataset.id);
      entryForm(e, e.account === 'bank' ? BANK : MOMO);
    },
    'entry-delete': (el) => UI.confirm('Delete this record?', 'It will be removed and the balance will change.', () => {
      Store.remove('accountEntries', el.dataset.id);
      UI.closeModal();
      UI.toast('Record deleted');
    }, { label: 'Delete', danger: true }),
    'account-csv': (el) => {
      const keys = (el.dataset.route === 'bank' ? BANK : MOMO).map((a) => a[0]);
      const rows = L.accountRows(keys).map((r) => [r.date, L.accountLabel(r.account), r.title, r.sub, r.reference || '', r.amount > 0 ? r.amount : '', r.amount < 0 ? -r.amount : '', r.balance]);
      UI.download(`merit-${el.dataset.route}-${L.today()}.csv`, UI.csv([['Date', 'Account', 'Record', 'Details', 'Reference', 'Money in (UGX)', 'Money out (UGX)', 'Balance (UGX)'], ...rows]), 'text/csv');
    }
  });

  M.forms['account-entry'] = (d) => {
    const amount = Math.round(Number(d.amount) || 0);
    if (amount <= 0) throw UI.invalid('amount', 'Enter the amount');
    if (d.type === 'opening' && Store.all('accountEntries').some((e) => e.type === 'opening' && e.account === d.account && e.id !== d.id)) {
      throw UI.invalid('type', `${L.accountLabel(d.account)} already has an opening balance`);
    }
    if (d.toAccount && d.type !== 'out') throw UI.invalid('toAccount', 'Only Money out can be moved to another account');
    if (d.toAccount && d.toAccount === d.account) throw UI.invalid('toAccount', 'Choose a different account');
    const rec = { account: d.account, type: d.type, date: d.date, amount, description: d.description, reference: d.reference, toAccount: d.toAccount, proof: d.proof };
    if (d.id) rec.id = d.id;
    Store.save('accountEntries', rec);
    UI.toast(d.id ? 'Record updated' : 'Record added');
  };
})();
