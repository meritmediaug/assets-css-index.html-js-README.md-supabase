// Public booking page: clients choose a package, pick a date and send a request.
// No sign-in. In cloud mode it can only read live packages and taken dates, and
// can only add a new request (see supabase/schema.sql).
(function () {
  const M = window.M;
  const { UI } = M;
  const { esc, money, icon } = UI;
  const C = window.MERIT_CONFIG || {};
  const cloud = !!(C.supabaseUrl && C.supabaseAnonKey);
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const LOCAL_KEY = 'merit.db.v1';
  const root = document.getElementById('book');

  let sb = null;
  let company = Object.assign({}, M.DEFAULT_COMPANY);
  let packages = [];
  const busy = new Set();
  let sent = null;

  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const waNumber = () => String(company.phone || '').replace(/\D/g, '');
  const localDb = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { return null; } };
  const loadScript = (src) => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('network')); document.head.appendChild(s); });
  const currentSlug = () => new URLSearchParams(location.search).get('p') || '';

  async function load() {
    if (cloud) {
      if (!window.supabase) await loadScript(SUPABASE_JS);
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const [pk, dates] = await Promise.all([
        sb.from('records').select('id,data').eq('collection', 'packages'),
        sb.rpc('busy_dates')
      ]);
      if (pk.error) throw pk.error;
      packages = (pk.data || []).map((r) => Object.assign({}, r.data, { id: r.id }));
      (dates.data || []).forEach((d) => busy.add(typeof d === 'string' ? d : Object.values(d)[0]));
    } else {
      const db = localDb() || M.seed();
      company = Object.assign(company, (db.settings || []).find((s) => s.id === 'company') || {});
      packages = db.packages || [];
      (db.bookings || []).filter((b) => b.status === 'tentative' || b.status === 'confirmed').forEach((b) => busy.add(b.date));
    }
    packages = packages.filter((p) => p.active !== false)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name)));
  }

  const header = () => `
    <header class="book-head">
      <div class="login-logo">${UI.logo(40)}</div>
      <h1>${esc(company.name)}</h1>
      <p class="lead">${esc(company.tagline || '')}</p>
    </header>`;

  const footer = () => `
    <footer class="book-foot">
      <div>${[company.phone, company.email, company.website].filter(Boolean).map(esc).join(' · ')}</div>
      <div>${esc(company.address || '')}${company.travel ? ' · ' + esc(company.travel) : ''}</div>
    </footer>`;

  const pkgBlock = (p, full) => `
    <section class="card pkg-card">
      <div class="card-body">
        <div class="pkg-top"><div><h3>${esc(p.name)}</h3><div class="muted" style="font-size:13px">${esc(p.eventType || '')}</div></div>${p.badge ? `<span class="pill gold">${esc(p.badge)}</span>` : ''}</div>
        <div class="pkg-price">${p.price ? money(p.price) : 'Price on request'}</div>
        ${p.priceNote ? `<div class="faint" style="font-size:12.5px;margin-top:2px">${esc(p.priceNote)}</div>` : ''}
        ${p.description ? `<p class="muted" style="margin:8px 0 0;font-size:14px">${esc(p.description)}</p>` : ''}
        ${(p.includes || []).length ? `<ul class="pkg-includes">${p.includes.map((i) => `<li>${icon('check', 14, 2)}${esc(i)}</li>`).join('')}</ul>` : ''}
        ${full ? '' : `<button class="btn primary book-cta" data-pick="${esc(p.slug)}">${p.category === 'Schools' ? 'Choose this package' : 'Book this package'}</button>`}
      </div>
    </section>`;

  const CATEGORY_TITLES = { Weddings: 'Wedding packages', Introductions: 'Introduction packages', 'Studio sessions': 'Studio session packages', Livestreaming: 'Livestreaming', Schools: 'Termly media packages for schools', Events: 'Events', Other: 'More packages' };
  const currentCat = () => new URLSearchParams(location.search).get('c') || '';
  const catOrder = () => (M.CATEGORIES || []).concat(['Other']);

  function render() {
    if (sent) return renderSent();
    const slug = currentSlug();
    const pkg = packages.find((p) => p.slug === slug);
    if (slug === 'enquiry' || pkg) return renderForm(pkg || null);
    const only = currentCat();
    const shown = only ? packages.filter((p) => (p.category || 'Other') === only) : packages;
    const cats = catOrder().filter((c, i, a) => a.indexOf(c) === i && shown.some((p) => (p.category || 'Other') === c));
    root.innerHTML = `${header()}
      ${only ? `<a class="back" href="./book.html" data-pick="">${icon('back', 16, 2)}All our packages</a>` : ''}
      ${shown.length ? cats.map((c) => `<h2 class="book-h2">${esc(CATEGORY_TITLES[c] || c)}</h2><div class="book-list">${shown.filter((p) => (p.category || 'Other') === c).map((p) => pkgBlock(p, false)).join('')}</div>`).join('<div style="height:18px"></div>')
        : `<div class="card"><div class="empty-sm">Packages are coming soon — send us an enquiry below.</div></div>`}
      <p class="book-alt">Not sure which package? <a class="link" href="?p=enquiry" data-pick="enquiry">Send a general enquiry</a></p>
      ${footer()}`;
  }

  // Form wording per kind of package.
  const wording = (pkg) => {
    const cat = pkg ? pkg.category : '';
    if (cat === 'Schools') return {
      title: 'Request this package', name: ['Contact person', 'e.g. Mrs Namata, Head of Admissions'], date: 'When should we start?',
      venue: ['School name and location', 'e.g. Kisaasi Hill Primary School, Kampala'], venueRequired: true, eventType: 'School term', hideType: true, warnBusy: false,
      notes: 'Which term, number of pupils, events coming up…', after: "We'll contact you to agree the start date and send a quotation."
    };
    if (cat === 'Studio sessions') return {
      title: 'Request your session', name: ['Your name(s)', 'e.g. Grace Nakato'], date: 'Preferred session date',
      venue: null, eventType: 'Portrait session', hideType: true, warnBusy: false,
      notes: "Who's coming, the occasion (birthday, graduation, family…), preferred time…", after: "We'll call you to confirm the time and send a quotation."
    };
    if (cat === 'Livestreaming') return {
      title: 'Request your date', name: ['Your name / organisation', 'e.g. Grace Fellowship Church'], date: 'Event date',
      venue: ['Venue', 'e.g. Kampala Serena Hotel'], eventType: 'Livestream', hideType: true, warnBusy: true,
      notes: 'Platforms (YouTube, Facebook…), start time, expected hours…', after: "We'll contact you to confirm your date and send a quotation."
    };
    return {
      title: pkg ? 'Request your date' : 'Send an enquiry', name: ['Your name(s)', 'e.g. Ivan & Eve'], date: 'Event date',
      venue: ['Venue or location', 'e.g. Serena Hotel, Kampala'], eventType: pkg ? pkg.eventType || 'Wedding' : 'Wedding', hideType: false, warnBusy: true,
      notes: 'Timings, number of guests, special requests…', after: "We'll contact you to confirm your date and send a quotation."
    };
  };

  function renderForm(pkg) {
    const min = today();
    const w = wording(pkg);
    const backTo = pkg && pkg.category ? `?c=${encodeURIComponent(pkg.category)}` : './book.html';
    const types = ['Wedding', 'Introduction', 'Livestream', 'School term', 'Birthday', 'Graduation', 'Corporate', 'Event', 'Portrait session', 'Other'];
    root.innerHTML = `${header()}
      <a class="back" href="${backTo}" data-pick="${pkg && pkg.category ? 'c:' + esc(pkg.category) : ''}">${icon('back', 16, 2)}${pkg && pkg.category ? esc(CATEGORY_TITLES[pkg.category] || pkg.category) : 'All packages'}</a>
      ${pkg ? pkgBlock(pkg, true) : ''}
      <section class="card section-gap">
        <form class="card-body" id="book-form" novalidate>
          <h2 class="book-h2" style="margin-top:0">${esc(w.title)}</h2>
          ${UI.fields([
            { label: w.name[0], name: 'name', required: true, full: true, placeholder: w.name[1], attrs: ' autocomplete="name"' },
            { label: 'Phone / WhatsApp', name: 'phone', type: 'tel', required: true, placeholder: '07…', attrs: ' autocomplete="tel"' },
            { label: 'Email (optional)', name: 'email', type: 'email', attrs: ' autocomplete="email"' },
            { label: w.date, name: 'date', type: 'date', required: true, attrs: ` min="${min}"` },
            w.hideType ? `<input type="hidden" name="eventType" value="${esc(w.eventType)}">` : { label: 'Event', name: 'eventType', type: 'select', options: types, value: w.eventType },
            w.venue ? { label: w.venue[0], name: 'venue', full: true, required: !!w.venueRequired, placeholder: w.venue[1] } : '<input type="hidden" name="venue" value="Merit Media studio, Kisaasi">',
            { label: 'Anything we should know?', name: 'notes', type: 'textarea', full: true, placeholder: w.notes }
          ])}
          <div class="book-hp" aria-hidden="true"><label>Leave empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
          <div id="date-note"></div>
          <button class="btn primary book-submit" type="submit">${icon('check', 16, 2)}Send request</button>
          <p class="hint" style="text-align:center;margin:12px 0 0">No payment now. ${esc(w.after)}</p>
        </form>
      </section>
      ${footer()}`;
    const form = document.getElementById('book-form');
    const dateEl = form.elements.namedItem('date');
    dateEl.addEventListener('change', () => {
      document.getElementById('date-note').innerHTML = w.warnBusy && busy.has(dateEl.value)
        ? `<div class="notice" style="margin:14px 0 0">${icon('alert', 18)}<div>We already have a booking on this date. Send your request anyway — we'll let you know if we can still cover it.</div></div>` : '';
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(form, pkg); });
  }

  async function submit(form, pkg) {
    // form.name is the form's own name, so look fields up explicitly.
    const el = (n) => form.elements.namedItem(n);
    const v = (n) => String((el(n) && el(n).value) || '').trim();
    if (v('website')) return; // bot
    // Required boxes, phone, email and a date from today on — each shown under its box.
    if (!UI.validateForm(form)) return UI.toast('Please check the highlighted boxes', 'warn');
    const data = {
      status: 'new', packageId: pkg ? pkg.id : '', packageName: pkg ? pkg.name : 'General enquiry', packagePrice: pkg ? Number(pkg.price) || 0 : 0,
      name: v('name').slice(0, 120), phone: v('phone').slice(0, 40), email: v('email').slice(0, 120), eventType: v('eventType'),
      date: v('date'), venue: v('venue').slice(0, 200), notes: v('notes').slice(0, 1500), submittedAt: new Date().toISOString()
    };
    const id = 'req-' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    const btn = form.querySelector('.book-submit');
    btn.disabled = true;
    try {
      if (cloud) {
        const { error } = await sb.from('records').insert({ collection: 'requests', id, data });
        if (error) throw error;
      } else {
        const db = localDb() || M.seed();
        db.requests = (db.requests || []).concat([Object.assign({ id }, data)]);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
      }
      sent = data;
      window.scrollTo(0, 0);
      render();
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      UI.toast("Couldn't send — check your connection and try again, or WhatsApp us.", 'bad');
    }
  }

  function renderSent() {
    const msg = `Hello ${company.shortName || company.name}, I've just requested ${sent.packageName} for ${UI.dateLong(sent.date)}. My name is ${sent.name}.`;
    root.innerHTML = `${header()}
      <section class="card"><div class="card-body book-done">
        <div class="tile gold" style="width:56px;height:56px;border-radius:16px;margin:0 auto 14px">${icon('check', 26, 2)}</div>
        <h2>Request sent</h2>
        <p class="muted">Thank you, ${esc(sent.name)}. We've received your request for <strong>${esc(sent.packageName)}</strong> ${sent.eventType === 'School term' ? 'starting' : 'on'} <strong>${UI.dateLong(sent.date)}</strong>. We'll call you on ${esc(sent.phone)} to confirm.</p>
        ${waNumber() ? `<a class="btn gold" href="https://wa.me/${waNumber()}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${icon('phone', 16, 2)}Message us on WhatsApp</a>` : ''}
      </div></section>
      ${footer()}`;
  }

  // Package links work without reloading the page.
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pick]');
    if (!a) return;
    e.preventDefault();
    const pick = a.getAttribute('data-pick');
    // "c:<category>" goes back to a category list; anything else is a package slug.
    const url = pick.startsWith('c:') ? `?c=${encodeURIComponent(pick.slice(2))}` : pick ? `?p=${encodeURIComponent(pick)}` : location.pathname;
    history.pushState(null, '', url);
    window.scrollTo(0, 0);
    render();
  });
  window.addEventListener('popstate', render);

  load().then(render).catch((err) => {
    console.error(err);
    root.innerHTML = `${header()}<div class="card"><div class="card-body">
      <p>Our booking page is having trouble loading. Please contact us directly:</p>
      ${waNumber() ? `<a class="btn gold" href="https://wa.me/${waNumber()}" target="_blank" rel="noopener">${icon('phone', 16, 2)}WhatsApp ${esc(company.phone)}</a>` : ''}
    </div></div>${footer()}`;
  });
})();
