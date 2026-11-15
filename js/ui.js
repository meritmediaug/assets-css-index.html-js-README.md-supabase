// Shared UI helpers: escaping, formatting, icons, modals, toasts, form fields.
(function () {
  const M = window.M = window.M || {};
  M.views = M.views || {};
  M.actions = M.actions || {};
  M.forms = M.forms || {};
  M.live = M.live || {};
  M.state = M.state || { q: {}, f: {} };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICONS = {
    dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    quote: '<path d="M7 3.5h7.5L19 8v12.5H7z"/><path d="M14 3.5V8h5M10 12.5h6M10 16h4"/><path d="M4 7v13.5h2"/>',
    invoice: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12h7M9 15.5h7M9 8.5h2.5"/>',
    receipt: '<path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
    request: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><path d="M4 10h16"/><path d="M8 15h3"/>',
    bank: '<path d="M4 9.5 12 5l8 4.5"/><path d="M5 19.5h14"/><path d="M7 10.5v6.5M12 10.5v6.5M17 10.5v6.5"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11.5" rx="2.5"/><circle cx="16" cy="13.75" r="1.2"/>',
    camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.6"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16v-4M11.5 16V7M16 16v-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>',
    back: '<path d="m14.5 6-6 6 6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    arrowOut: '<path d="M7 17 17 7M9 7h8v8"/>',
    arrowIn: '<path d="M17 7 7 17M15 17H7V9"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
    phone: '<path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2 4.3 1.7V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    box: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>'
  };
  const icon = (name, size = 18, sw = 1.6) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // The gold Merit triangle. Pages show it on a dark rounded tile with the name beside it.
  const logo = (size = 22) => `<img class="logo-mark" src="assets/logo-mark.png" width="${size}" height="${size}" alt="">`;

  // ---- Formatting ----
  const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
  const money = (n) => 'UGX ' + num(n);
  const moneyShort = (n) => {
    const v = Math.abs(Number(n) || 0);
    const s = n < 0 ? '−' : '';
    if (v >= 1e9) return s + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
    if (v >= 1e6) return s + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (v >= 1e3) return s + Math.round(v / 1e3) + 'K';
    return s + Math.round(v);
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parts = (iso) => { const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number); return { y, m, d }; };
  const date = (iso) => { if (!iso) return '—'; const p = parts(iso); return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`; };
  const dateLong = (iso) => { if (!iso) return '—'; const p = parts(iso); return `${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`; };
  const dateShort = (iso) => { if (!iso) return '—'; const p = parts(iso); return `${p.d} ${MONTHS[p.m - 1]}`; };
  const weekday = (iso) => { const p = parts(iso); return new Date(p.y, p.m - 1, p.d).toLocaleDateString('en-GB', { weekday: 'short' }); };
  const monthLabel = (key, long) => { const [y, m] = key.split('-').map(Number); return (long ? MONTHS_LONG : MONTHS)[m - 1] + (long ? ' ' + y : ''); };
  const initials = (name) => String(name || '?').replace(/&/g, ' ').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(dr|eng|mr|mrs|miss|ms|prof)\.?$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '•';

  // ---- Status pills ----
  const STATUS = {
    draft: ['Draft', ''], sent: ['Sent', 'info'], 'part-paid': ['Part-paid', 'warn'], paid: ['Paid', 'good'], overdue: ['Overdue', 'bad'], void: ['Void', ''],
    accepted: ['Accepted', 'good'], declined: ['Declined', ''], expired: ['Expired', ''],
    tentative: ['Tentative', ''], confirmed: ['Confirmed', 'gold'], completed: ['Completed', 'good'], cancelled: ['Cancelled', ''],
    pending: ['Awaiting approval', 'warn'], approved: ['Approved', 'info'], rejected: ['Rejected', 'bad'],
    available: ['Available', 'good'], out: ['Checked out', 'info'], 'overdue-return': ['Return overdue', 'bad'], 'needs-repair': ['Needs repair', 'bad'], retired: ['Retired', ''],
    'service-due': ['Service due', 'warn'], admin: ['Admin', 'gold'], staff: ['Staff', '']
  };
  const pill = (status, label) => { const s = STATUS[status] || [status, '']; return `<span class="pill ${s[1]}">${esc(label || s[0])}</span>`; };

  // ---- Building blocks ----
  const pageHead = (title, sub, actions = '', back = '') => `
    ${back ? `<a class="back" href="${back.href}">${icon('back', 16, 2)}${esc(back.label)}</a>` : ''}
    <div class="page-head">
      <div><div class="title-row"><h1>${title}</h1></div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;

  const btn = (label, act, opts = {}) => {
    const attrs = Object.entries(opts.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    const cls = ['btn', opts.kind || '', opts.size || ''].join(' ').trim();
    const inner = (opts.icon ? icon(opts.icon, 16, 2) : '') + esc(label);
    if (opts.href) return `<a class="${cls}" href="${opts.href}">${inner}</a>`;
    return `<button type="button" class="${cls}" data-act="${act}"${attrs}${opts.disabled ? ' disabled' : ''}>${inner}</button>`;
  };

  const row = ({ href, act, data, lead = '', title, badge = '', sub = '', right = '', rightSub = '', chev = true }) => {
    const inner = `${lead}<div class="row-main"><div class="row-title"><span>${title}</span>${badge}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>
      ${right || rightSub ? `<div class="row-end">${right ? `<div class="row-amt">${right}</div>` : ''}${rightSub ? `<div class="row-meta">${rightSub}</div>` : ''}</div>` : ''}
      ${chev && (href || act) ? `<span class="chev">${icon('chevron', 16, 2)}</span>` : ''}`;
    if (href) return `<a class="row" href="${href}">${inner}</a>`;
    if (act) {
      const attrs = Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
      return `<button type="button" class="row" data-act="${act}"${attrs}>${inner}</button>`;
    }
    return `<div class="row">${inner}</div>`;
  };

  const avatar = (name, gold, photo) => photo
    ? `<div class="avatar photo"><img src="${esc(photo)}" alt=""></div>`
    : `<div class="avatar${gold ? ' gold' : ''}">${esc(initials(name))}</div>`;
  const tile = (ic, gold) => `<div class="tile${gold ? ' gold' : ''}">${icon(ic, 19)}</div>`;
  const dateTile = (iso) => { const p = parts(iso); return `<div class="date-tile"><div class="m">${MONTHS[p.m - 1] || ''}</div><div class="d">${p.d || ''}</div></div>`; };

  const card = (title, body, opts = {}) => `
    <section class="card${opts.cls ? ' ' + opts.cls : ''}">
      ${title ? `<header class="card-head"><h2>${title}</h2>${opts.action || ''}</header>` : ''}
      ${body}
      ${opts.foot ? `<div class="card-foot">${opts.foot}</div>` : ''}
    </section>`;

  const empty = (ic, title, text = '', action = '') =>
    `<div class="empty">${tile(ic, true)}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
  const emptySm = (text) => `<div class="empty-sm">${esc(text)}</div>`;

  const search = (key, placeholder) => `
    <label class="search">${icon('search', 16, 2)}
      <span class="sr-only">${esc(placeholder)}</span>
      <input id="q-${key}" type="search" placeholder="${esc(placeholder)}" value="${esc(M.state.q[key] || '')}" data-live="q" data-key="${key}" autocomplete="off">
    </label>`;

  // Segmented control; options = [[value, label, count?], ...]
  const seg = (key, options, fallback) => {
    const cur = M.state.f[key] || fallback;
    return `<div class="seg" role="tablist">${options.map(([v, l, c]) =>
      `<button type="button" role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="seg" data-key="${key}" data-val="${esc(v)}">${esc(l)}${c != null ? `<span class="count">${c}</span>` : ''}</button>`).join('')}</div>`;
  };
  const segVal = (key, fallback) => M.state.f[key] || fallback;

  // ---- Form fields ----
  const opt = (o) => Array.isArray(o) ? o : [o, o];
  const field = (f) => {
    const id = 'f-' + f.name.replace(/\W/g, '');
    const req = f.required ? ' required' : '';
    // Rules checked by validateForm: after (date not before another field), match
    // (same as another field), requiredIf ("method!=cash"), minlength.
    const extra = (f.attrs || '') + (f.after ? ` data-after="${f.after}"` : '') + (f.match ? ` data-match="${f.match}"` : '')
      + (f.requiredIf ? ` data-required-if="${esc(f.requiredIf)}"` : '') + (f.minlength ? ` minlength="${f.minlength}"` : '');
    let control;
    if (f.type === 'select') {
      control = `<select id="${id}" name="${f.name}"${req}${extra}>${(f.options || []).map((o) => { const [v, l] = opt(o); return `<option value="${esc(v)}"${String(v) === String(f.value ?? '') ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
    } else if (f.type === 'textarea') {
      control = `<textarea id="${id}" name="${f.name}" placeholder="${esc(f.placeholder || '')}" maxlength="${f.maxlength || 2000}"${req}${extra}>${esc(f.value || '')}</textarea>`;
    } else if (f.type === 'checks') {
      const vals = new Set(f.value || []);
      control = `<div class="checks">${(f.options || []).map((o) => { const [v, l] = opt(o); return `<label class="check"><input type="checkbox" name="${f.name}[]" value="${esc(v)}"${vals.has(v) ? ' checked' : ''}>${esc(l)}</label>`; }).join('') || '<span class="faint">None</span>'}</div>`;
    } else if (f.type === 'checkbox') {
      control = `<label class="check" style="align-self:flex-start"><input type="checkbox" name="${f.name}"${f.value ? ' checked' : ''}>${esc(f.checkLabel || '')}</label>`;
    } else if (f.type === 'file') {
      control = `<input id="${id}" type="file" accept="${f.accept || 'image/*'}" data-change="attach" data-target="${f.name}"${f.max ? ` data-max="${f.max}"` : ''}${f.round ? ' data-round="1"' : ''}><input type="hidden" name="${f.name}" value="${esc(f.value || '')}"><div class="file-show">${filePreview(f.value, f.round)}</div>`;
    } else {
      const type = f.type || 'text';
      const numAttrs = type === 'number' ? ` min="${f.min ?? 0}" step="${f.step || 'any'}" inputmode="decimal"` : '';
      // Sensible length limits so pasted essays can't end up in a name or phone box.
      const maxLen = f.maxlength || { text: 200, email: 120, tel: 20, search: 100 }[type];
      control = `<input id="${id}" type="${type}" name="${f.name}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}"${numAttrs}${maxLen ? ` maxlength="${maxLen}"` : ''}${req}${extra}${f.list ? ` list="${f.list}"` : ''}>`;
    }
    return `<div class="field${f.full ? ' full' : ''}">${f.label ? `<label for="${id}">${esc(f.label)}${f.required || f.requiredIf ? '<span class="req" aria-hidden="true"> *</span>' : ''}</label>` : ''}${control}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
  };
  const fields = (list) => `<div class="form-grid">${list.filter(Boolean).map((f) => typeof f === 'string' ? f : field(f)).join('')}</div>`;

  // ---- Form validation ----
  // Checks every visible field and shows the problem right under it.
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE = /^\+?[\d\s()-]{9,20}$/;
  const labelOf = (el) => {
    const l = el.id && el.form && el.form.querySelector(`label[for="${el.id}"]`);
    return (l ? l.textContent : el.getAttribute('aria-label') || 'This field').replace(/\s*\*\s*$/, '').replace(/\s*\((optional)\)\s*/i, '').trim();
  };
  const other = (el, n) => el.form && el.form.querySelector(`[name="${n}"]`);
  // "method!=cash" → required while the Method box isn't Cash.
  const requiredNow = (el) => {
    const rule = el.dataset.requiredIf;
    if (!rule) return el.required;
    const m = rule.match(/^([\w\[\]]+)(!?=)(.*)$/);
    const o = m && other(el, m[1]);
    if (!o) return false;
    return m[2] === '=' ? o.value === m[3] : o.value !== m[3];
  };
  // Item lines: a line with a price needs a name, a named line needs a quantity
  // (and, on cost lists, a cost).
  const lineProblem = (el, v) => {
    const row = el.closest('.line');
    const get = (n) => String((row.querySelector(`[name="${n}"]`) || {}).value || '').trim();
    const named = !!get('l_name[]');
    if (el.name === 'l_name[]' && !v && Number(get('l_price[]')) > 0) return 'Give this item a name';
    if (el.name === 'l_name[]' && v && !/[\p{L}\p{N}]/u.test(v)) return 'Item names need letters or numbers';
    if (el.name === 'l_qty[]' && named && !(Number(v) > 0)) return 'Quantity must be more than 0';
    if (el.name === 'l_price[]' && named && el.closest('[data-simple]') && !(Number(v) > 0)) return 'Enter what this item cost';
    return '';
  };
  const fieldProblem = (el) => {
    const v = String(el.value || '').trim();
    // Question labels ("What was it for?") read badly in a sentence.
    const name = /\?$/.test(labelOf(el)) ? 'This' : labelOf(el);
    if (el.validity && el.validity.badInput) return `${name} must be a number`;
    if (el.closest('.line')) { const lp = lineProblem(el, v); if (lp) return lp; }
    if (!v && requiredNow(el)) return /method/i.test(el.dataset.requiredIf || '') ? `${name} is required for this payment method` : el.tagName === 'SELECT' ? `Choose ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.toLowerCase()}` : `${name} is required`;
    if (!v) return '';
    if ((el.type === 'text' || el.tagName === 'TEXTAREA') && !/[\p{L}\p{N}]/u.test(v)) return `${name} needs letters or numbers`;
    if (el.minLength > 0 && v.length < el.minLength) return `${name} needs at least ${el.minLength} characters`;
    if (el.type === 'email' && !EMAIL.test(v)) return 'Enter a valid email, like name@gmail.com';
    if (el.type === 'tel' && (!PHONE.test(v) || v.replace(/\D/g, '').length < 9)) return 'Enter a valid phone number, like 0772 123 456';
    if (el.type === 'number') {
      const n = Number(v);
      if (!isFinite(n)) return `${name} must be a number`;
      if (el.min !== '' && n < Number(el.min)) return `${name} can't be less than ${num(el.min)}`;
      if (el.max !== '' && n > Number(el.max)) return `${name} can't be more than ${num(el.max)}`;
    }
    if (el.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Choose a valid date';
      if (el.min && v < el.min) return `Choose a date on or after ${date(el.min)}`;
      if (el.max && v > el.max) return `Choose a date on or before ${date(el.max)}`;
      const a = el.dataset.after && other(el, el.dataset.after);
      if (a && a.value && v < a.value) return `${name} can't be before the ${labelOf(a).toLowerCase()}`;
    }
    const mt = el.dataset.match && other(el, el.dataset.match);
    if (mt && v !== mt.value) return `This doesn't match ${labelOf(mt).toLowerCase()}`;
    if (el.maxLength > 0 && v.length > el.maxLength) return `Keep this under ${el.maxLength} characters`;
    return '';
  };
  // The message sits under the field's box. Item lines share one message under
  // the item table (the first problem), plus a red outline and tooltip per box.
  const errorHost = (el) => el.closest('.field');
  const refreshHost = (host) => {
    if (!host) return;
    const bad = host.querySelector('.is-invalid');
    let e = host.querySelector(':scope > .field-error');
    if (!bad) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('div'); e.className = 'field-error'; e.setAttribute('role', 'alert'); host.appendChild(e); }
    e.textContent = bad.title;
  };
  const showFieldError = (el, msg, ext) => {
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    el.title = msg;
    if (ext) el.dataset.ext = '1'; else delete el.dataset.ext;
    refreshHost(errorHost(el));
  };
  const clearFieldError = (el) => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('title');
    delete el.dataset.ext;
    refreshHost(errorHost(el));
  };
  // A save handler can point at the box that's wrong: throw UI.invalid('code', 'Already used').
  const invalid = (name, msg) => Object.assign(new Error(msg), { field: name });
  const showInvalid = (form, err) => {
    const el = form.querySelector(`[name="${err.field}"]:not([type=hidden])`);
    if (!el) return false;
    showFieldError(el, err.message, true);
    el.focus();
    return true;
  };
  const skip = (el) => ['hidden', 'file', 'checkbox', 'radio', 'submit', 'button'].includes(el.type) || el.disabled || el.closest('.book-hp');
  const validateForm = (form) => {
    let first = null;
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      if (skip(el)) return;
      const msg = fieldProblem(el);
      if (msg) { showFieldError(el, msg); if (!first) first = el; } else clearFieldError(el);
    });
    if (first) first.focus();
    return !first;
  };
  // Highlights clear as soon as they're fixed — including ones that depend on
  // another box (due date vs issue date, reference vs method, item lines).
  ['input', 'change'].forEach((type) => document.addEventListener(type, (e) => {
    const el = e.target;
    const form = el && el.form;
    if (!form) return;
    el.dataset.touched = '1';
    const host = errorHost(el);
    form.querySelectorAll('.is-invalid').forEach((x) => {
      if (x.dataset.ext) { if (x === el || (host && host.contains(x))) clearFieldError(x); return; }
      const msg = fieldProblem(x);
      if (!msg) clearFieldError(x); else if (msg !== x.title) showFieldError(x, msg);
    });
  }));
  // Leaving a box you've typed in checks it straight away.
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el || !el.form || !el.dataset || !el.dataset.touched || skip(el) || el.dataset.ext) return;
    const msg = fieldProblem(el);
    if (msg) showFieldError(el, msg); else if (el.classList.contains('is-invalid')) clearFieldError(el);
  });

  const formData = (form) => {
    const fd = new FormData(form);
    const out = {};
    for (const k of new Set(fd.keys())) {
      if (k.endsWith('[]')) out[k.slice(0, -2)] = fd.getAll(k).map(String);
      else out[k] = String(fd.get(k) ?? '').trim();
    }
    form.querySelectorAll('input[type=checkbox][name]').forEach((c) => {
      if (c.name.endsWith('[]')) { const k = c.name.slice(0, -2); if (!out[k]) out[k] = []; }
      else out[c.name] = c.checked;
    });
    return out;
  };

  // ---- Modal ----
  let modalOnClose = null;
  const modal = ({ title, body, form, submit = 'Save', wide = false, foot, onClose }) => {
    const root = document.getElementById('modal-root');
    const footer = foot != null ? foot : `<button type="button" class="btn" data-act="modal-close">Cancel</button>${form ? `<button type="submit" class="btn primary">${esc(submit)}</button>` : ''}`;
    const inner = `
      <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-act="modal-close" aria-label="Close">${icon('x', 18, 2)}</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}`;
    root.innerHTML = `<div class="modal-backdrop" data-backdrop>
      ${form ? `<form class="modal${wide ? ' wide' : ''}" data-form="${form}" novalidate role="dialog" aria-modal="true">${inner}</form>` : `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${inner}</div>`}
    </div>`;
    modalOnClose = onClose || null;
    const first = root.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea');
    if (first && window.matchMedia('(min-width: 641px)').matches) setTimeout(() => first.focus(), 30);
  };
  const closeModal = () => {
    document.getElementById('modal-root').innerHTML = '';
    if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
  };
  const confirm = (title, text, onYes, { label = 'Confirm', danger = false } = {}) => {
    modal({
      title,
      body: `<p class="muted" style="margin:4px 0 12px">${esc(text)}</p>`,
      foot: `<button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm-yes">${esc(label)}</button>`
    });
    M.actions['confirm-yes'] = () => { closeModal(); onYes(); };
  };

  // ---- Toast ----
  const toast = (msg, tone = '') => {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + tone;
    el.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
  };

  // ---- Downloads ----
  const download = (filename, text, type = 'text/plain') => {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const csv = (rows) => rows.map((r) => r.map((v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');

  // An attached photo, or a chip for a PDF. Clicking either opens it full size.
  // `src` is extra data-* attributes telling the click handler where the file lives.
  const isPdf = (v) => String(v || '').startsWith('data:application/pdf');
  const filePreview = (v, round, src = '') => !v ? ''
    : isPdf(v) ? `<button type="button" class="file-chip" data-act="file-open"${src}>${icon('invoice', 16, 1.8)}PDF attached · View</button>`
    : `<img class="file-preview${round ? ' round' : ''}" src="${esc(v)}" alt="Attachment" data-act="file-open"${src}>`;

  // Shrink a photo to a small JPEG data URL so it can be stored with the record.
  const shrinkImage = (file, max = 1200, quality = 0.72) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  M.UI = {
    esc, icon, logo, num, money, moneyShort, date, dateLong, dateShort, weekday, monthLabel, MONTHS, MONTHS_LONG, initials,
    pill, pageHead, btn, row, avatar, tile, dateTile, card, empty, emptySm, search, seg, segVal,
    field, fields, formData, validateForm, invalid, showInvalid, modal, closeModal, confirm, toast, download, csv, shrinkImage, filePreview, isPdf
  };
})();
