// Dashboard — the one screen that explains the business at a glance.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  // Grouped bar chart: money in vs money out per month, with hover tooltips.
  M.inOutChart = (months, id = 'io') => {
    const data = months.map((k) => L.monthTotals(k));
    // Size the drawing to the screen so axis labels stay readable on phones.
    const W = Math.round(Math.min(640, Math.max(300, window.innerWidth - 72)));
    const H = W < 480 ? 200 : 230, padL = 44, padB = 26, padT = 10;
    // A sensible scale even before any money is recorded.
    const max = Math.max(1000000, ...data.map((d) => Math.max(d.in, d.out)));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step;
    const ticks = [0, top / 2, top];
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const band = (W - padL) / data.length;
    const bw = Math.min(26, band * 0.28);
    const bar = (x, v) => {
      const h = Math.max(0, y(0) - y(v));
      if (h < 0.5) return '';
      const r = Math.min(4, h, bw / 2);
      const t = y(v);
      return `M${x},${y(0)} V${t + r} Q${x},${t} ${x + r},${t} H${x + bw - r} Q${x + bw},${t} ${x + bw},${t + r} V${y(0)} Z`;
    };
    const cs = getComputedStyle(document.documentElement);
    const cIn = cs.getPropertyValue('--series-in').trim() || '#B39A6B';
    const cOut = cs.getPropertyValue('--series-out').trim() || '#A6A6AB';
    const svg = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Money in and money out by month">
        <g class="grid">${ticks.map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
        <g class="axis">${ticks.map((t) => `<text x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${UI.moneyShort(t)}</text>`).join('')}
          ${data.map((d, i) => `<text x="${padL + band * i + band / 2}" y="${H - 6}" text-anchor="middle">${UI.monthLabel(d.key)}</text>`).join('')}</g>
        ${data.map((d, i) => {
          const cx = padL + band * i + band / 2;
          return `<path d="${bar(cx - bw - 1, d.in)}" fill="${cIn}"/><path d="${bar(cx + 1, d.out)}" fill="${cOut}"/>
            <rect class="hit" x="${padL + band * i + 2}" y="${padT}" width="${band - 4}" height="${H - padT - padB}" rx="8" data-i="${i}"/>`;
        }).join('')}
      </svg>`;
    // Data for the tooltip, read in after().
    M.state.chart = M.state.chart || {};
    M.state.chart[id] = data;
    return `
      <div class="chart-legend"><span><i style="background:${cIn}"></i>Money in</span><span><i style="background:${cOut}"></i>Money out</span></div>
      <div class="chart-wrap chart" id="chart-${id}">${svg}<div class="tip" id="tip-${id}"></div></div>`;
  };
  M.bindChart = (id = 'io') => {
    const wrap = document.getElementById('chart-' + id);
    const tip = document.getElementById('tip-' + id);
    if (!wrap) return;
    const data = M.state.chart[id];
    const show = (e) => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i == null) return;
      const d = data[+i];
      const r = e.target.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      tip.innerHTML = `<b>${UI.monthLabel(d.key, true)}</b>
        <div class="r"><span><i style="background:${cs.getPropertyValue('--series-in')}"></i>In</span><span>${money(d.in)}</span></div>
        <div class="r"><span><i style="background:${cs.getPropertyValue('--series-out')}"></i>Out</span><span>${money(d.out)}</span></div>
        <div class="r" style="margin-top:4px;font-weight:600"><span>Net</span><span>${d.net < 0 ? '−' : ''}${money(Math.abs(d.net))}</span></div>`;
      const x = Math.min(Math.max(r.left - w.left + r.width / 2, 90), w.width - 90);
      tip.style.left = x + 'px';
      tip.style.top = (r.top - w.top + 8) + 'px';
      tip.classList.add('show');
    };
    wrap.querySelectorAll('.hit').forEach((h) => {
      h.addEventListener('mouseenter', show);
      h.addEventListener('click', show);
      h.addEventListener('mouseleave', () => tip.classList.remove('show'));
    });
  };

  const kpi = (label, value, foot = '', opts = {}) => `
    <${opts.href ? `a href="${opts.href}"` : 'div'} class="kpi${opts.accent ? ' accent' : ''}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value"><span class="cur">UGX</span>${value}</div>
      ${foot ? `<div class="kpi-foot">${foot}</div>` : ''}
      ${opts.note ? `<div class="kpi-note">${opts.note}</div>` : ''}
    </${opts.href ? 'a' : 'div'}>`;

  const delta = (cur, prev) => {
    if (!prev) return '';
    const p = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    if (!isFinite(p) || p === 0) return '<span>Same as last month</span>';
    return `<span class="${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%</span> vs last month`;
  };

  // Shown to everyone when a shoot is 3 days away or closer.
  const comingUpCard = () => {
    const list = L.comingUp(3);
    if (!list.length) return '';
    return `<div class="coming-up">${UI.card(`${icon('bell', 18)} Coming up in the next 3 days <span class="pill warn plain">${list.length}</span>`, M.comingUpList(list), { action: '<a class="link" href="#/bookings">Calendar</a>' })}</div>`;
  };

  const note = (text) => `<p class="card-note">${text}</p>`;

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const firstName = () => String(M.user.name || '').split(' ')[0];

  const upcomingList = (list) => list.length ? `<div class="list">${list.map((b) => UI.row({
    href: '#/bookings/' + b.id, lead: UI.dateTile(b.date), title: esc(L.clientName(b.clientId)),
    sub: `${esc(b.eventType)} · ${esc(b.venue || 'Venue TBC')}${b.time ? ' · ' + esc(b.time) : ''}`,
    badge: L.clashes(b).length ? UI.pill('overdue', 'Clash') : '',
    rightSub: UI.pill(b.status)
  })).join('')}</div>` : UI.emptySm('No shoots coming up.');

  const reqList = (list) => list.length ? `<div class="list">${list.map((r) => UI.row({
    href: '#/requisitions/' + r.id, lead: L.userAvatar(r.requestedBy),
    title: esc(r.purpose), sub: `${esc(L.userName(r.requestedBy))} · ${UI.dateShort(r.date)}`, right: money(r.amount), rightSub: UI.pill(r.status)
  })).join('')}</div>` : UI.emptySm('Nothing waiting for approval.');

  const eqList = (list) => list.length ? `<div class="list">${list.map((e) => {
    const st = L.equipmentStatus(e);
    const co = L.openCheckout(e.id);
    return UI.row({
      href: '#/equipment/' + e.id, lead: UI.tile('camera'), title: esc(e.name),
      sub: co ? `With ${esc(L.userName(co.userId))} · due back ${UI.dateShort(co.dueBack)}` : L.serviceDue(e) ? `Service due ${UI.dateShort(e.nextServiceDate)}` : esc(e.code),
      rightSub: st === 'available' && L.serviceDue(e) ? UI.pill('service-due') : UI.pill(st)
    });
  }).join('')}</div>` : UI.emptySm('All equipment is in good shape.');

  M.views.dashboard = {
    title: 'Dashboard',
    render() {
      const t = L.today();
      if (!M.isAdmin()) return staffDashboard(t);

      const thisM = L.monthKey(t);
      const lastM = L.monthsBack(2)[0];
      const cur = L.monthTotals(thisM), prev = L.monthTotals(lastM);
      const outstanding = L.issuedInvoices().filter((i) => L.balance(i) > 0);
      const overdue = outstanding.filter((i) => L.invoiceStatus(i) === 'overdue');
      const owed = L.sum(outstanding, (i) => L.balance(i));
      const pending = L.pendingRequisitions();
      const approvedUnpaid = Store.find('requisitions', (r) => r.status === 'approved');
      const eqAttention = Store.all('equipment').filter((e) => L.needsAttention(e) || L.openCheckout(e.id));
      const year = t.slice(0, 4);
      const yIn = L.moneyIn(year + '-01-01', year + '-12-31'), yOut = L.moneyOut(year + '-01-01', year + '-12-31');
      const top = outstanding.slice().sort((a, b) => L.balance(b) - L.balance(a)).slice(0, 5);

      return `
        ${UI.pageHead(`${greeting()}, ${esc(firstName())}`, `${UI.weekday(t)}, ${UI.dateLong(t)} — here's how Merit Media is doing.`,
          UI.btn('New quotation', 'quote-new', { icon: 'plus' }) + UI.btn('Record payment', 'receipt-new', { kind: 'primary', icon: 'receipt' }))}
        ${comingUpCard()}
        ${L.newRequests().length ? `<a class="notice info" href="#/requests" style="text-decoration:none">${icon('mail', 18)}<div><strong>${L.newRequests().length} new booking request${L.newRequests().length === 1 ? '' : 's'}</strong> from your package links — tap to review.</div></a>` : ''}

        <div class="kpis">
          ${kpi(`Money in · ${UI.monthLabel(thisM, true)}`, UI.num(cur.in), delta(cur.in, prev.in), { href: '#/receipts', note: 'Payments actually received this month.' })}
          ${kpi('Money out · this month', UI.num(cur.out), delta(cur.out, prev.out), { href: '#/expenses', note: 'Everything recorded as spent this month.' })}
          ${kpi('Net this month', (cur.net < 0 ? '−' : '') + UI.num(Math.abs(cur.net)), cur.in ? `${Math.round((cur.net / cur.in) * 100)}% of money in kept` : 'No income recorded yet', { href: '#/reports', note: 'What is left after this month\'s spending.' })}
          ${kpi('Owed to you', UI.num(owed), `${outstanding.length} unpaid invoice${outstanding.length === 1 ? '' : 's'}${overdue.length ? ` · <span class="down">${overdue.length} overdue</span>` : ''}`, { href: '#/invoices', accent: true, note: 'Sent invoices clients have not fully paid.' })}
        </div>
        <div class="kpis three">
          ${kpi(`Money in · ${esc(year)}`, UI.num(yIn), '', { href: '#/reports', note: 'All payments received since January.' })}
          ${kpi(`Money out · ${esc(year)}`, UI.num(yOut), '', { href: '#/reports', note: 'All spending recorded since January.' })}
          ${kpi(`Net · ${esc(year)}`, (yIn - yOut < 0 ? '−' : '') + UI.num(Math.abs(yIn - yOut)), '', { href: '#/reports', note: 'Money in minus money out so far this year.' })}
        </div>
        <div class="section-gap">${UI.card('Pipeline', `${note('Work on its way to becoming money, from first request to final payment.')}<div class="list">${L.pipeline().map((p) => UI.row({ href: p.href, title: esc(p.label), sub: `${p.count} open`, right: money(p.value) })).join('')}</div>`)}</div>

        ${UI.card('Money in vs money out', M.inOutChart(L.monthsBack(6)), { action: '<span class="hint">Last 6 months</span>' })}

        <div class="grid-2 section-gap">
          ${UI.card('Who owes you', note('The largest unpaid invoices, biggest first.') + (top.length ? `<div class="list">${top.map((i) => UI.row({
            href: '#/invoices/' + i.id, lead: UI.avatar(L.clientName(i.clientId)), title: esc(L.clientName(i.clientId)),
            sub: `${esc(i.number)} · due ${UI.dateShort(i.dueDate)}`, right: money(L.balance(i)), rightSub: UI.pill(L.invoiceStatus(i))
          })).join('')}</div>` : UI.emptySm('Every invoice is paid.')), { action: '<a class="link" href="#/invoices">All invoices</a>' })}
          ${UI.card('Upcoming shoots', note('The next shoots in the coming 60 days.') + upcomingList(L.upcoming(60).slice(0, 5)), { action: '<a class="link" href="#/bookings">Calendar</a>' })}
          ${UI.card(`Requisitions${pending.length ? ` <span class="pill warn plain">${pending.length}</span>` : ''}`, note('Requests waiting for your approval or payment.') + reqList(pending.concat(approvedUnpaid).slice(0, 5)), { action: '<a class="link" href="#/requisitions">All requests</a>' })}
          ${UI.card('Equipment', note('Items checked out, needing repair, or due for service.') + eqList(eqAttention.slice(0, 5)), { action: '<a class="link" href="#/equipment">Register</a>' })}
        </div>`;
    },
    after() { M.bindChart('io'); }
  };

  function staffDashboard(t) {
    const me = M.user.id;
    const mine = L.upcoming(90).filter((b) => (b.crew || []).includes(me));
    const others = L.upcoming(30).filter((b) => !(b.crew || []).includes(me));
    const myReqs = Store.find('requisitions', (r) => r.requestedBy === me).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const myGear = Store.all('equipment').filter((e) => { const co = L.openCheckout(e.id); return co && co.userId === me; });
    return `
      ${UI.pageHead(`${greeting()}, ${esc(firstName())}`, `${UI.weekday(t)}, ${UI.dateLong(t)}`,
        UI.btn('New requisition', 'req-new', { kind: 'primary', icon: 'plus' }))}
      ${comingUpCard()}
      <div class="grid-2">
        ${UI.card('Your next shoots', upcomingList(mine.slice(0, 5)), { action: '<a class="link" href="#/bookings">Calendar</a>' })}
        ${UI.card('Equipment with you', eqList(myGear), { action: '<a class="link" href="#/equipment">Register</a>' })}
        ${UI.card('Your requisitions', reqList(myReqs), { action: '<a class="link" href="#/requisitions">All</a>' })}
        ${UI.card('Other shoots this month', upcomingList(others.slice(0, 5)))}
      </div>`;
  }
})();
