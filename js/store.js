// Data store. Two backends behind one interface:
//   local    — everything in this browser's localStorage (default)
//   supabase — shared Postgres database with logins and role-based access
// All reads are synchronous from an in-memory cache; writes update the cache
// immediately and are persisted in the background.
(function () {
  const M = window.M;
  const KEY = 'merit.db.v1';
  const SESSION_KEY = 'merit.session';
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const COLLECTIONS = ['settings', 'users', 'clients', 'items', 'packages', 'requests', 'quotations', 'bookings', 'invoices', 'receipts', 'requisitions', 'expenses', 'accountEntries', 'equipment', 'checkouts', 'maintenance'];

  let db = {};
  let sb = null;
  const listeners = [];

  const blank = () => Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();
  const emit = () => listeners.forEach((fn) => fn());
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const saveLocal = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { M.UI.toast('Could not save — browser storage is full or blocked.', 'bad'); }
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(s);
  });

  const remoteError = (err) => {
    console.error(err);
    M.UI.toast('Not saved to the server: ' + (err.message || err), 'bad');
    Store.reload();
  };

  const Store = {
    mode: 'local',
    uid,

    async init() {
      const c = window.MERIT_CONFIG || {};
      if (c.supabaseUrl && c.supabaseAnonKey) {
        this.mode = 'supabase';
        if (!window.supabase) await loadScript(SUPABASE_JS);
        sb = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
        db = blank();
        return;
      }
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
      db = Object.assign(blank(), saved || {});
      if (!saved) { db = Object.assign(blank(), M.seed()); saveLocal(); }
    },

    // ---- Auth ----
    async currentUser() {
      if (this.mode === 'local') {
        let id = null;
        try { id = localStorage.getItem(SESSION_KEY); } catch (e) {}
        return id ? this.get('users', id) || null : null;
      }
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      await this.reload();
      return this.get('users', data.session.user.id) || { id: data.session.user.id, name: data.session.user.email, email: data.session.user.email, role: 'staff' };
    },
    async signIn(idOrEmail, password) {
      if (this.mode === 'local') {
        const u = this.get('users', idOrEmail);
        if (!u) throw new Error('Unknown user');
        try { localStorage.setItem(SESSION_KEY, u.id); } catch (e) {}
        return u;
      }
      const { error } = await sb.auth.signInWithPassword({ email: idOrEmail, password });
      if (error) throw error;
      return this.currentUser();
    },
    // Password reset (Supabase mode). The emailed link brings the user back here
    // signed in for recovery; onAuth then reports PASSWORD_RECOVERY.
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
    },
    onAuth(fn) {
      if (sb) sb.auth.onAuthStateChange((event) => fn(event));
    },
    async signOut() {
      if (this.mode === 'local') { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} return; }
      await sb.auth.signOut();
      db = blank();
    },

    // Pull everything this user is allowed to see (Supabase mode).
    async reload() {
      if (this.mode !== 'supabase') return;
      const next = blank();
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await sb.from('records').select('collection,id,data').range(from, from + page - 1);
        if (error) { M.UI.toast('Could not load data: ' + error.message, 'bad'); break; }
        data.forEach((r) => { if (next[r.collection]) next[r.collection].push(Object.assign({}, r.data, { id: r.id })); });
        if (data.length < page) break;
      }
      // Title, phone and photo exist once supabase/profiles.sql has been run; fall back without them.
      let { data: profiles, error: pErr } = await sb.from('profiles').select('id,name,email,role,title,phone,photo');
      if (pErr) ({ data: profiles, error: pErr } = await sb.from('profiles').select('id,name,email,role'));
      if (!pErr && profiles) next.users = profiles;
      db = next;
      emit();
    },

    // ---- Reads ----
    all(col) { return db[col] || []; },
    get(col, id) { return (db[col] || []).find((r) => r.id === id); },
    find(col, fn) { return (db[col] || []).filter(fn); },

    // ---- Writes ----
    save(col, rec) {
      const list = db[col] || (db[col] = []);
      const r = clone(rec);
      if (!r.id) { r.id = uid(); r.createdAt = now(); }
      r.updatedAt = now();
      const i = list.findIndex((x) => x.id === r.id);
      if (i >= 0) list[i] = Object.assign({}, list[i], r); else list.push(r);
      const saved = i >= 0 ? list[i] : r;
      if (this.mode === 'local') saveLocal();
      else if (col === 'users') {
        const profile = { name: saved.name, role: saved.role };
        ['title', 'phone', 'photo'].forEach((k) => { if (k in rec) profile[k] = saved[k] || null; });
        sb.from('profiles').update(profile).eq('id', saved.id).then(({ error }) => error && remoteError(error));
      } else {
        const { id, ...data } = saved;
        sb.from('records').upsert({ collection: col, id, data }).then(({ error }) => error && remoteError(error));
      }
      emit();
      return saved;
    },
    remove(col, id) {
      db[col] = (db[col] || []).filter((r) => r.id !== id);
      if (this.mode === 'local') saveLocal();
      else sb.from('records').delete().match({ collection: col, id }).then(({ error }) => error && remoteError(error));
      emit();
    },

    // ---- Whole-database operations ----
    exportAll() { return clone(db); },
    importAll(data) {
      if (!data || typeof data !== 'object' || !Array.isArray(data.clients)) throw new Error('That file is not a Merit backup.');
      if (this.mode !== 'local') throw new Error('Restoring a backup is only available in local mode.');
      db = Object.assign(blank(), data);
      saveLocal();
      emit();
    },
    removeWhere(fn) {
      let n = 0;
      COLLECTIONS.forEach((c) => {
        (db[c] || []).filter(fn).forEach((r) => { this.remove(c, r.id); n++; });
      });
      return n;
    },
    resetToSample() {
      if (this.mode !== 'local') throw new Error('Only available in local mode.');
      db = Object.assign(blank(), M.seed());
      saveLocal();
      emit();
    },

    on(fn) { listeners.push(fn); }
  };

  M.Store = Store;
})();
