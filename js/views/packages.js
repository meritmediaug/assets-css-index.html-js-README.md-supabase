// Packages (with public booking links) and the booking-requests inbox.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  const waNumber = () => String(L.company().phone || '').replace(/\D/g, '');
  const shareText = (pkg) => `${pkg ? pkg.name + ' — ' : ''}Book ${L.company().shortName || L.company().name} here: ${L.bookingLink(pkg)}`;

  // ====================== Packages ======================
  M.views.packages = {
    title: 'Packages',
    admin: true,
    render() {
      const list = L.packages();
      const missing = M.RATE_CARD.packages.filter((p) => !list.some((x) => x.slug === p.slug));
      const cats = M.CATEGORIES.filter((c) => list.some((p) => (p.category || 'Other') === c));
      const linkRow = (label, url, text) => `
        <div class="link-row">
          <div class="link-row-main"><div class="link-row-label" style="margin:0">${esc(label)}</div></div>
          <div class="link-actions" style="margin-top:0">
            ${UI.btn('Copy link', 'copy-link', { size: 'sm', icon: 'copy', data: { url } })}
            <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${icon('phone', 15, 2)}WhatsApp</a>
          </div>
        </div>`;
      return `
        ${UI.pageHead('Packages', 'Share a booking link for each package. Clients pick a date and send you a request — no login needed.',
          UI.btn('New package', 'pkg-edit', { kind: 'primary', icon: 'plus' }))}
        ${missing.length ? `<div class="notice info" style="align-items:center">${icon('box', 18)}<div style="flex:1">${list.length ? `${missing.length} of your rate-card packages aren't in Merit yet.` : 'Load your wedding, introduction, livestreaming and school rate cards in one click — 12 packages plus the 5 livestream add-ons.'}</div>
          ${UI.btn(`Add our rate-card packages (${missing.length})`, 'rate-card-import', { kind: 'primary', size: 'sm' })}</div>` : ''}
        ${list.length ? UI.card('Booking links to share', `<div class="card-body">
            ${linkRow('All packages', L.bookingLink(), shareText())}
            ${cats.map((c) => linkRow(c + ' only', L.categoryLink(c), `${c} packages — book ${L.company().shortName || L.company().name} here: ${L.categoryLink(c)}`)).join('')}
            <div class="hint" style="margin-top:10px">Put a link in your Instagram bio, WhatsApp status or a message to a school. Each package below also has its own link.</div>
          </div>`) : ''}
        ${list.length ? cats.map((c) => `<h2 class="group-h">${esc(c)}</h2><div class="pkg-grid">${list.filter((p) => (p.category || 'Other') === c).map(pkgCard).join('')}</div>`).join('')
          : `<div class="card section-gap">${UI.empty('box', 'No packages yet', 'Add your rate-card packages above, or create your own.', UI.btn('New package', 'pkg-edit', { kind: 'primary', icon: 'plus' }))}</div>`}`;
    }
  };

  function pkgCard(p) {
    const link = L.bookingLink(p);
    const requests = Store.find('requests', (r) => r.packageId === p.id).length;
    return `<section class="card pkg-card${p.active === false ? ' off' : ''}">
      <div class="card-body">
        <h3 style="font-size:18px;font-weight:600;letter-spacing:-0.015em">${esc(p.name)}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">
          ${p.active === false ? UI.pill('void', 'Hidden') : UI.pill('available', 'Live')}${p.badge ? UI.pill('gold', p.badge) : ''}
          <span class="muted" style="font-size:13px">${esc(p.eventType || '')}${requests ? ` · ${requests} request${requests === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="pkg-price">${p.price ? money(p.price) : 'Price on request'}</div>
        ${p.priceNote ? `<div class="faint" style="font-size:12.5px;margin-top:2px">${esc(p.priceNote)}</div>` : ''}
        ${p.description ? `<p class="muted" style="margin:8px 0 0;font-size:14px">${esc(p.description)}</p>` : ''}
        ${(p.includes || []).length ? `<ul class="pkg-includes">${p.includes.map((i) => `<li>${icon('check', 14, 2)}${esc(i)}</li>`).join('')}</ul>` : ''}
        <div class="link-actions" style="margin-top:16px">
          ${UI.btn('Copy link', 'copy-link', { size: 'sm', icon: 'copy', data: { url: link } })}
          <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(shareText(p))}" target="_blank" rel="noopener">${icon('phone', 15, 2)}WhatsApp</a>
          ${UI.btn('Edit', 'pkg-edit', { size: 'sm', kind: 'ghost', icon: 'edit', data: { id: p.id } })}
        </div>
      </div>
    </section>`;
  }

  const pkgForm = (p = {}) => UI.modal({
    title: p.id ? `Edit ${p.name}` : 'New package', form: 'pkg', wide: true,
    foot: `${p.id ? `<button type="button" class="btn danger left" data-act="pkg-delete" data-id="${esc(p.id)}">Delete</button>` : ''}<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">Save package</button>`,
    body: `<input type="hidden" name="id" value="${esc(p.id || '')}">` + UI.fields([
      { label: 'Package name', name: 'name', value: p.name, required: true, placeholder: 'e.g. Wedding — Basic' },
      { label: 'Category', name: 'category', type: 'select', options: M.CATEGORIES, value: p.category || 'Weddings' },
      { label: 'Price (UGX)', name: 'price', type: 'number', value: p.price, hint: 'Leave empty to show "Price on request".' },
      { label: 'Price note', name: 'priceNote', value: p.priceNote, placeholder: 'e.g. Per term (3 months)' },
      { label: 'Event type', name: 'eventType', type: 'select', options: L.EVENT_TYPES, value: p.eventType || 'Wedding' },
      { label: 'Badge (optional)', name: 'badge', value: p.badge, placeholder: 'e.g. Recommended' },
      { label: 'Order on the booking page', name: 'order', type: 'number', value: p.order ?? (L.packages().length + 1) },
      { label: 'Short description', name: 'description', type: 'textarea', value: p.description, full: true, placeholder: 'One or two sentences clients will see.' },
      { label: "What's included (one per line)", name: 'includes', type: 'textarea', value: (p.includes || []).join('\n'), full: true, placeholder: 'Photography — full day\nTwo-camera videography\nHighlight film' },
      { label: '', name: 'active', type: 'checkbox', value: p.active !== false, checkLabel: 'Live — show on the booking page', full: true }
    ])
  });

  Object.assign(M.actions, {
    'pkg-edit': (el) => pkgForm(el.dataset.id ? Store.get('packages', el.dataset.id) : {}),
    'pkg-delete': (el) => {
      const p = Store.get('packages', el.dataset.id);
      UI.confirm(`Delete ${p.name}?`, 'Its booking link will stop working. Requests already received are kept. To pause it instead, untick "Live".', () => {
        Store.remove('packages', p.id); UI.toast('Package deleted');
      }, { label: 'Delete', danger: true });
    },
    'rate-card-import': () => {
      const have = new Set(Store.all('packages').map((p) => p.slug));
      const pk = M.RATE_CARD.packages.filter((p) => !have.has(p.slug));
      pk.forEach((p) => Store.save('packages', Object.assign({ active: true }, p)));
      const names = new Set(Store.all('items').map((i) => i.name.toLowerCase()));
      const add = M.RATE_CARD.addons.filter((a) => !names.has(a.name.toLowerCase()));
      add.forEach((a) => Store.save('items', Object.assign({}, a)));
      UI.toast(`${pk.length} packages added${add.length ? ` and ${add.length} add-ons in the price list` : ''}`);
    },
    'copy-link': async (el) => {
      const url = el.dataset.url;
      try { await navigator.clipboard.writeText(url); UI.toast('Link copied — paste it anywhere'); }
      catch (e) { UI.modal({ title: 'Copy this link', body: `<input class="input" value="${esc(url)}" readonly onfocus="this.select()">` }); }
    }
  });

  M.forms.pkg = (d) => {
    const includes = String(d.includes || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const existing = d.id ? Store.get('packages', d.id) : null;
    let slug = existing ? existing.slug : L.slugify(d.name);
    if (!existing) { const base = slug; let n = 2; while (Store.all('packages').some((p) => p.slug === slug)) slug = `${base}-${n++}`; }
    const rec = { name: d.name, category: d.category, price: Math.round(Number(d.price) || 0), priceNote: d.priceNote, badge: d.badge, eventType: d.eventType, order: Number(d.order) || 0, description: d.description, includes, active: !!d.active, slug };
    if (d.id) rec.id = d.id;
    Store.save('packages', rec);
    UI.toast(d.id ? 'Package updated' : 'Package created — its booking link is ready');
  };

  // ====================== Requests ======================
  M.views.requests = {
    title: 'Booking requests',
    admin: true,
    render() {
      const all = Store.all('requests').slice().sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
      const f = UI.segVal('rq', 'new');
      const n = (s) => all.filter((r) => r.status === s).length;
      const list = f === 'all' ? all : all.filter((r) => r.status === f);
      return `
        ${UI.pageHead('Booking requests', 'Requests clients send from your package booking links.', UI.btn('Packages & links', '', { href: '#/packages', icon: 'box' }))}
        <div class="toolbar">${UI.seg('rq', [['new', 'New', n('new')], ['accepted', 'Accepted'], ['declined', 'Declined'], ['all', 'All']], 'new')}</div>
        <div class="card">${list.length ? `<div class="list">${list.map((r) => {
          const taken = Store.find('bookings', (b) => b.date === r.date && b.status !== 'cancelled').length;
          return UI.row({
            act: 'req-open', data: { id: r.id }, lead: UI.dateTile(r.date), title: esc(r.name),
            badge: taken && r.status === 'new' ? UI.pill('overdue', 'Date taken') : '',
            sub: `${esc(r.packageName || 'General enquiry')} · ${esc(r.phone || '')}`,
            right: r.packagePrice ? money(r.packagePrice) : '', rightSub: UI.pill(r.status === 'new' ? 'pending' : r.status === 'accepted' ? 'accepted' : 'declined', r.status === 'new' ? 'New' : '')
          });
        }).join('')}</div>` : UI.empty('calendar', f === 'new' ? 'No new requests' : 'Nothing here', 'Share your package links from the Packages page — requests land here.', UI.btn('Packages & links', '', { href: '#/packages', kind: 'primary' }))}</div>`;
    }
  };

  Object.assign(M.actions, {
    'req-open': (el) => {
      const r = Store.get('requests', el.dataset.id);
      const taken = Store.find('bookings', (b) => b.date === r.date && b.status !== 'cancelled');
      const tel = String(r.phone || '').replace(/[^\d+]/g, '');
      const wa = tel.replace(/^\+/, '').replace(/^0/, '256');
      UI.modal({
        title: r.name,
        body: `${taken.length && r.status === 'new' ? `<div class="notice">${icon('alert', 18)}<div>You already have ${taken.length} shoot${taken.length > 1 ? 's' : ''} on ${UI.date(r.date)}: ${taken.map((b) => esc(L.bookingTitle(b))).join(', ')}.</div></div>` : ''}
          <dl class="dl">
            <dt>Package</dt><dd>${esc(r.packageName || 'General enquiry')}${r.packagePrice ? ' · ' + money(r.packagePrice) : ''}</dd>
            <dt>Event</dt><dd>${esc(r.eventType || '—')}</dd>
            <dt>Date</dt><dd>${UI.weekday(r.date)} ${UI.dateLong(r.date)}</dd>
            <dt>Venue</dt><dd>${esc(r.venue || '—')}</dd>
            <dt>Phone</dt><dd>${tel ? `<a class="link" href="tel:${esc(tel)}">${esc(r.phone)}</a>` : '—'}</dd>
            <dt>Email</dt><dd>${r.email ? `<a class="link" href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '—'}</dd>
            <dt>Sent</dt><dd>${r.submittedAt ? UI.date(L.isoOf(new Date(r.submittedAt))) : '—'}</dd>
          </dl>
          ${r.notes ? `<p class="muted" style="white-space:pre-line;margin:16px 0 4px">${esc(r.notes)}</p>` : ''}`,
        foot: `${tel ? `<a class="btn left" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icon('phone', 15, 2)}WhatsApp</a>` : ''}
          ${r.status === 'new' ? `<button type="button" class="btn danger" data-act="request-decline" data-id="${esc(r.id)}">Decline</button>
          <button type="button" class="btn primary" data-act="request-accept" data-id="${esc(r.id)}">${icon('check', 15, 2)}Accept & book</button>`
            : `<button type="button" class="btn" data-act="modal-close">Close</button>`}`
      });
    },
    'request-decline': (el) => {
      const r = Store.get('requests', el.dataset.id);
      Store.save('requests', Object.assign({}, r, { status: 'declined', decidedAt: L.today(), decidedBy: M.user.id }));
      UI.closeModal(); UI.toast('Request declined');
    },
    'request-accept': (el) => {
      const r = Store.get('requests', el.dataset.id);
      // Reuse the client if the phone number matches; otherwise add them.
      let client = r.phone ? Store.all('clients').find((c) => c.phone && L.phoneKey(c.phone) === L.phoneKey(r.phone)) : null;
      if (!client) client = Store.save('clients', { name: r.name, phone: r.phone, email: r.email, location: r.venue, notes: 'Came in through the booking link.' });
      UI.closeModal();
      M.bookingForm({ clientId: client.id, eventType: r.eventType || 'Wedding', date: r.date, venue: r.venue, status: 'confirmed', notes: r.notes, requestId: r.id });
    }
  });

  // Called by the booking form once a booking made from a request is saved.
  M.afterRequestBooked = (requestId, booking) => {
    const r = Store.get('requests', requestId);
    if (!r) return;
    Store.save('requests', Object.assign({}, r, { status: 'accepted', bookingId: booking.id, decidedAt: L.today(), decidedBy: M.user.id }));
    const pkg = r.packageId && Store.get('packages', r.packageId);
    if (pkg && pkg.price) {
      const q = Store.save('quotations', {
        number: L.nextNumber('quotations', 'QUO'), clientId: booking.clientId, date: L.today(),
        validUntil: L.addDays(L.today(), Number(L.company().quoteValidDays) || 14),
        lines: [{ name: pkg.name, description: (pkg.includes || []).join(', '), qty: 1, price: pkg.price }],
        discount: 0, vat: !!L.company().vatDefault, vatRate: Number(L.company().vatRate) || 18, notes: '', status: 'draft', bookingId: booking.id
      });
      Store.save('bookings', Object.assign({}, booking, { quotationId: q.id }));
      UI.toast(`Booked — draft quotation ${q.number} is ready to send`);
    }
  };
})();
