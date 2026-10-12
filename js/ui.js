// ============================================================
// UI.JS — Helper UI bersama: toast, modal, loading, shell nav
// ============================================================

function showToast(message, type) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 3200);
}

function showLoading(show) {
  let el = document.getElementById('global-loading');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loading';
      el.className = 'loading-overlay';
      el.innerHTML = '[ MEMUAT DATA... ]';
      document.body.appendChild(el);
    }
  } else if (el) el.remove();
}

function openModal(innerHtml) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'active-modal';
  backdrop.innerHTML = '<div class="modal-box">' + innerHtml + '</div>';
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
}
function closeModal() { const el = document.getElementById('active-modal'); if (el) el.remove(); }

function esc(str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDuration(detik) {
  detik = Number(detik) || 0;
  const m = Math.floor(detik / 60), s = detik % 60;
  return m + ' menit ' + s + ' detik';
}

// ---------- Shell: Sidebar + Topbar per role ----------

const NAV_ITEMS = {
  admin: [
    { route: 'admin/dashboard', label: 'Dashboard', code: 'W-02' },
    { route: 'admin/siswa', label: 'Data Siswa', code: 'W-03' },
    { route: 'admin/kelas', label: 'Data Kelas', code: 'W-05' },
    { route: 'admin/guru', label: 'Data Guru', code: 'W-06' },
    { route: 'admin/model-soal', label: 'Model Soal', code: 'W-07' },
    { route: 'admin/jadwal', label: 'Jadwal Asesmen', code: 'W-08' },
    { route: 'admin/token', label: 'Token Ujian', code: 'W-09' },
    { route: 'admin/kartu', label: 'Kartu Asesmen', code: 'W-10' },
    { route: 'admin/template', label: 'Template Berkas', code: 'W-11' }
  ],
  guru: [
    { route: 'guru/dashboard', label: 'Dashboard', code: 'W-12' },
    { route: 'guru/soal', label: 'Buat/Kelola Soal', code: 'W-13' },
    { route: 'guru/rekap', label: 'Rekap Nilai', code: 'W-15' },
    { route: 'guru/catatan', label: 'Catatan Siswa', code: 'W-16' }
  ],
  siswa: [
    { route: 'siswa/jadwal', label: 'Jadwal Asesmen', code: 'W-17' }
  ]
};

function renderShell(role, activeRoute, contentHtml) {
  const items = NAV_ITEMS[role] || [];
  const profile = appState.session.profile;
  const navHtml = items.map(it => `
    <a class="sidebar-link ${activeRoute === it.route ? 'active' : ''}" data-route="${it.route}">
      ${esc(it.label)} <span class="font-mono" style="margin-left:auto;font-size:.65rem;opacity:.5;">${it.code}</span>
    </a>`).join('');

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <span class="uppercase-label" style="color:#999;">Asesmen Online</span>
          <b>${role.toUpperCase()} PANEL</b>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-foot">
          <div class="font-mono" style="font-size:.75rem;color:#ccc;">${esc(profile.nama)}</div>
          <button class="btn btn-ghost" style="color:#fff;padding:6px 0;" id="btn-logout">[ KELUAR ]</button>
        </div>
      </aside>
      <div class="main-area">
        <div class="topbar">
          <span class="topbar-crumb">ROOT / ${role}_console / ${activeRoute.split('/')[1]}</span>
          <button class="btn btn-secondary" id="btn-toggle-sidebar" style="display:none;">☰</button>
        </div>
        <div class="page-content" id="page-content">${contentHtml}</div>
      </div>
    </div>`;

  document.querySelectorAll('.sidebar-link').forEach(a => {
    a.addEventListener('click', () => Router.go(a.dataset.route));
  });
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await apiPost('logout', {});
    appState.clearSession();
    Router.go('login');
  });
}
