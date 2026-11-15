// Quotations and bookings. A quotation is accepted into a booking; a booking
// (or quotation) becomes an invoice in one click.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  // ====================== Quotations ======================
  M.views.quotations = {
    title: 'Quotations',
    admin: true,
    render(id) { return id ? quoteDetail(id) : quoteList(); }
  };

  function quoteList() {
    const all = Store.all('quotations').slice().sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    const f = UI.segVal('quotes', 'open');
    const count = (fn) => all.filter(fn).length;
    const open = (q) => ['draft', 'sent'].includes(L.quoteStatus(q));
    const filtered = all.filter((q) => f === 'all' || (f === 'open' ? open(q) : L.quoteStatus(q) === f));
    const openValue = L.sum(all.filter((q) => L.quoteStatus(q) === 'sent'), (q) => L.totals(q).total);
    return `
      ${UI.pageHead('Quotations', `${money(openValue)} quoted and awaiting a reply`, UI.btn('New quotation', 'quote-new', { kind: 'primary', icon: 'plus' }))}
      <div class="toolbar">${UI.seg('quotes', [['open', 'Open', count(open)], ['accepted', 'Accepted', count((q) => q.status === 'accepted')], ['declined', 'Declined'], ['expired', 'Expired'], ['all', 'All']], 'open')}</div>
      <div class="card">${filtered.length ? `<div class="list">${filtered.map((q) => UI.row({
        href: '#/quotations/' + q.id, lead: UI.avatar(L.clientName(q.clientId)), title: esc(L.clientName(q.clientId)),
        sub: `${esc(q.number)} · ${UI.date(q.date)}`, right: money(L.totals(q).total), rightSub: UI.pill(L.quoteStatus(q))
      })).join('')}</div>` : UI.empty('quote', 'No quotations here', 'Send clients a professional quotation from your price list.', UI.btn('New quotation', 'quote-new', { kind: 'primary', icon: 'plus' }))}</div>`;
  }

  function quoteDetail(id) {
    const q = Store.get('quotations', id);
    if (!q) return UI.empty('quote', 'Quotation not found', '', UI.btn('Back', '', { href: '#/quotations' }));
    const st = L.quoteStatus(q);
    const booking = q.bookingId && Store.get('bookings', q.bookingId);
    const invoice = Store.all('invoices').find((i) => i.quotationId === q.id);
    const actions = [
      UI.btn('Print / PDF', 'print', { icon: 'print', data: { kind: 'quotation', id } }),
      st !== 'accepted' ? UI.btn('Edit', 'quote-edit', { icon: 'edit', data: { id } }) : '',
      st === 'draft' ? UI.btn('Mark as sent', 'quote-status', { data: { id, status: 'sent' } }) : '',
      ['sent', 'expired', 'draft'].includes(st) ? UI.btn('Declined', 'quote-status', { data: { id, status: 'declined' } }) : '',
      st !== 'accepted' && st !== 'declined' ? UI.btn('Accept & book', 'quote-accept', { kind: 'primary', icon: 'check', data: { id } }) : '',
      st === 'accepted' && !invoice ? UI.btn('Create invoice', 'invoice-new', { kind: 'primary', icon: 'invoice', data: { quote: id } }) : ''
    ].join('');
    return `
      ${UI.pageHead(`${esc(q.number)} ${UI.pill(st)}`, `${esc(L.clientName(q.clientId))} · ${money(L.totals(q).total)}`, actions, { href: '#/quotations', label: 'Quotations' })}
      ${booking || invoice ? `<div class="notice good">${icon('check', 18)}<div>
        ${booking ? `Booked: <a class="link" href="#/bookings/${booking.id}">${esc(L.bookingTitle(booking))} on ${UI.date(booking.date)}</a>. ` : ''}
        ${invoice ? `Invoiced: <a class="link" href="#/invoices/${invoice.id}">${esc(invoice.number)}</a>.` : ''}</div></div>` : ''}
      <div class="doc-frame">${M.Docs.quotation(q)}</div>`;
  }

  const quoteForm = (q = {}) => {
    const co = L.company();
    const date = q.date || L.today();
    UI.modal({
      title: q.id ? `Edit ${q.number}` : 'New quotation',
      form: 'quote', wide: true, submit: q.id ? 'Save' : 'Create quotation',
      body: `<input type="hidden" name="id" value="${esc(q.id || '')}">` + UI.fields([
        { label: 'Client', name: 'clientId', type: 'select', options: M.opts.clients('Choose a client…'), value: q.clientId, required: true, full: true, hint: Store.all('clients').length ? '' : 'Add a client first under Clients.' },
        { label: 'Date', name: 'date', type: 'date', value: date, required: true },
        { label: 'Valid until', name: 'validUntil', type: 'date', after: 'date', value: q.validUntil || L.addDays(date, Number(co.quoteValidDays) || 14), required: true },
        M.lineEditor(q.lines, q.discount, q.vat ?? L.company().vatDefault, q.vatRate),
        { label: 'Notes for the client', name: 'notes', type: 'textarea', value: q.notes, full: true, placeholder: 'Event details, what is included, payment terms…' },
        { label: 'Status', name: 'status', type: 'select', options: [['draft', 'Draft — not sent yet'], ['sent', 'Sent to client']], value: q.status || 'sent' }
      ])
    });
  };

  Object.assign(M.actions, {
    'quote-new': (el) => quoteForm({ clientId: el.dataset.client }),
    'quote-edit': (el) => quoteForm(Store.get('quotations', el.dataset.id)),
    'quote-status': (el) => {
      const q = Store.get('quotations', el.dataset.id);
      Store.save('quotations', Object.assign({}, q, { status: el.dataset.status }));
      UI.toast(`${q.number} marked ${el.dataset.status}`);
    },
    'quote-accept': (el) => {
      const q = Store.get('quotations', el.dataset.id);
      bookingForm({ clientId: q.clientId, quotationId: q.id, eventType: 'Wedding', status: 'confirmed', notes: q.notes });
    }
  });

  M.forms.quote = (d) => {
    const lines = M.readLines(d);
    if (!d.clientId) throw UI.invalid('clientId', 'Choose a client');
    const rec = { clientId: d.clientId, date: d.date, validUntil: d.validUntil, lines, discount: Number(d.discount) || 0, vat: !!d.vat, vatRate: Number(d.vatRate) || 18, notes: d.notes, status: d.status };
    if (d.id) rec.id = d.id; else rec.number = L.nextNumber('quotations', 'QUO');
    const saved = Store.save('quotations', rec);
    UI.toast(d.id ? 'Quotation updated' : `${saved.number} created`);
    M.go('quotations/' + saved.id);
  };

  // ====================== Bookings ======================
  M.views.bookings = {
    title: 'Bookings',
    render(id) { return id ? bookingDetail(id) : bookingList(); }
  };

  function bookingList() {
    const view = UI.segVal('bview', 'calendar');
    const head = UI.pageHead('Bookings', `${L.upcoming(30).length} shoots in the next 30 days`, UI.btn('New booking', 'booking-new', { kind: 'primary', icon: 'plus' }));
    const toolbar = `<div class="toolbar">${UI.seg('bview', [['calendar', 'Calendar'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']], 'calendar')}</div>`;
    if (view === 'calendar') return head + toolbar + calendar();
    const t = L.today();
    let list = Store.all('bookings').slice();
    if (view === 'upcoming') list = list.filter((b) => b.date >= t && b.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date));
    else if (view === 'past') list = list.filter((b) => b.date < t).sort((a, b) => b.date.localeCompare(a.date));
    else list.sort((a, b) => b.date.localeCompare(a.date));
    return head + toolbar + `<div class="card">${list.length ? `<div class="list">${list.map(bookingRow).join('')}</div>` : UI.empty('calendar', 'No bookings here', 'Create a booking or accept a quotation.', UI.btn('New booking', 'booking-new', { kind: 'primary', icon: 'plus' }))}</div>`;
  }

  const bookingRow = (b) => UI.row({
    href: '#/bookings/' + b.id, lead: UI.dateTile(b.date), title: esc(L.clientName(b.clientId)),
    badge: L.clashes(b).length ? UI.pill('overdue', 'Clash') : '',
    sub: `${esc(b.eventType)} · ${esc(b.venue || 'Venue TBC')}${b.time ? ' · ' + esc(b.time) : ''}`,
    rightSub: UI.pill(b.status)
  });

  function calendar() {
    const key = M.state.calMonth || L.monthKey(L.today());
    const [y, m] = key.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(y, m - 1, 1 - startOffset);
    const t = L.today();
    const byDate = {};
    Store.all('bookings').forEach((b) => { (byDate[b.date] = byDate[b.date] || []).push(b); });
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = L.isoOf(d);
      if (i >= 35 && d.getMonth() !== m - 1) break;
      const evs = (byDate[iso] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const live = evs.filter((b) => b.status !== 'cancelled');
      days.push(`<div class="day${d.getMonth() !== m - 1 ? ' other' : ''}${iso === t ? ' today' : ''}">
        <div class="dn">${d.getDate()}</div>
        ${evs.map((b) => `<a class="ev ${b.status}${live.length > 1 && b.status !== 'cancelled' ? ' clash' : ''}" href="#/bookings/${b.id}" title="${esc(L.bookingTitle(b))}">${b.time ? esc(b.time) + ' ' : ''}${esc(L.clientName(b.clientId))}</a>`).join('')}
      </div>`);
    }
    const prev = L.isoOf(new Date(y, m - 2, 1)).slice(0, 7), next = L.isoOf(new Date(y, m, 1)).slice(0, 7);
    return `<div class="card">
      <div class="cal-head"><h2>${UI.monthLabel(key, true)}</h2>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" data-act="cal-month" data-m="${prev}" aria-label="Previous month">${icon('back', 18, 2)}</button>
          <button class="btn sm ghost" data-act="cal-month" data-m="${L.monthKey(t)}">Today</button>
          <button class="icon-btn" data-act="cal-month" data-m="${next}" aria-label="Next month">${icon('chevron', 18, 2)}</button>
        </div></div>
      <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="dow">${d}</div>`).join('')}${days.join('')}</div>
    </div>`;
  }

  function bookingDetail(id) {
    const b = Store.get('bookings', id);
    if (!b) return UI.empty('calendar', 'Booking not found', '', UI.btn('Back', '', { href: '#/bookings' }));
    const admin = M.isAdmin();
    const clashes = L.clashes(b);
    const gear = Store.find('checkouts', (c) => c.bookingId === id);
    const invoices = Store.find('invoices', (i) => i.bookingId === id);
    const quote = b.quotationId && Store.get('quotations', b.quotationId);
    const reqs = Store.find('requisitions', (r) => r.bookingId === id && (admin || r.requestedBy === M.user.id));
    const statusBtns = {
      tentative: [['confirmed', 'Confirm'], ['cancelled', 'Cancel booking']],
      confirmed: [['completed', 'Mark completed'], ['cancelled', 'Cancel booking']],
      completed: [['confirmed', 'Reopen']],
      cancelled: [['tentative', 'Restore']]
    }[b.status] || [];

    let moneyCard = '';
    if (admin) {
      const billed = L.sum(invoices.filter((i) => i.status !== 'void'), (i) => L.totals(i).total);
      const paid = L.sum(invoices, (i) => L.paid(i));
      const spent = L.sum(Store.find('expenses', (e) => e.bookingId === id), (e) => e.amount);
      moneyCard = UI.card('Money', `<div class="card-body"><dl class="dl">
          <dt>Invoiced</dt><dd class="num">${money(billed)}</dd>
          <dt>Received</dt><dd class="num">${money(paid)}</dd>
          <dt>Spent on this shoot</dt><dd class="num">${money(spent)}</dd>
          <dt class="total">Profit so far</dt><dd class="total num">${paid - spent < 0 ? '−' : ''}${money(Math.abs(paid - spent))}</dd>
        </dl></div>
        ${invoices.length ? `<div class="list">${invoices.map((i) => UI.row({ href: '#/invoices/' + i.id, lead: UI.tile('invoice'), title: esc(i.number), sub: `Balance ${money(L.balance(i))}`, rightSub: UI.pill(L.invoiceStatus(i)) })).join('')}</div>` : ''}`,
        { action: !invoices.some((i) => i.status !== 'void') ? UI.btn('Create invoice', 'invoice-new', { size: 'sm', icon: 'plus', data: { booking: id } }) : '' });
    }

    return `
      ${UI.pageHead(`${esc(b.eventType)} ${UI.pill(b.status)}`, `<a class="link" href="#/clients/${b.clientId}">${esc(L.clientName(b.clientId))}</a> · ${UI.weekday(b.date)} ${UI.dateLong(b.date)}${b.time ? ' at ' + esc(b.time) : ''}`,
        UI.btn('Edit', 'booking-edit', { icon: 'edit', data: { id } }) + statusBtns.map(([s, l]) => UI.btn(l, 'booking-status', { kind: s === 'cancelled' ? 'danger' : s === 'completed' || s === 'confirmed' ? 'primary' : '', data: { id, status: s } })).join(''),
        { href: '#/bookings', label: 'Bookings' })}
      ${clashes.length ? `<div class="notice">${icon('alert', 18)}<div>Another shoot is booked the same day: ${clashes.map((o) => `<a class="link" href="#/bookings/${o.id}">${esc(L.bookingTitle(o))}</a>`).join(', ')}. Check crew and equipment.</div></div>` : ''}
      <div class="split">
        <div class="stack">
          ${UI.card('Equipment for this shoot', gear.length ? `<div class="list">${gear.map((c) => {
            const e = Store.get('equipment', c.equipmentId) || { name: 'Removed item' };
            return UI.row({ href: '#/equipment/' + c.equipmentId, lead: UI.tile('camera'), title: esc(e.name), sub: `${esc(L.userName(c.userId))} · out ${UI.dateShort(c.outAt)}`, rightSub: c.inAt ? UI.pill('available', 'Returned') : UI.pill('out') });
          }).join('')}</div>` : UI.emptySm('No equipment checked out for this shoot yet.'), { action: UI.btn('Check out', 'checkout-new', { size: 'sm', icon: 'arrowOut', data: { booking: id } }) })}
          ${UI.card('Requisitions', reqs.length ? `<div class="list">${reqs.map((r) => UI.row({ href: '#/requisitions/' + r.id, lead: L.userAvatar(r.requestedBy), title: esc(r.purpose), sub: esc(L.userName(r.requestedBy)), right: money(r.amount), rightSub: UI.pill(r.status) })).join('')}</div>` : UI.emptySm('No money requested for this shoot.'),
            { action: UI.btn('Request money', 'req-new', { size: 'sm', icon: 'plus', data: { booking: id } }) })}
        </div>
        <div class="stack">
          ${UI.card('Details', `<div class="card-body"><dl class="dl">
            <dt>Booking no.</dt><dd>${esc(b.number || '—')}</dd>
            <dt>Venue</dt><dd>${esc(b.venue || 'TBC')}</dd>
            <dt>Crew</dt><dd>${(b.crew || []).map((id) => { const u = Store.get('users', id) || {}; const wa = L.waLink(u.phone); return `<div class="crew-line">${esc(u.name || '—')}${u.title ? ` <span class="faint">· ${esc(u.title)}</span>` : ''}${wa ? ` · <a class="link" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>`; }).join('') || 'Not assigned'}</dd>
            ${quote && admin ? `<dt>Quotation</dt><dd><a class="link" href="#/quotations/${quote.id}">${esc(quote.number)}</a></dd>` : ''}
          </dl>${b.notes ? `<p class="muted" style="margin:16px 0 0;white-space:pre-line">${esc(b.notes)}</p>` : ''}</div>`,
            { foot: admin ? `<button class="link" style="color:var(--bad)" data-act="booking-delete" data-id="${id}">Delete booking</button>` : '' })}
          ${moneyCard}
        </div>
      </div>`;
  }

  const bookingForm = (b = {}) => UI.modal({
    title: b.id ? 'Edit booking' : 'New booking',
    form: 'booking', submit: b.id ? 'Save' : 'Create booking',
    body: `<input type="hidden" name="id" value="${esc(b.id || '')}"><input type="hidden" name="quotationId" value="${esc(b.quotationId || '')}"><input type="hidden" name="requestId" value="${esc(b.requestId || '')}">` + UI.fields([
      { label: 'Client', name: 'clientId', type: 'select', options: M.opts.clients('Choose a client…'), value: b.clientId, required: true, full: true },
      { label: 'Event', name: 'eventType', type: 'select', options: L.EVENT_TYPES, value: b.eventType || 'Wedding' },
      { label: 'Status', name: 'status', type: 'select', options: [['tentative', 'Tentative'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']], value: b.status || 'confirmed' },
      { label: 'Date', name: 'date', type: 'date', value: b.date, required: true },
      { label: 'Start time', name: 'time', type: 'time', value: b.time },
      { label: 'Venue', name: 'venue', value: b.venue, full: true, placeholder: 'e.g. Serena Hotel, Kampala' },
      { label: 'Crew', name: 'crew', type: 'checks', options: Store.all('users').map((u) => [u.id, u.title ? `${u.name} (${u.title})` : u.name]), value: b.crew || [], full: true },
      { label: 'Notes', name: 'notes', type: 'textarea', value: b.notes, full: true, placeholder: 'Timings, contacts at the venue, special shots…' }
    ])
  });
  M.bookingForm = bookingForm;

  Object.assign(M.actions, {
    'booking-new': (el) => bookingForm({ clientId: el.dataset.client }),
    'booking-edit': (el) => bookingForm(Store.get('bookings', el.dataset.id)),
    'booking-status': (el) => {
      const b = Store.get('bookings', el.dataset.id);
      Store.save('bookings', Object.assign({}, b, { status: el.dataset.status }));
      UI.toast(`Booking ${el.dataset.status}`);
    },
    'booking-delete': (el) => {
      const id = el.dataset.id;
      if (Store.find('invoices', (i) => i.bookingId === id).length) return UI.toast('This booking has invoices. Cancel it instead of deleting.', 'warn');
      UI.confirm('Delete booking?', 'This removes the booking permanently. Cancelling keeps a record.', () => { Store.remove('bookings', id); M.go('bookings'); UI.toast('Booking deleted'); }, { label: 'Delete', danger: true });
    },
    'cal-month': (el) => { M.state.calMonth = el.dataset.m; M.render(); }
  });

  M.forms.booking = (d) => {
    if (!d.clientId) throw UI.invalid('clientId', 'Choose a client');
    const rec = { clientId: d.clientId, eventType: d.eventType, status: d.status, date: d.date, time: d.time, venue: d.venue, crew: d.crew || [], notes: d.notes };
    if (d.quotationId) rec.quotationId = d.quotationId;
    if (d.id) rec.id = d.id; else rec.number = L.nextNumber('bookings', 'BKG');
    const saved = Store.save('bookings', rec);
    if (d.quotationId) {
      const q = Store.get('quotations', d.quotationId);
      if (q) Store.save('quotations', Object.assign({}, q, { status: 'accepted', bookingId: saved.id }));
    }
    const clashes = L.clashes(saved);
    if (clashes.length) UI.toast(`Saved — heads up, ${clashes.length} other shoot${clashes.length > 1 ? 's' : ''} that day`, 'warn');
    else UI.toast(d.id ? 'Booking updated' : 'Booking created');
    if (d.requestId && M.afterRequestBooked) M.afterRequestBooked(d.requestId, saved);
    M.go('bookings/' + saved.id);
  };
})();
