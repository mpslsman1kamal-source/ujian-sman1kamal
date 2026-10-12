// ============================================================
// APP.JS — Router SPA (Client-Side, tanpa reload) & Halaman Login
// ============================================================

const ROUTES = {
  'login': { roles: null, view: renderLoginPage },
  'admin/dashboard': { roles: ['admin'], view: viewAdminDashboard },
  'admin/siswa': { roles: ['admin'], view: viewAdminSiswa },
  'admin/kelas': { roles: ['admin'], view: viewAdminKelas },
  'admin/guru': { roles: ['admin'], view: viewAdminGuru },
  'admin/model-soal': { roles: ['admin'], view: viewAdminModelSoal },
  'admin/jadwal': { roles: ['admin'], view: viewAdminJadwal },
  'admin/token': { roles: ['admin'], view: viewAdminToken },
  'admin/kartu': { roles: ['admin'], view: viewAdminKartu },
  'admin/template': { roles: ['admin'], view: viewAdminTemplate },
  'guru/dashboard': { roles: ['guru'], view: viewGuruDashboard },
  'guru/soal': { roles: ['guru'], view: viewGuruSoal },
  'guru/rekap': { roles: ['guru'], view: viewGuruRekap },
  'guru/catatan': { roles: ['guru'], view: viewGuruCatatan },
  'siswa/jadwal': { roles: ['siswa'], view: viewSiswaJadwal }
};

const DEFAULT_ROUTE_BY_ROLE = { admin: 'admin/dashboard', guru: 'guru/dashboard', siswa: 'siswa/jadwal' };

const Router = {
  go(route) { window.location.hash = '#/' + route; },
  current() { return (window.location.hash || '#/login').replace('#/', ''); },

  async render() {
    const route = this.current();
    const spec = ROUTES[route];

    if (!spec) return this.go('login');

    if (spec.roles === null) {
      // halaman publik (login) — kalau sudah login, lempar ke dashboard role-nya
      if (appState.session) return this.go(DEFAULT_ROUTE_BY_ROLE[appState.session.role]);
      return spec.view();
    }

    if (!appState.session) return this.go('login');
    if (spec.roles.indexOf(appState.session.role) === -1) {
      showToast('Anda tidak memiliki akses ke halaman tersebut.', 'error');
      return this.go(DEFAULT_ROUTE_BY_ROLE[appState.session.role]);
    }
    return spec.view();
  }
};

window.addEventListener('hashchange', () => Router.render());

// ---------- HALAMAN LOGIN (W-01) ----------
function renderLoginPage() {
  document.getElementById('app').innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-topbar"><span>■ SYS_GATEWAY // AUTH_PORTAL</span><span>REV.2025.01</span></div>
        <div class="auth-body">
          <div style="border:1px solid #333;padding:12px;display:flex;gap:12px;align-items:center;background:var(--surface-low);">
            <div style="width:40px;height:40px;border:1px solid #333;display:flex;align-items:center;justify-content:center;background:#fff;">🎓</div>
            <div>
              <div class="uppercase-label">[APP_LOGO: ASESMEN ONLINE // REV.2025]</div>
              <div style="font-weight:700;font-size:1.05rem;">ASESMEN ONLINE SEKOLAH</div>
            </div>
          </div>
          <div>
            <h2 style="margin:0 0 4px;">Masuk ke Aplikasi Asesmen</h2>
            <p style="margin:0;color:var(--on-surface-variant);font-size:.875rem;">Sistem Asesmen Digital Terpadu Berbasis Google Apps Script</p>
          </div>
          <div>
            <div class="uppercase-label" style="display:flex;justify-content:space-between;"><span>Pilih Tipe Akses</span><span>[TARGET_GROUP]</span></div>
            <div class="role-selector" id="role-selector">
              <button type="button" class="role-btn active" data-role="siswa">SISWA</button>
              <button type="button" class="role-btn" data-role="guru">GURU</button>
              <button type="button" class="role-btn" data-role="admin">ADMIN</button>
            </div>
          </div>
          <form id="login-form">
            <div class="field"><label>Username / Nomor Induk (NISN/NIP)</label><input id="f-username" required></div>
            <div class="field"><label>Kata Sandi / Password</label><input id="f-password" type="password" required></div>
            <button type="submit" class="btn btn-primary btn-block" id="btn-login">MASUK KE ASESMEN →</button>
          </form>
          <p style="font-size:.75rem;color:var(--on-surface-variant);text-align:center;">Lupa password? Hubungi Administrator/Proktor Sekolah.</p>
        </div>
      </div>
    </div>`;

  let selectedRole = 'siswa';
  document.querySelectorAll('.role-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
  }));

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.disabled = true; btn.textContent = 'Memeriksa...';
    const res = await apiPost('login', {
      role: selectedRole, username: document.getElementById('f-username').value.trim(),
      password: document.getElementById('f-password').value
    });
    btn.disabled = false; btn.textContent = 'MASUK KE ASESMEN →';
    if (!res.success) return showToast(res.message, 'error');
    appState.setSession(res.data);
    showToast('Login berhasil. Selamat datang, ' + res.data.profile.nama + '!');
    Router.go(DEFAULT_ROUTE_BY_ROLE[res.data.role]);
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  appState.loadSession();
  Router.render();
});
