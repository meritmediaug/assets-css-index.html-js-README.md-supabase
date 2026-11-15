// Printable documents — invoice, receipt, quotation — in the Merit Media house
// style (gold bars, black table header, gold balance panel). "Print / Save PDF"
// renders the document alone on an A4 page.
(function () {
  const M = window.M;
  const { esc, money, dateLong, logo } = M.UI;
  const L = M.L;

  const head = (kind, number) => {
    const co = L.company();
    return `
    <header class="doc-head">
      <div class="doc-brand"><div class="doc-logo">${logo(40)}</div>
        <div class="doc-co">${esc(co.name)}</div>
      </div>
      <div class="doc-id"><div class="doc-kind">${esc(kind)}</div><div class="doc-no">${esc(number)}</div>${co.tin ? `<div class="doc-tin">TIN ${esc(co.tin)}</div>` : ''}</div>
    </header>`;
  };

  // Discount and VAT lines shared by invoices and quotations.
  const adjustments = (t) => `
    ${t.discount ? `<div class="r sub"><span>Discount</span><span>− ${money(t.discount)}</span></div>` : ''}
    ${t.vat ? `${t.discount ? `<div class="r sub"><span>Amount before VAT</span><span>${money(t.net)}</span></div>` : ''}<div class="r sub"><span>VAT (${t.vatRate}%)</span><span>${money(t.vat)}</span></div>` : ''}`;

  const party = (label, clientId) => {
    const c = L.client(clientId) || {};
    return `<div><label>${label}</label><strong>${esc(c.name || '—')}</strong>${c.phone ? `<span>${esc(c.phone)}</span>` : ''}${c.email ? `<span>${esc(c.email)}</span>` : ''}</div>`;
  };

  const linesTable = (lines) => `
    <table class="doc-table">
      <thead><tr><th>Description</th><th class="c">Qty</th><th class="r up">Unit price</th><th class="r">Amount</th></tr></thead>
      <tbody>${(lines || []).map((l) => `
        <tr>
          <td><div class="it">${esc(l.name)}</div>${l.description ? `<div class="ds">${esc(l.description)}</div>` : ''}</td>
          <td class="c">${esc(l.qty)}</td>
          <td class="r up">${money(l.price)}</td>
          <td class="r">${money((Number(l.qty) || 0) * (Number(l.price) || 0))}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const foot = () => {
    const co = L.company();
    const contact = [co.phone, co.email, co.website, co.address].filter(Boolean).map(esc).join('&nbsp;&nbsp;|&nbsp;&nbsp;');
    const extra = [co.hours, co.travel].filter(Boolean).map(esc).join('&nbsp;&nbsp;|&nbsp;&nbsp;');
    return `<footer class="doc-foot"><div class="tag">${esc(co.tagline)}</div><div>${contact}${co.tin ? `&nbsp;&nbsp;|&nbsp;&nbsp;TIN ${esc(co.tin)}` : ''}</div>${extra ? `<div>${extra}</div>` : ''}</footer>`;
  };

  const wrap = (body) => `<article class="doc"><div class="doc-bar"></div><div class="doc-body">${body}</div>${foot()}<div class="doc-bar"></div></article>`;

  // Bank details and other ways to pay — on every document (the TIN is in the header and footer).
  const payBlock = () => {
    const co = L.company();
    const bank = [['Bank', co.bankName], ['Branch', co.bankBranch], ['Account name', co.bankAccountName], ['Account no.', co.bankAccountNumber], ['SWIFT', co.bankSwift]].filter((x) => x[1]);
    const cols = [
      bank.length ? `<div><strong>Bank details</strong>${bank.map(([k, v]) => `<div class="kv"><span>${k}</span>${esc(v)}</div>`).join('')}</div>` : '',
      co.paymentDetails ? `<div><strong>${bank.length ? 'Other ways to pay' : 'How to pay'}</strong><div class="pre">${esc(co.paymentDetails)}</div></div>` : ''
    ].filter(Boolean);
    return cols.length ? `<div class="doc-pay">${cols.join('')}</div>` : '';
  };

  const Docs = {
    invoice(inv) {
      const t = L.totals(inv);
      const paid = L.paid(inv);
      const bal = L.balance(inv);
      const status = L.invoiceStatus(inv);
      return wrap(`
        ${head(status === 'draft' ? 'DRAFT INVOICE' : 'INVOICE', inv.number)}
        <div class="doc-meta">
          ${party('Billed to', inv.clientId)}
          <div><label>Issue date</label>${dateLong(inv.issueDate)}</div>
          <div><label>Due date</label>${dateLong(inv.dueDate)}</div>
        </div>
        ${linesTable(inv.lines)}
        <div class="doc-totals">
          <div class="r sub"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          ${adjustments(t)}
          <div class="r tot"><span>Total${t.vat ? ' (incl. VAT)' : ''}</span><span>${money(t.total)}</span></div>
          ${paid ? `<div class="r sub"><span>Amount paid</span><span>− ${money(paid)}</span></div>` : ''}
          <div class="r due"><span>BALANCE DUE</span><b>${money(bal)}</b></div>
        </div>
        ${status === 'void' ? '<div class="doc-stamp">VOID</div>' : ''}
        ${inv.notes ? `<div class="doc-notes">${esc(inv.notes)}</div>` : ''}
        ${payBlock()}
        <p class="doc-thanks">${esc(L.company().thanks)}</p>`);
    },

    quotation(q) {
      const t = L.totals(q);
      return wrap(`
        ${head('QUOTATION', q.number)}
        <div class="doc-meta">
          ${party('Prepared for', q.clientId)}
          <div><label>Date</label>${dateLong(q.date)}</div>
          <div><label>Valid until</label>${dateLong(q.validUntil)}</div>
        </div>
        ${linesTable(q.lines)}
        <div class="doc-totals">
          <div class="r sub"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          ${adjustments(t)}
          <div class="r due"><span>QUOTED TOTAL${t.vat ? ' (INCL. VAT)' : ''}</span><b>${money(t.total)}</b></div>
        </div>
        ${q.notes ? `<div class="doc-notes">${esc(q.notes)}</div>` : ''}
        ${payBlock()}
        <p class="doc-thanks">${esc(L.company().thanks)}</p>`);
    },

    receipt(r) {
      const inv = M.Store.get('invoices', r.invoiceId);
      let ref = '';
      let balanceAfter = 0;
      if (inv) {
        const total = L.totals(inv).total;
        // Paid up to and including this receipt, so reprints of older receipts stay correct.
        const upto = L.receiptsFor(inv.id);
        const idx = upto.findIndex((x) => x.id === r.id);
        const paidToDate = L.sum(upto.slice(0, idx + 1), (x) => x.amount);
        balanceAfter = Math.max(0, total - paidToDate);
        ref = `<div><label>Invoice reference</label><strong>${esc(inv.number)}</strong>
          <span>Invoice total ${money(total)}</span><span>Total paid to date ${money(paidToDate)}</span></div>`;
      }
      return wrap(`
        ${head('RECEIPT', r.number)}
        <div class="doc-meta rc">
          ${party('Received from', r.clientId)}
          ${ref || '<div></div>'}
          <div><label>Date</label>${dateLong(r.date)}</div>
        </div>
        <div class="doc-paid">
          <div>
            <label>Amount received</label>
            <div class="amt">${money(r.amount)}</div>
            <div>Paid via ${esc(L.methodLabel(r.method))}${r.reference ? ` · Ref ${esc(r.reference)}` : ''}</div>
          </div>
          <div class="bal"><label>Balance</label><b>${balanceAfter > 0 ? money(balanceAfter) : 'NIL'}</b></div>
        </div>
        ${r.notes ? `<div class="doc-notes"><strong>Notes</strong><br>${esc(r.notes)}</div>` : ''}
        ${payBlock()}
        <p class="doc-thanks">This receipt confirms payment received. Thank you for your business.</p>`);
    },

    // Payslip for a salary or wage payment (an expense with payroll details).
    payslip(e) {
      const u = M.Store.get('users', e.staffId) || {};
      const gross = Number(e.gross) || Number(e.amount) || 0;
      const ded = [['PAYE', e.paye], ['NSSF (employee 5%)', e.nssf], ['Other deductions', e.otherDeductions]].filter((x) => Number(x[1]) > 0);
      const period = /^\d{4}-\d{2}$/.test(e.period || '') ? M.UI.monthLabel(e.period, true) : '—';
      return wrap(`
        ${head('PAYSLIP', period)}
        <div class="doc-meta">
          <div><label>Paid to</label><strong>${esc(u.name || e.paidTo || '—')}</strong>${u.title ? `<span>${esc(u.title)}</span>` : ''}${u.phone ? `<span>${esc(u.phone)}</span>` : ''}</div>
          <div><label>Pay type</label>${esc(M.payTypeLabel ? M.payTypeLabel(e.payType) : 'Pay')}</div>
          <div><label>Date paid</label>${dateLong(e.date)}</div>
        </div>
        <table class="doc-table">
          <thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
          <tbody>
            <tr><td><div class="it">Gross pay</div></td><td class="r">${money(gross)}</td></tr>
            ${ded.map(([k, v]) => `<tr><td><div class="it">${k}</div></td><td class="r">− ${money(v)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="doc-paid">
          <div><label>Net pay</label><div class="amt">${money(e.amount)}</div>
            <div>Paid via ${esc(L.methodLabel(e.method))}${e.reference ? ` · Ref ${esc(e.reference)}` : ''}</div></div>
        </div>
        ${e.notes ? `<div class="doc-notes"><strong>Notes</strong><br>${esc(e.notes)}</div>` : ''}
        <p class="doc-thanks">Thank you for your work with ${esc(L.company().name)}.</p>`);
    },

    print(html, title) {
      const root = document.getElementById('print-root');
      root.innerHTML = html;
      const old = document.title;
      document.title = title || old; // becomes the suggested PDF file name
      setTimeout(() => {
        window.print();
        setTimeout(() => { document.title = old; }, 400);
      }, 60);
    }
  };

  M.Docs = Docs;
})();
