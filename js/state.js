// ============================================================
// STATE.JS — Cache state di client (gas-instant-ux prinsip #2 & #3)
// Data master di-cache di memori supaya navigasi antar halaman
// tidak selalu fetch ulang; di-refresh eksplisit setelah create/update/delete.
// ============================================================

const appState = {
  session: null,       // { token, role, profile }
  cache: {},            // cache sederhana per key: { data, ts }

  setSession(session) { this.session = session; Session.set(session); },
  loadSession() { this.session = Session.get(); return this.session; },
  clearSession() { this.session = null; Session.clear(); },

  setCache(key, data) { this.cache[key] = { data: data, ts: Date.now() }; },
  getCache(key, maxAgeMs) {
    const entry = this.cache[key];
    if (!entry) return null;
    if (maxAgeMs && (Date.now() - entry.ts) > maxAgeMs) return null;
    return entry.data;
  },
  invalidate(key) { delete this.cache[key]; }
};

// ---------- Draft lokal pengerjaan ujian (ketahanan koneksi putus — PRD 6.2) ----------
const ExamDraft = {
  key(idHasil) { return 'exam_draft_' + idHasil; },
  save(idHasil, jawabanMap) {
    try { localStorage.setItem(this.key(idHasil), JSON.stringify(jawabanMap)); } catch (e) { /* storage penuh, abaikan */ }
  },
  load(idHasil) {
    try { return JSON.parse(localStorage.getItem(this.key(idHasil)) || '{}'); } catch (e) { return {}; }
  },
  clear(idHasil) { localStorage.removeItem(this.key(idHasil)); }
};
