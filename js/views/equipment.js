// Equipment register: what the studio owns, who has it, and its repair and
// service history.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money, icon } = UI;

  M.views.equipment = {
    title: 'Equipment',
    render(id) { return id ? detail(id) : list(); }
  };

  function list() {
    const all = Store.all('equipment').slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const f = UI.segVal('eq', 'all');
    const q = (M.state.q.eq || '').toLowerCase();
    const st = (e) => L.equipmentStatus(e);
    const n = (fn) => all.filter(fn).length;
    const filters = {
      all: (e) => st(e) !== 'retired',
      available: (e) => st(e) === 'available',
      out: (e) => ['out', 'overdue-return'].includes(st(e)),
      attention: (e) => L.needsAttention(e),
      retired: (e) => st(e) === 'retired'
    };
    let list = all.filter(filters[f] || filters.all);
    if (q) list = list.filter((e) => [e.code, e.name, e.category, e.serial, e.location].join(' ').toLowerCase().includes(q));
    const value = L.sum(all.filter((e) => st(e) !== 'retired'), (e) => e.purchaseValue);
    return `
      ${UI.pageHead('Equipment', `${n(filters.all)} items${M.isAdmin() ? ` · ${money(value)} purchase value` : ''}`,
        (M.isAdmin() ? UI.btn('Add item', 'eq-new', { icon: 'plus' }) : '') + UI.btn('Check out', 'checkout-new', { kind: 'primary', icon: 'arrowOut' }))}
      <div class="toolbar">
        ${UI.seg('eq', [['all', 'All', n(filters.all)], ['available', 'Available', n(filters.available)], ['out', 'Checked out', n(filters.out)], ['attention', 'Needs attention', n(filters.attention)], ['retired', 'Retired']], 'all')}
        ${UI.search('eq', 'Search name, code, serial or location')}
      </div>
      <div class="card">${list.length ? `<div class="list">${list.map((e) => {
        const co = L.openCheckout(e.id);
        const s = st(e);
        return UI.row({
          href: '#/equipment/' + e.id, lead: UI.tile('camera', s === 'available'), title: esc(e.name),
          badge: L.serviceDue(e) ? UI.pill('service-due') : '',
          sub: `${esc(e.code)} · ${esc(e.category)}${co ? ` · with ${esc(L.userName(co.userId))}` : ''}`,
          rightSub: UI.pill(s)
        });
      }).join('')}</div>` : UI.empty('camera', 'Nothing here', all.length ? '' : 'Add your cameras, lenses, drones and lights to track who has them.', M.isAdmin() && !all.length ? UI.btn('Add item', 'eq-new', { kind: 'primary', icon: 'plus' }) : '')}</div>`;
  }

  function detail(id) {
    const e = Store.get('equipment', id);
    if (!e) return UI.empty('camera', 'Item not found', '', UI.btn('Back', '', { href: '#/equipment' }));
    const st = L.equipmentStatus(e);
    const co = L.openCheckout(id);
    const history = Store.find('checkouts', (c) => c.equipmentId === id).sort((a, b) => b.outAt.localeCompare(a.outAt));
    const log = Store.find('maintenance', (m) => m.equipmentId === id).sort((a, b) => b.date.localeCompare(a.date));
    const actions = [
      co ? UI.btn('Check in', 'checkin', { kind: 'primary', icon: 'arrowIn', data: { id: co.id } }) : '',
      !co && st !== 'retired' ? UI.btn('Check out', 'checkout-new', { kind: 'primary', icon: 'arrowOut', data: { eq: id } }) : '',
      UI.btn('Log service / repair', 'maint-new', { icon: 'wrench', data: { eq: id } }),
      M.isAdmin() ? UI.btn('Edit', 'eq-edit', { icon: 'edit', data: { id } }) : ''
    ].join('');
    const booking = co && co.bookingId && Store.get('bookings', co.bookingId);
    return `
      ${UI.pageHead(`${esc(e.name)} ${UI.pill(st)}`, `${esc(e.code)} · ${esc(e.category)}${e.serial ? ' · ' + esc(e.serial) : ''}`, actions, { href: '#/equipment', label: 'Equipment' })}
      ${co ? `<div class="notice ${st === 'overdue-return' ? '' : 'info'}">${icon(st === 'overdue-return' ? 'alert' : 'arrowOut', 18)}<div>
        With <strong>${esc(L.userName(co.userId))}</strong> since ${UI.date(co.outAt)}${booking ? ` for <a class="link" href="#/bookings/${booking.id}">${esc(L.bookingTitle(booking))}</a>` : ''}.
        ${co.dueBack ? `Due back ${UI.date(co.dueBack)}${st === 'overdue-return' ? ` — ${L.daysBetween(co.dueBack, L.today())} days late` : ''}.` : ''}</div></div>` : ''}
      ${L.serviceDue(e) ? `<div class="notice">${icon('wrench', 18)}<div>Service due ${UI.date(e.nextServiceDate)}.</div></div>` : ''}
      ${L.warrantyEnding(e) ? `<div class="notice">${icon('alert', 18)}<div>Warranty ends ${UI.date(e.warrantyExpiry)}.</div></div>` : ''}
      <div class="split">
        <div class="stack">
          ${UI.card('Service & repair log', log.length ? `<div class="list">${log.map((m) => UI.row({
            lead: UI.tile('wrench', m.type === 'service'), title: esc(m.description), badge: UI.pill(m.type === 'repair' ? 'needs-repair' : 'available', m.type === 'repair' ? 'Repair' : 'Service'),
            sub: `${UI.date(m.date)}${m.vendor ? ' · ' + esc(m.vendor) : ''}`, right: M.isAdmin() && m.cost ? money(m.cost) : ''
          })).join('')}</div>` : UI.emptySm('No services or repairs logged.'))}
          ${UI.card('Check-out history', history.length ? `<div class="list">${history.map((c) => {
            const b = c.bookingId && Store.get('bookings', c.bookingId);
            return UI.row({
              lead: L.userAvatar(c.userId), title: esc(L.userName(c.userId)),
              sub: `${UI.dateShort(c.outAt)} → ${c.inAt ? UI.dateShort(c.inAt) : 'not returned'}${b ? ' · ' + esc(L.bookingTitle(b)) : c.note ? ' · ' + esc(c.note) : ''}`,
              rightSub: c.inAt ? (c.conditionIn ? esc(L.conditionLabel(c.conditionIn)) : 'Returned') : UI.pill('out')
            });
          }).join('')}</div>` : UI.emptySm('Never checked out.'))}
        </div>
        ${UI.card('Details', `<div class="card-body"><dl class="dl">
          <dt>Condition</dt><dd>${esc(L.conditionLabel(e.condition))}</dd>
          <dt>Serial number</dt><dd>${esc(e.serial || '—')}</dd>
          <dt>Location</dt><dd>${esc(e.location || '—')}</dd>
          <dt>Warranty ends</dt><dd>${UI.date(e.warrantyExpiry)}</dd>
          <dt>Bought</dt><dd>${UI.date(e.purchaseDate)}</dd>
          ${M.isAdmin() ? `<dt>Purchase value</dt><dd class="num">${money(e.purchaseValue)}</dd>
          <dt>Spent on upkeep</dt><dd class="num">${money(L.sum(log, (m) => m.cost))}</dd>` : ''}
          <dt>Next service</dt><dd>${UI.date(e.nextServiceDate)}</dd>
        </dl>${e.notes ? `<p class="muted" style="margin:16px 0 0;white-space:pre-line">${esc(e.notes)}</p>` : ''}</div>`)}
      </div>`;
  }

  const eqForm = (e = {}) => UI.modal({
    title: e.id ? `Edit ${e.code}` : 'Add equipment', form: 'eq',
    body: `<input type="hidden" name="id" value="${esc(e.id || '')}">` + UI.fields([
      { label: 'Name', name: 'name', value: e.name, required: true, full: true, placeholder: 'e.g. Sony A7 IV' },
      { label: 'Category', name: 'category', type: 'select', options: L.EQ_CATEGORIES, value: e.category || 'Camera' },
      { label: 'Asset code', name: 'code', value: e.code || L.nextEquipmentCode(), required: true },
      { label: 'Serial number', name: 'serial', value: e.serial },
      { label: 'Condition', name: 'condition', type: 'select', options: L.CONDITIONS, value: e.condition || 'good' },
      { label: 'Location', name: 'location', value: e.location, placeholder: 'e.g. Studio cabinet' },
      { label: 'Warranty ends', name: 'warrantyExpiry', type: 'date', value: e.warrantyExpiry },
      { label: 'Purchase date', name: 'purchaseDate', type: 'date', value: e.purchaseDate },
      { label: 'Purchase value (UGX)', name: 'purchaseValue', type: 'number', value: e.purchaseValue },
      { label: 'Next service date', name: 'nextServiceDate', type: 'date', value: e.nextServiceDate, hint: 'Merit flags it two weeks before.' },
      { label: 'Notes', name: 'notes', type: 'textarea', value: e.notes, full: true }
    ])
  });

  const availableOptions = () => Store.all('equipment')
    .filter((e) => L.equipmentStatus(e) === 'available' || (L.equipmentStatus(e) === 'needs-repair' && !L.openCheckout(e.id)))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((e) => [e.id, `${e.code} — ${e.name}${e.condition === 'needs-repair' ? ' (needs repair)' : ''}`]);

  Object.assign(M.actions, {
    'eq-new': () => eqForm(),
    'eq-edit': (el) => eqForm(Store.get('equipment', el.dataset.id)),
    'checkout-new': (el) => {
      const opts = availableOptions();
      if (!opts.length) return UI.toast('No equipment is available right now.', 'warn');
      const b = el.dataset.booking && Store.get('bookings', el.dataset.booking);
      UI.modal({
        title: 'Check out equipment', form: 'checkout', submit: 'Check out',
        body: UI.fields([
          el.dataset.eq ? `<input type="hidden" name="equipmentIds[]" value="${esc(el.dataset.eq)}">`
            : { label: 'Items', name: 'equipmentIds', type: 'checks', options: opts, full: true },
          { label: 'Given to', name: 'userId', type: 'select', options: M.opts.users(), value: M.user.id },
          { label: 'For shoot', name: 'bookingId', type: 'select', options: M.opts.bookings(null, 'Not for a shoot'), value: b ? b.id : '' },
          { label: 'Date out', name: 'outAt', type: 'date', value: L.today(), required: true },
          { label: 'Due back', name: 'dueBack', type: 'date', after: 'outAt', value: b && b.date >= L.today() ? L.addDays(b.date, 1) : L.addDays(L.today(), 2), required: true },
          { label: 'Note', name: 'note', full: true, placeholder: 'Batteries, cards, bag…' }
        ])
      });
    },
    checkin: (el) => {
      const co = Store.get('checkouts', el.dataset.id);
      const e = Store.get('equipment', co.equipmentId);
      UI.modal({
        title: `Check in ${e.name}`, form: 'checkin', submit: 'Check in',
        body: `<input type="hidden" name="id" value="${esc(co.id)}">` + UI.fields([
          { label: 'Date returned', name: 'inAt', type: 'date', value: L.today(), required: true },
          { label: 'Condition now', name: 'conditionIn', type: 'select', options: L.CONDITIONS.filter((c) => c[0] !== 'retired'), value: e.condition === 'needs-repair' ? 'needs-repair' : 'good' },
          { label: 'Note', name: 'note', full: true, placeholder: 'Any damage, missing parts…' }
        ])
      });
    },
    'maint-new': (el) => {
      const e = Store.get('equipment', el.dataset.eq);
      UI.modal({
        title: `Service / repair — ${e.name}`, form: 'maint',
        body: `<input type="hidden" name="equipmentId" value="${esc(e.id)}">` + UI.fields([
          { label: 'Type', name: 'type', type: 'select', options: [['service', 'Service'], ['repair', 'Repair']], value: 'service' },
          { label: 'Date', name: 'date', type: 'date', value: L.today(), required: true },
          { label: 'What was done', name: 'description', required: true, full: true, placeholder: 'e.g. Sensor clean, replaced gimbal motor' },
          { label: 'Done by', name: 'vendor', placeholder: 'Technician or shop' },
          { label: 'Cost (UGX)', name: 'cost', type: 'number', value: '' },
          { label: 'Condition now', name: 'condition', type: 'select', options: L.CONDITIONS, value: e.condition },
          { label: 'Next service date', name: 'nextServiceDate', type: 'date', value: e.nextServiceDate },
          M.isAdmin() ? { label: '', name: 'addExpense', type: 'checkbox', value: true, checkLabel: 'Record the cost under Expenses', full: true } : `<div class="field full"><div class="hint">Need money for this repair? Submit a requisition so an admin can pay it.</div></div>`
        ])
      });
    }
  });

  M.forms.eq = (d) => {
    const code = d.code.toUpperCase();
    if (Store.all('equipment').some((e) => e.code === code && e.id !== d.id)) throw UI.invalid('code', `${code} is already used by another item`);
    const rec = { name: d.name, category: d.category, code, serial: d.serial, location: d.location, warrantyExpiry: d.warrantyExpiry, condition: d.condition, purchaseDate: d.purchaseDate, purchaseValue: Number(d.purchaseValue) || 0, nextServiceDate: d.nextServiceDate, notes: d.notes };
    if (d.id) rec.id = d.id;
    const saved = Store.save('equipment', rec);
    UI.toast(d.id ? 'Item updated' : `${code} added`);
    if (!d.id) M.go('equipment/' + saved.id);
  };
  M.forms.checkout = (d) => {
    const ids = d.equipmentIds || [];
    if (!ids.length) throw UI.invalid('equipmentIds[]', 'Choose at least one item');
    if (d.dueBack < d.outAt) throw UI.invalid('dueBack', 'Due back is before the date out');
    ids.forEach((eid) => {
      if (L.openCheckout(eid)) throw UI.invalid('equipmentIds[]', `${Store.get('equipment', eid).name} is already checked out`);
    });
    ids.forEach((eid) => Store.save('checkouts', { equipmentId: eid, userId: d.userId, bookingId: d.bookingId, outAt: d.outAt, dueBack: d.dueBack, inAt: '', note: d.note }));
    UI.toast(`${ids.length} item${ids.length > 1 ? 's' : ''} checked out to ${L.userName(d.userId)}`);
  };
  M.forms.checkin = (d) => {
    const co = Store.get('checkouts', d.id);
    if (d.inAt < co.outAt) throw UI.invalid('inAt', `Return date can't be before the date out (${UI.date(co.outAt)})`);
    Store.save('checkouts', Object.assign({}, co, { inAt: d.inAt, conditionIn: d.conditionIn, note: [co.note, d.note].filter(Boolean).join(' · ') }));
    const e = Store.get('equipment', co.equipmentId);
    Store.save('equipment', Object.assign({}, e, { condition: d.conditionIn }));
    UI.toast(`${e.name} checked in`);
  };
  M.forms.maint = (d) => {
    const e = Store.get('equipment', d.equipmentId);
    const cost = Math.round(Number(d.cost) || 0);
    const m = Store.save('maintenance', { equipmentId: e.id, type: d.type, date: d.date, description: d.description, vendor: d.vendor, cost });
    Store.save('equipment', Object.assign({}, e, { condition: d.condition, nextServiceDate: d.nextServiceDate }));
    if (cost > 0 && M.isAdmin() && d.addExpense) {
      Store.save('expenses', { date: d.date, category: 'Maintenance', description: `${d.type === 'repair' ? 'Repair' : 'Service'} — ${e.name}: ${d.description}`, amount: cost, method: 'cash', maintenanceId: m.id });
    }
    UI.toast('Logged');
  };
})();
