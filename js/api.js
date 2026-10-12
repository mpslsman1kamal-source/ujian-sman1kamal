// ============================================================
// API.JS — Lapisan komunikasi fetch() ke GAS REST API
// WAJIB header text/plain untuk POST (hindari CORS preflight GAS)
// ============================================================

const Session = {
  KEY: 'asesmen_session',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { return null; } },
  set(session) { localStorage.setItem(this.KEY, JSON.stringify(session)); },
  clear() { localStorage.removeItem(this.KEY); },
  token() { const s = this.get(); return s ? s.token : null; }
};

async function apiGet(action, params) {
  const token = Session.token();
  const qs = new URLSearchParams(Object.assign({ action: action, token: token || '' }, params || {}));
  try {
    const res = await fetch(GAS_URL + '?' + qs.toString());
    const json = await res.json();
    if (json.code === 'UNAUTHORIZED') { Session.clear(); Router.go('login'); }
    return json;
  } catch (err) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

async function apiPost(action, data) {
  const token = Session.token();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: token, data: data || {} })
    });
    const json = await res.json();
    if (json.code === 'UNAUTHORIZED') { Session.clear(); Router.go('login'); }
    return json;
  } catch (err) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

/** Fire & forget — dipakai untuk autosave/background sync (prinsip Optimistic UI). */
function apiPostBackground(action, data) {
  const token = Session.token();
  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, token: token, data: data || {} })
  }).catch(err => console.warn('Background sync gagal (akan dicoba lagi):', err));
}
