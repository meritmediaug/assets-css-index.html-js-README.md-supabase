// App shell: sign-in, navigation, routing, and the global event wiring.
(function () {
  const M = window.M;
  const { UI, Store, L } = M;
  const { esc, icon } = UI;

  M.user = null;
  M.isAdmin = () => !!M.user && M.user.role === 'admin';
  M.go = (path) => { location.hash = '#/' + path; };

  const NAV = [
    { label: 'Overview', items: [['dashboard', 'Dashboard', 'dashboard']] },
    { label: 'Sales', items: [['clients', 'Clients', 'users'], ['requests', 'Requests', 'mail', true], ['packages', 'Packages', 'box', true], ['quotations', 'Quotations', 'quote', true], ['bookings', 'Bookings', 'calendar']] },
    { label: 'Money', items: [['invoices', 'Invoices', 'invoice', true], ['receipts', 'Receipts', 'receipt', true], ['requisitions', 'Requisitions', 'request'], ['payroll', 'Salaries & wages', 'users'], ['expenses', 'Expenses', 'wallet', true], ['bank', 'Cash at bank', 'bank', true], ['momo', 'Mobile money', 'phone', true], ['reports', 'Reports', 'chart', true]] },
    { label: 'Studio', items: [['equipment', 'Equipment', 'camera'], ['settings', 'Settings', 'settings', true]] }
  ];

  const parseHash = () => {
    const p = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    return { name: p[0] || 'dashboard', id: p[1] ? decodeURIComponent(p[1]) : null };
  };

  const badge = (name) => {
    if (name === 'requisitions') {
      const n = M.isAdmin() ? L.pendingRequisitions().length : 0;
      return n ? `<span class="nav-badge">${n}</span>` : '';
    }
    if (name === 'requests') {
      const n = L.newRequests().length;
      return n ? `<span class="nav-badge" title="New booking requests">${n}</span>` : '';
    }
    if (name === 'invoices') {
      const n = L.issuedInvoices().filter((i) => L.invoiceStatus(i) === 'overdue').length;
      return n ? `<span class="nav-badge" title="Overdue invoices">${n}</span>` : '';
    }
    return '';
  };

  const sidebar = (active) => `
    <aside class="sidebar" aria-label="Main navigation">
      <a class="brand" href="#/dashboard"><div class="brand-logo">${UI.logo(24)}</div>
        <div class="brand-name">${esc(L.company().name)}</div></a>
      <nav>
      ${NAV.map((g) => {
        const items = g.items.filter((i) => !i[3] || M.isAdmin());
        if (!items.length) return '';
        return `<div class="nav-group"><div class="nav-label">${g.label}</div>${items.map(([r, l, ic]) =>
          `<a class="nav-item${r === active ? ' active' : ''}" href="#/${r}"${r === active ? ' aria-current="page"' : ''}>${icon(ic, 18)}<span>${l}</span>${badge(r)}</a>`).join('')}</div>`;
      }).join('')}
      </nav>
      <div class="sidebar-foot">${esc(L.company().name)} · ${Store.mode === 'local' ? 'Local data' : 'Cloud data'}</div>
    </aside>`;

  // ---- 3-day event reminders ----
  const bellButton = () => {
    const n = L.comingUp(3).length;
    return `<button class="icon-btn bell-btn" data-act="alerts" aria-label="${n ? `${n} event${n === 1 ? '' : 's'} in the next 3 days` : 'No events in the next 3 days'}" title="Coming up">${icon('bell', 19)}${n ? `<span class="bell-count">${n}</span>` : ''}</button>`;
  };
  M.comingUpList = (list) => list.length ? `<div class="list">${list.map((b) => {
    const crew = (b.crew || []).map((id) => L.userName(id)).filter((x) => x && x !== '—');
    return UI.row({
      href: '#/bookings/' + b.id, lead: UI.dateTile(b.date),
      title: `${esc(b.eventType || 'Shoot')} · ${esc(L.clientName(b.clientId))}`,
      badge: UI.pill(L.daysAway(b.date) === 'Today' ? 'overdue' : 'pending', L.daysAway(b.date)),
      sub: [b.time, b.venue || 'Venue TBC', crew.length ? 'Crew: ' + crew.join(', ') : 'No crew yet'].filter(Boolean).map(esc).join(' · ')
    });
  }).join('')}</div>` : UI.emptySm('Nothing booked in the next 3 days.');
  M.actions.alerts = () => UI.modal({
    title: 'Coming up in the next 3 days',
    body: `<div style="margin:0 -22px">${M.comingUpList(L.comingUp(3))}</div>`,
    foot: '<a class="btn" href="#/bookings">Open calendar</a><button type="button" class="btn primary" data-act="modal-close">Done</button>'
  });

  const topbar = (title) => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return `
    <header class="topbar">
      <button class="icon-btn menu-btn" data-act="nav-toggle" aria-label="Open menu">${icon('menu', 20)}</button>
      <div class="crumb">${esc(title)}</div>
      <div class="spacer"></div>
      ${bellButton()}
      <button class="icon-btn" data-act="theme" aria-label="Switch to ${dark ? 'light' : 'dark'} mode" title="Switch to ${dark ? 'light' : 'dark'} mode">${icon(dark ? 'sun' : 'moon', 19)}</button>
      <button class="icon-btn user-chip" data-act="account" aria-label="Your account" title="${esc(M.user.name)} · ${M.user.role}">${UI.avatar(M.user.name, true, M.user.photo)}</button>
      <button class="icon-btn" data-act="logout" aria-label="Sign out" title="Sign out">${icon('logout', 19)}</button>
    </header>`;
  };

  // ---- Login ----
  const loginView = () => {
    const co = L.company();
    if (Store.mode === 'local') {
      const users = Store.all('users').slice().sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1));
      return `<div class="login"><div class="login-card">
        <div class="login-logo">${UI.logo(40)}</div>
        <h1>Merit</h1>
        <p class="lead">${esc(co.name)}</p>
        <div class="card"><div class="list">${users.map((u) => UI.row({
          act: 'login-as', data: { id: u.id }, lead: UI.avatar(u.name, u.role === 'admin'),
          title: esc(u.name), sub: u.role === 'admin' ? 'Admin — full access' : 'Staff — bookings, requisitions, equipment'
        })).join('')}</div></div>
        <p class="fine">Local mode: data is saved in this browser only. Connect Supabase to share it with your team (see README).</p>
      </div></div>`;
    }
    return `<div class="login"><div class="login-card">
      <div class="login-logo">${UI.logo(40)}</div>
      <h1>Sign in to Merit</h1>
      <p class="lead">${esc(co.name)}</p>
      <div class="card"><form data-form="login" novalidate>
        ${UI.field({ label: 'Email', name: 'email', type: 'email', required: true, attrs: ' autocomplete="username"' })}
        ${UI.field({ label: 'Password', name: 'password', type: 'password', required: true, attrs: ' autocomplete="current-password"' })}
        <button class="btn primary" type="submit" style="height:44px">Sign in</button>
        <button type="button" class="link" data-act="forgot" style="align-self:center;font-size:14px">Forgot password?</button>
      </form></div>
      <p class="fine">Ask an admin to invite you if you don't have an account.</p>
    </div></div>`;
  };

  // ---- Render ----
  let lastRoute = '';
  const render = () => {
    const app = document.getElementById('app');
    if (!M.user) { app.innerHTML = loginView(); return; }
    let route = parseHash();
    let view = M.views[route.name];
    if (!view || (view.admin && !M.isAdmin())) {
      route = { name: 'dashboard', id: null }; view = M.views.dashboard;
      history.replaceState(null, '', '#/dashboard');
    }

    // Keep focus (and caret) in a search box while typing re-renders the page.
    const a = document.activeElement;
    const fid = a && a.id && app.contains(a) ? a.id : null;
    const sel = fid && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;

    let body;
    try { body = view.render(route.id); }
    catch (e) { console.error(e); body = UI.empty('alert', 'Something went wrong', e.message); }

    const navOpen = app.firstElementChild && app.firstElementChild.classList.contains('nav-open') && lastRoute === location.hash;
    app.innerHTML = `<div class="shell${navOpen ? ' nav-open' : ''}">${sidebar(route.name)}<div class="scrim" data-act="nav-close"></div>
      <main class="main">${topbar(view.title)}<div class="content">${M.installBanner()}${body}</div></main></div>`;

    if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
    if (lastRoute !== location.hash) { window.scrollTo(0, 0); lastRoute = location.hash; }
    if (view.after) view.after(route.id);
    // Show the count of shoots in the next 3 days on the installed phone app's icon.
    try {
      const n = L.comingUp(3).length;
      if (n && navigator.setAppBadge) navigator.setAppBadge(n);
      else if (navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) {}
  };
  M.render = render;

  // ---- Global events ----
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-backdrop]')) { UI.closeModal(); return; }
    if (e.target.closest('.nav-item, .brand')) { const s = document.querySelector('.shell'); if (s) s.classList.remove('nav-open'); }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const fn = M.actions[t.dataset.act];
    if (!fn) return;
    e.preventDefault();
    try { fn(t, e); } catch (err) { console.error(err); UI.toast(err.message, 'bad'); }
  });

  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = M.forms[f.dataset.form];
    if (!fn) return;
    // Our own checks with messages under each field (forms use novalidate so the
    // browser's pop-ups don't make the sheet jump around on phones).
    if (!UI.validateForm(f)) { UI.toast('Check the highlighted fields', 'warn'); return; }
    const btn = f.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    try {
      const r = await fn(UI.formData(f), f);
      if (r !== false && f.closest('#modal-root')) UI.closeModal();
    } catch (err) {
      if (err.field && UI.showInvalid(f, err)) { UI.toast(err.message, 'warn'); return; }
      console.error(err);
      UI.toast(err.message || String(err), 'bad');
    } finally {
      if (btn && document.body.contains(btn)) btn.disabled = false;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target.closest('[data-live]');
    if (t && M.live[t.dataset.live]) M.live[t.dataset.live](t, e);
  });
  document.addEventListener('change', (e) => {
    const t = e.target.closest('[data-change]');
    if (t && M.live[t.dataset.change]) M.live[t.dataset.change](t, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('modal-root').innerHTML) UI.closeModal();
  });
  window.addEventListener('hashchange', () => { UI.closeModal(); render(); });
  // Charts are drawn for the current width; redraw when it changes noticeably.
  let lastW = window.innerWidth, resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (M.user && Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; render(); } }, 200);
  });
  // Pick up teammates' changes when coming back to the tab.
  window.addEventListener('focus', () => { if (M.user && Store.mode === 'supabase') Store.reload(); });

  Object.assign(M.actions, {
    'modal-close': () => UI.closeModal(),
    'nav-toggle': () => document.querySelector('.shell').classList.toggle('nav-open'),
    'nav-close': () => document.querySelector('.shell').classList.remove('nav-open'),
    theme: () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('merit.theme', next); } catch (e) {}
      render();
    },
    seg: (el) => { M.state.f[el.dataset.key] = el.dataset.val; render(); },
    'login-as': async (el) => { M.user = await Store.signIn(el.dataset.id); render(); },
    logout: async () => { await Store.signOut(); M.user = null; location.hash = ''; render(); },
    print: (el) => {
      const { kind, id } = el.dataset;
      const rec = Store.get(kind === 'invoice' ? 'invoices' : kind === 'receipt' ? 'receipts' : 'quotations', id);
      if (rec) M.Docs.print(M.Docs[kind](rec), rec.number);
    }
  });

  M.forms.login = async (d) => {
    M.user = await Store.signIn(d.email, d.password);
    if (!M.user) throw new Error('Could not sign in');
    cloudFirstRun();
    render();
  };

  // ---- Account & passwords ----
  const passwordModal = (title) => UI.modal({
    title, form: 'password', submit: 'Save password',
    body: UI.fields([
      { label: 'New password', name: 'password', type: 'password', required: true, minlength: 8, full: true, hint: 'At least 8 characters.', attrs: ' autocomplete="new-password"' },
      { label: 'Repeat new password', name: 'confirm', type: 'password', required: true, match: 'password', full: true, attrs: ' autocomplete="new-password"' }
    ])
  });
  Object.assign(M.actions, {
    forgot: () => UI.modal({
      title: 'Reset your password', form: 'forgot', submit: 'Send reset link',
      body: `<p class="muted" style="margin:0 0 14px">We'll email you a link to choose a new password.</p>` +
        UI.fields([{ label: 'Email', name: 'email', type: 'email', required: true, full: true, value: (document.querySelector('[name=email]') || {}).value || '' }])
    }),
    account: () => UI.modal({
      title: 'Your account',
      body: `<div class="list" style="margin:0 -22px">
          ${UI.row({ lead: UI.avatar(M.user.name, true, M.user.photo), title: esc(M.user.name), sub: [M.user.title, M.user.email].filter(Boolean).map(esc).join(' · '), rightSub: UI.pill(M.user.role) })}
          ${UI.row({ act: 'my-profile', lead: UI.tile('edit'), title: 'Edit my profile', sub: 'Photo, job title and phone' })}
          ${Store.mode === 'supabase' ? UI.row({ act: 'change-password', lead: UI.tile('settings'), title: 'Change password' }) : ''}
          ${M.canOfferInstall() ? UI.row({ act: 'install', lead: UI.tile('download'), title: 'Install the Merit app', sub: 'Add it to your home screen' }) : ''}
        </div>
        ${Store.mode === 'local' ? '<p class="muted" style="font-size:14px">Local mode has no passwords. Connect Supabase for real sign-in (see README).</p>' : ''}`,
      foot: '<button type="button" class="btn danger" data-act="logout">Sign out</button>'
    }),
    'change-password': () => passwordModal('Change password'),
    'my-profile': () => M.profileForm(M.user, true)
  });

  // Profile editor, used by "Edit my profile" and by admins in Settings → Team.
  M.profileForm = (u, mine) => UI.modal({
    title: mine ? 'Edit my profile' : (u.id ? `Edit ${u.name}` : 'Add team member'),
    form: 'profile',
    body: `<input type="hidden" name="id" value="${esc(u.id || '')}"><input type="hidden" name="mine" value="${mine ? '1' : ''}">` + UI.fields([
      { label: 'Full name', name: 'name', value: u.name, required: true, full: true, placeholder: 'e.g. Freddie Kivumbi' },
      { label: 'Job title', name: 'title', value: u.title, placeholder: 'e.g. Photographer' },
      { label: 'Phone / WhatsApp', name: 'phone', type: 'tel', value: u.phone, placeholder: '07…' },
      Store.mode === 'local' && !mine ? { label: 'Email', name: 'email', type: 'email', value: u.email, full: true } : '',
      { label: 'Profile photo', name: 'photo', type: 'file', value: u.photo, full: true, max: 360, round: true, hint: 'A clear, square-ish photo of your face works best.' },
      !mine && M.isAdmin() ? { label: 'Role', name: 'role', type: 'select', options: [['staff', 'Staff — no money totals'], ['admin', 'Admin — full access']], value: u.role || 'staff', full: true } : ''
    ])
  });
  M.forms.profile = (d) => {
    const existing = d.id ? Store.get('users', d.id) || {} : {};
    const role = d.role || existing.role || 'staff';
    const admins = Store.all('users').filter((x) => x.role === 'admin');
    if (d.id && role !== 'admin' && existing.role === 'admin' && admins.length === 1) throw UI.invalid('role', 'Keep at least one admin');
    const rec = { name: d.name, title: d.title, phone: d.phone, photo: d.photo, role };
    if (d.email !== undefined) rec.email = d.email;
    if (d.id) rec.id = d.id;
    const saved = Store.save('users', rec);
    if (saved.id === M.user.id) M.user = Object.assign({}, M.user, saved);
    UI.toast(d.mine ? 'Profile saved' : 'Team updated');
  };
  M.forms.forgot = async (d) => {
    await Store.resetPassword(d.email);
    UI.toast('Check your email for the reset link');
  };
  M.forms.password = async (d) => {
    if (d.password.length < 8) throw UI.invalid('password', 'Use at least 8 characters');
    if (d.password !== d.confirm) throw UI.invalid('confirm', "The two passwords don't match");
    await Store.updatePassword(d.password);
    UI.toast('Password saved');
  };

  // ---- Install as a phone app ----
  // Android/Chrome offers a one-tap install; iPhone needs Share → Add to Home Screen.
  let installPrompt = null;
  const isInstalled = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (M.user) render(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; UI.toast('Merit is installed — find it on your home screen'); if (M.user) render(); });
  M.canOfferInstall = () => !isInstalled();
  M.installBanner = () => {
    let hidden = false;
    try { hidden = localStorage.getItem('merit.installHidden') === '1'; } catch (e) {}
    if (hidden || isInstalled() || !window.matchMedia('(max-width: 900px)').matches) return '';
    return `<div class="notice info install-banner">${icon('download', 18)}<div style="flex:1"><strong>Get the Merit app</strong> — add it to your home screen for one-tap access.</div>
      <button class="btn sm primary" data-act="install">Install</button><button class="icon-btn" data-act="install-hide" aria-label="Hide">${icon('x', 16, 2)}</button></div>`;
  };
  Object.assign(M.actions, {
    install: async () => {
      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice.catch(() => null);
        installPrompt = null;
        if (choice && choice.outcome === 'accepted') return;
        return render();
      }
      const steps = isIOS()
        ? `<ol class="install-steps"><li>Open Merit in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (the square with an arrow ↑).</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. Merit appears on your home screen with its gold icon.</li></ol>`
        : `<ol class="install-steps"><li>Open Merit in <strong>Chrome</strong>.</li><li>Tap the <strong>⋮</strong> menu (top right).</li><li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Tap <strong>Install</strong>. Merit appears with your other apps.</li></ol>`;
      UI.modal({
        title: 'Install the Merit app',
        body: `${steps}<p class="muted" style="font-size:14px;margin:6px 0 4px">It opens full-screen like any other app, keeps you signed in and updates itself — nothing to download from a store.</p>`,
        foot: '<button type="button" class="btn primary" data-act="modal-close">Got it</button>'
      });
    },
    'install-hide': () => { try { localStorage.setItem('merit.installHidden', '1'); } catch (e) {} render(); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // First admin sign-in to an empty cloud database: add company details and the price list.
  function cloudFirstRun() {
    if (!M.isAdmin()) return;
    // The company was renamed from "Merit Media Uganda" to "Merit Media Limited".
    // The office address was also a placeholder ("Kampala, Uganda") until the rate cards gave the real one.
    const saved = Store.get('settings', 'company');
    if (saved && (/Merit Media Uganda/.test(saved.name + saved.thanks) || saved.address === 'Kampala, Uganda')) {
      Store.save('settings', Object.assign({}, saved, {
        name: saved.name.replace('Merit Media Uganda', 'Merit Media Limited'),
        thanks: String(saved.thanks || '').replace('Merit Media Uganda', 'Merit Media Limited'),
        address: saved.address === 'Kampala, Uganda' ? M.DEFAULT_COMPANY.address : saved.address
      }));
    }
    if (Store.mode !== 'supabase' || saved) return;
    Store.save('settings', Object.assign({}, M.DEFAULT_COMPANY));
    if (!Store.all('items').length) M.seed().items.forEach((i) => Store.save('items', i));
  }

  M.live.q = (el) => { M.state.q[el.dataset.key] = el.value; render(); };

  // Photo attachments are shrunk and stored with the record. PDFs are kept as they are, up to 1 MB.
  const PDF_LIMIT = 1024 * 1024;
  M.live.attach = async (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    try {
      let data;
      if (file.type === 'application/pdf') {
        if (file.size > PDF_LIMIT) { el.value = ''; return UI.toast('That PDF is over 1 MB. Take a photo or screenshot of it instead.', 'bad'); }
        data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      } else {
        data = await UI.shrinkImage(file, Number(el.dataset.max) || 1600);
      }
      el.parentElement.querySelector(`input[type=hidden][name="${el.dataset.target}"]`).value = data;
      el.parentElement.querySelector('.file-show').innerHTML = UI.filePreview(data, !!el.dataset.round);
    } catch (e) { UI.toast('Could not read that file', 'bad'); }
  };
  // Open an attachment full size in a new tab. Inside a form it reads the field; elsewhere data-col/id/key say which record.
  M.actions['file-open'] = (el) => {
    const v = el.dataset.col
      ? (Store.get(el.dataset.col, el.dataset.id) || {})[el.dataset.key]
      : (el.closest('.field').querySelector('input[type=hidden]') || {}).value;
    if (!v) return;
    const win = window.open('', '_blank');
    fetch(v).then((r) => r.blob()).then((b) => { const url = URL.createObjectURL(b); if (win) win.location = url; else window.location = url; });
  };

  // ---- Line-items editor (quotations & invoices) ----
  // simple = expense lists: plain item names, no price-list lookup and no description line.
  const lineRow = (l = {}, simple = false) => `
    <div class="line">
      <div class="line-item">
        ${simple
          ? `<input name="l_name[]" placeholder="What was bought or paid for" value="${esc(l.name || '')}" aria-label="Item">`
          : `<input name="l_name[]" list="price-list" placeholder="Item or service" value="${esc(l.name || '')}" data-live="line-name" aria-label="Item">
        <input class="sub" name="l_desc[]" placeholder="Description (optional)" value="${esc(l.description || '')}" aria-label="Description">`}
      </div>
      <input class="q" name="l_qty[]" type="number" min="0" step="any" inputmode="decimal" value="${esc(l.qty ?? 1)}" data-live="lines" aria-label="Quantity">
      <input class="p" name="l_price[]" type="number" min="0" step="any" inputmode="numeric" value="${esc(l.price ?? '')}" placeholder="0" data-live="lines" aria-label="Unit price">
      <div class="line-amt">${UI.money((Number(l.qty) || 0) * (Number(l.price) || 0))}</div>
      <button type="button" class="icon-btn rm" data-act="line-remove" aria-label="Remove line">${icon('x', 16, 2)}</button>
    </div>`;

  M.lineEditor = (lines, discount, vat, vatRate) => {
    const items = Store.all('items');
    const ls = lines && lines.length ? lines : [{}];
    const rate = Number(vatRate) || Number(L.company().vatRate) || 18;
    const t = L.totals({ lines: ls, discount, vat, vatRate: rate });
    return `
      <div class="field full"><span class="field-label">Items</span>
        <div class="lines" id="lines">
          <div class="lines-head"><span>Item</span><span>Qty</span><span>Unit price</span><span class="r">Amount</span><span></span></div>
          ${ls.map(lineRow).join('')}
        </div>
        <datalist id="price-list">${items.map((i) => `<option value="${esc(i.name)}">${UI.money(i.price)}</option>`).join('')}</datalist>
        <div class="lines-foot">
          <button type="button" class="btn sm" data-act="line-add">${icon('plus', 15, 2)}Add line</button>
          <div class="lines-sum">
            <div class="r"><span class="muted">Subtotal</span><span id="l-sub">${UI.money(t.subtotal)}</span></div>
            <div class="r"><span class="muted">Discount (UGX)</span><input name="discount" type="number" min="0" step="any" inputmode="numeric" value="${esc(discount || '')}" placeholder="0" data-live="lines" aria-label="Discount"></div>
            <div class="r"><label class="check vat-check"><input type="checkbox" name="vat" data-change="lines"${vat ? ' checked' : ''}>Add ${rate}% VAT</label><span id="l-vat" class="muted">${vat ? UI.money(t.vat) : '—'}</span></div>
            <input type="hidden" name="vatRate" value="${rate}">
            <div class="r grand"><span>Total</span><span id="l-total">${UI.money(t.total)}</span></div>
          </div>
        </div>
      </div>`;
  };
  // The same editor for expenses: items, quantities and costs adding up to one total.
  M.costEditor = (lines) => {
    const ls = lines && lines.length ? lines : [{}];
    return `
      <div class="field full"><span class="field-label">Items</span>
        <div class="lines" id="lines" data-simple="1">
          <div class="lines-head"><span>Item</span><span>Qty</span><span>Unit cost</span><span class="r">Amount</span><span></span></div>
          ${ls.map((l) => lineRow(l, true)).join('')}
        </div>
        <div class="lines-foot">
          <button type="button" class="btn sm" data-act="line-add">${icon('plus', 15, 2)}Add line</button>
          <div class="lines-sum">
            <div class="r grand"><span>Total</span><span id="l-total">${UI.money(L.totals({ lines: ls }).total)}</span></div>
          </div>
        </div>
      </div>`;
  };
  const recalc = () => {
    const rows = [...document.querySelectorAll('#lines .line')];
    const lines = rows.map((r) => {
      const qty = Number(r.querySelector('[name="l_qty[]"]').value) || 0;
      const price = Number(r.querySelector('[name="l_price[]"]').value) || 0;
      r.querySelector('.line-amt').textContent = UI.money(qty * price);
      return { qty, price };
    });
    const disc = document.querySelector('#modal-root [name=discount]');
    const vatBox = document.querySelector('#modal-root [name=vat]');
    const rateBox = document.querySelector('#modal-root [name=vatRate]');
    const t = L.totals({ lines, discount: disc ? disc.value : 0, vat: !!(vatBox && vatBox.checked), vatRate: rateBox ? rateBox.value : 0 });
    const s = document.getElementById('l-sub'), g = document.getElementById('l-total'), v = document.getElementById('l-vat');
    if (s) s.textContent = UI.money(t.subtotal);
    if (v) v.textContent = t.vat ? UI.money(t.vat) : '—';
    if (g) g.textContent = UI.money(t.total);
  };
  M.live.lines = recalc;
  M.live['line-name'] = (el) => {
    const item = Store.all('items').find((i) => i.name.toLowerCase() === el.value.trim().toLowerCase());
    if (!item) return;
    const row = el.closest('.line');
    const desc = row.querySelector('[name="l_desc[]"]');
    const price = row.querySelector('[name="l_price[]"]');
    if (!desc.value) desc.value = item.description || '';
    if (!price.value || Number(price.value) === 0) price.value = item.price;
    recalc();
  };
  M.actions['line-add'] = () => {
    const box = document.getElementById('lines');
    box.insertAdjacentHTML('beforeend', lineRow({}, !!box.dataset.simple));
    const rows = document.querySelectorAll('#lines .line');
    rows[rows.length - 1].querySelector('input').focus();
  };
  M.actions['line-remove'] = (el) => {
    const rows = document.querySelectorAll('#lines .line');
    if (rows.length > 1) el.closest('.line').remove();
    else rows[0].querySelectorAll('input').forEach((i) => { i.value = i.name === 'l_qty[]' ? 1 : ''; });
    recalc();
  };
  // Turn the editor's form values into clean line objects.
  M.readLines = (d) => {
    const names = d.l_name || [];
    const lines = names.map((n, i) => ({
      name: String(n).trim(),
      description: String((d.l_desc || [])[i] || '').trim(),
      qty: Number((d.l_qty || [])[i]) || 0,
      price: Number((d.l_price || [])[i]) || 0
    })).filter((l) => l.name);
    if (!lines.length) throw UI.invalid('l_name[]', 'Add at least one item');
    if (lines.some((l) => l.qty <= 0)) throw UI.invalid('l_qty[]', 'Each item needs a quantity above zero');
    return lines;
  };

  // Option lists used by several forms.
  M.opts = {
    clients: (blankLabel) => [...(blankLabel ? [['', blankLabel]] : []), ...Store.all('clients').slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.id, c.name])],
    users: (blankLabel) => [...(blankLabel ? [['', blankLabel]] : []), ...Store.all('users').map((u) => [u.id, u.name])],
    bookings: (clientId, blankLabel = 'Not linked to a booking') => [['', blankLabel], ...Store.all('bookings')
      .filter((b) => !clientId || b.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((b) => [b.id, `${UI.date(b.date)} — ${L.bookingTitle(b)}`])]
  };

  // ---- Boot ----
  (async () => {
    try {
      // A password-reset link arrives with "type=recovery" in the address; note it before Supabase consumes it.
      let recovering = /type=recovery/.test(location.hash + location.search);
      await Store.init();
      Store.onAuth((event) => { if (event === 'PASSWORD_RECOVERY') recovering = true; });
      M.user = await Store.currentUser();
      if (M.user) cloudFirstRun();
      if (M.user && recovering) {
        history.replaceState(null, '', location.pathname + '#/dashboard');
        setTimeout(() => passwordModal('Choose a new password'), 50);
      }
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = `<div class="login"><div class="login-card">${UI.empty('alert', 'Merit could not start', e.message)}</div></div>`;
      return;
    }
    Store.on(render);
    render();
  })();
})();
