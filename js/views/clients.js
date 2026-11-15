// Clients — contacts, history, and what each client owes.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  M.views.clients = {
    title: 'Clients',
    render(id) { return id ? detail(id) : list(); }
  };

  function list() {
    const q = (M.state.q.clients || '').toLowerCase();
    const dupes = L.duplicateIds();
    let cs = Store.all('clients').slice().sort((a, b) => a.name.localeCompare(b.name));
    const total = cs.length;
    if (q) cs = cs.filter((c) => [c.name, c.phone, c.email, c.location].join(' ').toLowerCase().includes(q));
    const rows = cs.map((c) => {
      const s = L.clientStats(c.id);
      return UI.row({
        href: '#/clients/' + c.id, lead: UI.avatar(c.name), title: esc(c.name),
        badge: dupes.has(c.id) ? UI.pill('service-due', 'Possible duplicate') : '',
        sub: [c.phone, c.location].filter(Boolean).map(esc).join(' · ') || '<span class="faint">No contact details</span>',
        right: M.isAdmin() && s.outstanding ? money(s.outstanding) : '',
        rightSub: (M.isAdmin() && s.outstanding ? 'owed · ' : '') + `${s.bookings} booking${s.bookings === 1 ? '' : 's'}`
      });
    }).join('');
    return `
      ${UI.pageHead('Clients', `${total} client${total === 1 ? '' : 's'}`, UI.btn('New client', 'client-new', { kind: 'primary', icon: 'plus' }))}
      ${dupes.size ? `<div class="notice">${icon('alert', 18)}<div>${dupes.size} clients look like duplicates (same name or phone). Open them to merge or tidy up.</div></div>` : ''}
      <div class="toolbar">${UI.search('clients', 'Search name, phone or location')}</div>
      <div class="card">${rows ? `<div class="list">${rows}</div>` : (total ? UI.emptySm('No clients match your search.') : UI.empty('users', 'No clients yet', 'Add your first client to start quoting and booking.', UI.btn('New client', 'client-new', { kind: 'primary', icon: 'plus' })))}</div>`;
  }

  function detail(id) {
    const c = Store.get('clients', id);
    if (!c) return UI.empty('users', 'Client not found', '', UI.btn('Back to clients', '', { href: '#/clients' }));
    const s = L.clientStats(id);
    const bookings = Store.find('bookings', (b) => b.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
    const dupes = L.duplicateIds();
    const similar = dupes.has(id) ? Store.all('clients').filter((o) => o.id !== id && dupes.has(o.id)) : [];
    const admin = M.isAdmin();

    let money_ = '';
    if (admin) {
      const quotes = Store.find('quotations', (q) => q.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
      const invoices = Store.find('invoices', (i) => i.clientId === id).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
      money_ = `
        ${UI.card('Invoices', invoices.length ? `<div class="list">${invoices.map((i) => UI.row({
          href: '#/invoices/' + i.id, lead: UI.tile('invoice'), title: esc(i.number), sub: `Issued ${UI.date(i.issueDate)}`,
          right: money(L.totals(i).total), rightSub: UI.pill(L.invoiceStatus(i))
        })).join('')}</div>` : UI.emptySm('No invoices yet.'), { action: UI.btn('New invoice', 'invoice-new', { size: 'sm', icon: 'plus', data: { client: id } }) })}
        ${UI.card('Quotations', quotes.length ? `<div class="list">${quotes.map((q) => UI.row({
          href: '#/quotations/' + q.id, lead: UI.tile('quote'), title: esc(q.number), sub: UI.date(q.date),
          right: money(L.totals(q).total), rightSub: UI.pill(L.quoteStatus(q))
        })).join('')}</div>` : UI.emptySm('No quotations yet.'), { action: UI.btn('New quotation', 'quote-new', { size: 'sm', icon: 'plus', data: { client: id } }) })}`;
    }

    return `
      ${UI.pageHead(esc(c.name), [c.phone, c.email, c.location].filter(Boolean).map(esc).join(' · '),
        UI.btn('Edit', 'client-edit', { icon: 'edit', data: { id } }) + UI.btn('New booking', 'booking-new', { kind: 'primary', icon: 'plus', data: { client: id } }),
        { href: '#/clients', label: 'Clients' })}
      ${similar.length ? `<div class="notice">${icon('alert', 18)}<div>Looks like a duplicate of ${similar.map((o) => `<a class="link" href="#/clients/${o.id}">${esc(o.name)}</a>`).join(', ')}.
        ${admin ? `<button class="link" data-act="client-merge" data-id="${id}" data-into="${similar[0].id}">Merge this into ${esc(similar[0].name)}</button>` : ''}</div></div>` : ''}
      ${admin ? `<div class="kpis three">
        <div class="kpi"><div class="kpi-label">Total billed</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(s.billed)}</div></div>
        <div class="kpi"><div class="kpi-label">Paid</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(s.paid)}</div></div>
        <div class="kpi accent"><div class="kpi-label">Outstanding</div><div class="kpi-value"><span class="cur">UGX</span>${UI.num(s.outstanding)}</div></div>
      </div>` : ''}
      <div class="split">
        <div class="stack">
          ${UI.card('Bookings', bookings.length ? `<div class="list">${bookings.map((b) => UI.row({
            href: '#/bookings/' + b.id, lead: UI.dateTile(b.date), title: esc(b.eventType), sub: esc(b.venue || 'Venue TBC'), rightSub: UI.pill(b.status)
          })).join('')}</div>` : UI.emptySm('No bookings yet.'))}
          ${money_}
        </div>
        ${UI.card('Details', `<div class="card-body"><dl class="dl">
          <dt>Phone</dt><dd>${c.phone ? `<a class="link" href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</dd>
          <dt>Email</dt><dd>${c.email ? `<a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
          <dt>Location</dt><dd>${esc(c.location || '—')}</dd>
          <dt>Client since</dt><dd>${c.createdAt ? UI.date(c.createdAt.slice(0, 10)) : '—'}</dd>
        </dl>${c.notes ? `<p class="muted" style="margin:16px 0 0;white-space:pre-line">${esc(c.notes)}</p>` : ''}</div>`,
          { foot: admin ? `<button class="link" style="color:var(--bad)" data-act="client-delete" data-id="${id}">Delete client</button>` : '' })}
      </div>`;
  }

  const clientForm = (c = {}) => UI.modal({
    title: c.id ? 'Edit client' : 'New client',
    form: 'client',
    body: `<input type="hidden" name="id" value="${esc(c.id || '')}">` + UI.fields([
      { label: 'Name', name: 'name', value: c.name, required: true, full: true, placeholder: 'e.g. Ivan & Eve' },
      { label: 'Phone', name: 'phone', type: 'tel', value: c.phone, placeholder: '07…' },
      { label: 'Email', name: 'email', type: 'email', value: c.email },
      { label: 'Location', name: 'location', value: c.location, full: true, placeholder: 'Kampala, Uganda' },
      { label: 'Notes', name: 'notes', type: 'textarea', value: c.notes, full: true }
    ])
  });

  Object.assign(M.actions, {
    'client-new': () => clientForm(),
    'client-edit': (el) => clientForm(Store.get('clients', el.dataset.id)),
    'client-delete': (el) => {
      const id = el.dataset.id;
      const linked = ['bookings', 'quotations', 'invoices', 'receipts'].some((col) => Store.find(col, (r) => r.clientId === id).length);
      if (linked) return UI.toast('This client has bookings or documents. Merge them into another client instead of deleting.', 'warn');
      UI.confirm('Delete client?', 'This removes the client permanently.', () => { Store.remove('clients', id); M.go('clients'); UI.toast('Client deleted'); }, { label: 'Delete', danger: true });
    },
    'client-merge': (el) => {
      const from = Store.get('clients', el.dataset.id), into = Store.get('clients', el.dataset.into);
      UI.confirm(`Merge into ${into.name}?`, `All bookings, quotations, invoices and receipts for "${from.name}" will move to "${into.name}", and "${from.name}" will be removed.`, () => {
        ['bookings', 'quotations', 'invoices', 'receipts'].forEach((col) => Store.find(col, (r) => r.clientId === from.id).forEach((r) => Store.save(col, Object.assign({}, r, { clientId: into.id }))));
        const merged = Object.assign({}, into);
        ['phone', 'email', 'location'].forEach((k) => { if (!merged[k] && from[k]) merged[k] = from[k]; });
        if (from.notes) merged.notes = [into.notes, from.notes].filter(Boolean).join('\n');
        Store.save('clients', merged);
        Store.remove('clients', from.id);
        M.go('clients/' + into.id);
        UI.toast('Clients merged');
      }, { label: 'Merge' });
    }
  });

  M.forms.client = (d) => {
    const rec = { name: d.name, phone: d.phone, email: d.email, location: d.location, notes: d.notes };
    if (d.id) rec.id = d.id;
    const saved = Store.save('clients', rec);
    UI.toast(d.id ? 'Client updated' : 'Client added');
    if (!d.id && !location.hash.startsWith('#/clients/')) M.go('clients/' + saved.id);
  };
})();
