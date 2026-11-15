// Settings: company details on documents, price list, team, and data tools.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, money } = UI;

  M.views.settings = {
    title: 'Settings',
    admin: true,
    render() {
      const co = L.company();
      const year = L.today().slice(0, 4);
      const nums = co.numbersYear === year ? Object.assign({ INV: 0, RCP: 0, QUO: 0, REQ: 0 }, co.lastNumbers) : { INV: 0, RCP: 0, QUO: 0, REQ: 0 };
      const items = Store.all('items').slice().sort((a, b) => a.name.localeCompare(b.name));
      const users = Store.all('users');
      const local = Store.mode === 'local';
      const sampleCount = ['clients', 'quotations', 'bookings', 'invoices', 'receipts', 'requisitions', 'expenses', 'equipment', 'checkouts', 'maintenance', 'users']
        .reduce((n, c) => n + Store.find(c, (r) => r.sample).length, 0);

      return `
        ${UI.pageHead('Settings', 'Company details, price list, team and data.')}
        <div class="split">
          <div class="stack">
            ${UI.card('Company details', `<form data-form="company" class="card-body" novalidate>${UI.fields([
              { label: 'Company name', name: 'name', value: co.name, required: true },
              { label: 'Short name (documents)', name: 'shortName', value: co.shortName },
              { label: 'Tagline', name: 'tagline', value: co.tagline, full: true },
              { label: 'Phone', name: 'phone', type: 'tel', value: co.phone },
              { label: 'Email', name: 'email', type: 'email', value: co.email },
              { label: 'Website', name: 'website', value: co.website },
              { label: 'Address', name: 'address', value: co.address },
              { label: 'Opening hours', name: 'hours', value: co.hours, full: true },
              { label: 'Extra footer line', name: 'travel', value: co.travel, full: true },
              { label: 'Thank-you line', name: 'thanks', value: co.thanks, full: true },
              `<div class="field full" style="margin-top:6px"><span class="field-label" style="color:var(--ink)">Bank details</span><div class="hint">Printed with the TIN on every invoice, quotation and receipt.</div></div>`,
              { label: 'Bank name', name: 'bankName', value: co.bankName, placeholder: 'e.g. Stanbic Bank Uganda' },
              { label: 'Branch', name: 'bankBranch', value: co.bankBranch, placeholder: 'e.g. Kisaasi' },
              { label: 'Account name', name: 'bankAccountName', value: co.bankAccountName, placeholder: 'e.g. Merit Media Limited' },
              { label: 'Account number', name: 'bankAccountNumber', value: co.bankAccountNumber, maxlength: 30, attrs: ' inputmode="numeric"' },
              { label: 'SWIFT code (optional)', name: 'bankSwift', value: co.bankSwift, maxlength: 11, placeholder: 'For payments from abroad' },
              { label: 'Mobile Money and other ways to pay', name: 'paymentDetails', type: 'textarea', value: co.paymentDetails, full: true, placeholder: 'MTN MoMo: 0772 000000 (Merit Media Limited)\nAirtel Money: …' },
              { label: 'Invoice due after (days)', name: 'invoiceDueDays', type: 'number', value: co.invoiceDueDays, attrs: ' max="365" step="1"' },
              { label: 'Quotation valid for (days)', name: 'quoteValidDays', type: 'number', value: co.quoteValidDays, attrs: ' max="365" step="1"' },
              `<div class="field full" style="margin-top:6px"><span class="field-label" style="color:var(--ink)">VAT</span><div class="hint">VAT is added on top of your prices when "Add VAT" is ticked on a quotation or invoice.</div></div>`,
              { label: 'TIN (shown on documents)', name: 'tin', value: co.tin, placeholder: 'e.g. 1000123456', maxlength: 20 },
              { label: 'VAT rate (%)', name: 'vatRate', type: 'number', value: co.vatRate, min: 0, attrs: ' max="100"' },
              { label: '', name: 'vatDefault', type: 'checkbox', value: !!co.vatDefault, checkLabel: 'Tick "Add VAT" by default on new quotations and invoices', full: true },
              `<div class="field full" style="margin-top:6px"><span class="field-label" style="color:var(--ink)">Numbering</span><div class="hint">The last numbers you issued before Merit, so new documents continue the sequence. ${esc(L.today().slice(0, 4))} only — numbering restarts at 0001 each year.</div></div>`,
              { label: 'Last invoice no. (INV)', name: 'lastINV', type: 'number', value: nums.INV },
              { label: 'Last receipt no. (RCP)', name: 'lastRCP', type: 'number', value: nums.RCP },
              { label: 'Last quotation no. (QUO)', name: 'lastQUO', type: 'number', value: nums.QUO },
              { label: 'Last requisition no. (REQ)', name: 'lastREQ', type: 'number', value: nums.REQ }
            ])}<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn primary" type="submit">Save details</button></div></form>`)}

            ${UI.card('Price list', items.length ? `<div class="list">${items.map((i) => UI.row({
              act: 'item-edit', data: { id: i.id }, lead: UI.tile('box'), title: esc(i.name), sub: esc(i.description || ''), right: money(i.price), rightSub: i.unit ? 'per ' + esc(i.unit) : ''
            })).join('')}</div>` : UI.emptySm('Add the services and products you sell.'),
              { action: UI.btn('Add', 'item-edit', { size: 'sm', icon: 'plus' }) })}
          </div>

          <div class="stack">
            ${UI.card('Team', `<div class="list">${users.map((u) => UI.row({
              act: 'user-edit', data: { id: u.id }, lead: UI.avatar(u.name, u.role === 'admin', u.photo), title: esc(u.name) + (u.id === M.user.id ? ' <span class="faint">(you)</span>' : ''), sub: [u.title, u.phone, u.email].filter(Boolean).map(esc).join(' · '), rightSub: UI.pill(u.role)
            })).join('')}</div>`, {
              action: local ? UI.btn('Add', 'user-edit', { size: 'sm', icon: 'plus' }) : '',
              foot: local ? '<span class="muted">Admins see everything. Staff see bookings, clients, equipment and their own requisitions — no money totals.</span>'
                : '<span class="muted">Invite people from Supabase → Authentication → Users. The first account becomes admin; everyone else joins as staff until you change their role here.</span>'
            })}

            ${UI.card('Data', `<div class="card-body" style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
              <div class="muted" style="font-size:14px">Stored ${local ? '<strong>in this browser only</strong>. Download a backup regularly, or connect Supabase so the team shares one database.' : 'in your Supabase database.'}</div>
              ${UI.btn('Download backup (JSON)', 'backup', { icon: 'download' })}
              <label class="btn">${UI.icon('users', 16, 2)}Import clients from CSV<input type="file" accept=".csv,text/csv" data-change="import-clients" hidden></label>
              <div class="hint" style="font-size:12.5px;color:var(--ink-3);margin-top:-4px">Columns: name, phone, email, location, notes (export from your old app or a spreadsheet). Names already in Merit are skipped.</div>
              ${local ? `<label class="btn">${UI.icon('upload', 16, 2)}Restore from backup<input type="file" accept="application/json,.json" data-change="restore" hidden></label>` : ''}
              ${sampleCount ? UI.btn(`Remove sample data (${sampleCount} records)`, 'remove-sample', { kind: 'danger', icon: 'trash' }) : ''}
              ${local ? UI.btn('Reset to sample data', 'reset-sample', { kind: 'ghost' }) : ''}
            </div>`)}
          </div>
        </div>`;
    }
  };

  M.forms.company = (d) => {
    const co = L.company();
    const lastNumbers = Object.assign({}, co.lastNumbers, {
      INV: Math.max(0, Math.round(Number(d.lastINV) || 0)), RCP: Math.max(0, Math.round(Number(d.lastRCP) || 0)),
      QUO: Math.max(0, Math.round(Number(d.lastQUO) || 0)), REQ: Math.max(0, Math.round(Number(d.lastREQ) || 0))
    });
    ['lastINV', 'lastRCP', 'lastQUO', 'lastREQ'].forEach((k) => delete d[k]);
    Store.save('settings', Object.assign({}, co, d, { id: 'company', invoiceDueDays: Number(d.invoiceDueDays) || 7, quoteValidDays: Number(d.quoteValidDays) || 14, vatRate: Number(d.vatRate) || 18, vatDefault: !!d.vatDefault, numbersYear: L.today().slice(0, 4), lastNumbers }));
    UI.toast('Company details saved');
  };

  Object.assign(M.actions, {
    'item-edit': (el) => {
      const i = el.dataset.id ? Store.get('items', el.dataset.id) : {};
      UI.modal({
        title: i.id ? 'Edit item' : 'Add to price list', form: 'item',
        foot: `${i.id ? `<button type="button" class="btn danger left" data-act="item-delete" data-id="${esc(i.id)}">Delete</button>` : ''}<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">Save</button>`,
        body: `<input type="hidden" name="id" value="${esc(i.id || '')}">` + UI.fields([
          { label: 'Name', name: 'name', value: i.name, required: true, full: true, placeholder: 'e.g. Drone coverage' },
          { label: 'Description', name: 'description', value: i.description, full: true },
          { label: 'Price (UGX)', name: 'price', type: 'number', value: i.price, required: true },
          { label: 'Per', name: 'unit', value: i.unit, placeholder: 'event, hour, book…' }
        ])
      });
    },
    'item-delete': (el) => { Store.remove('items', el.dataset.id); UI.closeModal(); UI.toast('Removed from price list'); },
    'user-edit': (el) => {
      const u = el.dataset.id ? Store.get('users', el.dataset.id) : {};
      M.profileForm(u, u.id && u.id === M.user.id);
    },
    backup: () => UI.download(`merit-backup-${L.today()}.json`, JSON.stringify(Store.exportAll(), null, 1), 'application/json'),
    'remove-sample': () => UI.confirm('Remove sample data?', 'Deletes every record marked as sample (example clients, shoots, payments, equipment). Records from your real invoice and receipt stay.', () => {
      const n = Store.removeWhere((r) => r.sample && r.id !== M.user.id);
      UI.toast(`${n} sample records removed`);
    }, { label: 'Remove', danger: true }),
    'reset-sample': () => UI.confirm('Reset everything?', 'All data in this browser is replaced with the sample data. Download a backup first if you need it.', () => {
      Store.resetToSample();
      if (!Store.get('users', M.user.id)) M.user = Store.get('users', 'u-admin');
      UI.toast('Reset to sample data');
    }, { label: 'Reset', danger: true })
  });

  M.forms.item = (d) => {
    const rec = { name: d.name, description: d.description, price: Math.round(Number(d.price) || 0), unit: d.unit };
    if (d.id) rec.id = d.id;
    Store.save('items', rec);
    UI.toast('Price list updated');
  };
  // Minimal CSV reader: handles quoted fields, commas and line breaks inside quotes.
  const parseCsv = (text) => {
    const rows = [];
    let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    // Spreadsheets in some regions export with ";" or tabs; pick whichever the header uses most.
    const first = text.split(/\r?\n/)[0];
    const delim = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  };
  const COLUMN_NAMES = {
    name: ['name', 'client', 'client name', 'full name', 'customer', 'names'],
    phone: ['phone', 'contact', 'mobile', 'tel', 'telephone', 'phone number', 'whatsapp'],
    email: ['email', 'e-mail', 'email address'],
    location: ['location', 'address', 'city', 'town', 'district', 'country'],
    notes: ['notes', 'note', 'comments', 'remarks']
  };

  M.live['import-clients'] = (el) => {
    const file = el.files && el.files[0];
    el.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result));
      if (rows.length < 2) return UI.toast('That file has no client rows', 'warn');
      const head = rows[0].map((h) => h.trim().toLowerCase());
      const col = {};
      Object.entries(COLUMN_NAMES).forEach(([k, names]) => { const i = head.findIndex((h) => names.includes(h)); if (i >= 0) col[k] = i; });
      if (col.name == null) return UI.toast('Could not find a "name" column in the first row', 'bad');
      const existing = new Set(Store.all('clients').map((c) => c.name.trim().toLowerCase()));
      const fresh = [];
      rows.slice(1).forEach((r) => {
        const get = (k) => (col[k] != null ? String(r[col[k]] || '').trim() : '');
        const name = get('name');
        if (!name || existing.has(name.toLowerCase())) return;
        existing.add(name.toLowerCase());
        fresh.push({ name, phone: get('phone'), email: get('email'), location: get('location'), notes: get('notes') });
      });
      const skipped = rows.length - 1 - fresh.length;
      if (!fresh.length) return UI.toast(`Nothing new to import (${skipped} already in Merit or blank)`, 'warn');
      UI.confirm(`Import ${fresh.length} client${fresh.length === 1 ? '' : 's'}?`,
        `${fresh.slice(0, 3).map((c) => c.name).join(', ')}${fresh.length > 3 ? '…' : ''}${skipped ? ` — ${skipped} row${skipped === 1 ? '' : 's'} skipped (already in Merit or blank).` : ''}`,
        () => { fresh.forEach((c) => Store.save('clients', c)); UI.toast(`${fresh.length} clients imported`); },
        { label: 'Import' });
    };
    reader.readAsText(file);
  };

  M.live.restore = (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        UI.confirm('Restore this backup?', 'Everything in this browser will be replaced by the backup.', () => {
          try {
            Store.importAll(data);
            M.user = Store.get('users', M.user.id) || Store.all('users').find((u) => u.role === 'admin') || null;
            UI.toast('Backup restored');
            M.render();
          } catch (e) { UI.toast(e.message, 'bad'); }
        }, { label: 'Restore' });
      } catch (e) { UI.toast('That file could not be read', 'bad'); }
    };
    reader.readAsText(file);
    el.value = '';
  };
})();
