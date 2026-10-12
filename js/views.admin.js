// ============================================================
// VIEWS.ADMIN.JS — Halaman-halaman Panel Admin (W-02..W-11)
// ============================================================

async function viewAdminDashboard() {
  renderShell('admin', 'admin/dashboard', `<div class="empty-state">[ MEMUAT DASHBOARD... ]</div>`);
  const res = await apiGet('getAdminDashboardSummary');
  if (!res.success) return showToast(res.message, 'error');
  const d = res.data;
  const jadwalRows = (d.jadwal_terdekat || []).map(j => `
    <tr><td>${esc(j.tanggal)}</td><td>${esc(j.mapel)}</td><td>${esc(j.jam_ke)}</td><td><span class="badge">${esc(j.token || '-')}</span></td></tr>`).join('')
    || '<tr><td colspan="4" class="empty-state">Belum ada jadwal aktif.</td></tr>';

  const html = `
    <div class="grid grid-4">
      <div class="metric-card"><div class="label">POPULATION</div><div class="num">${d.jumlah_siswa}</div><div class="label">Siswa</div></div>
      <div class="metric-card"><div class="label">FACULTY</div><div class="num">${d.jumlah_guru}</div><div class="label">Guru</div></div>
      <div class="metric-card"><div class="label">UNITS</div><div class="num">${d.jumlah_kelas}</div><div class="label">Rombel</div></div>
      <div class="metric-card"><div class="label">TIMETABLE</div><div class="num">${d.jumlah_jadwal_aktif}</div><div class="label">Jadwal Aktif</div></div>
    </div>
    <div class="panel" style="margin-top:16px;">
      <div class="panel-head"><h3>Jadwal Asesmen Terdekat</h3></div>
      <div class="panel-body" style="padding:0;">
        <table><thead><tr><th>Tanggal</th><th>Mapel</th><th>Jam Ke</th><th>Token</th></tr></thead><tbody>${jadwalRows}</tbody></table>
      </div>
    </div>`;
  document.getElementById('page-content').innerHTML = html;
}

// ---------- DATA SISWA ----------
async function viewAdminSiswa() {
  renderShell('admin', 'admin/siswa', `<div class="empty-state">[ MEMUAT DATA SISWA... ]</div>`);
  const [siswaRes, kelasRes] = await Promise.all([apiGet('getSiswaList'), apiGet('getKelasList')]);
  if (!siswaRes.success) return showToast(siswaRes.message, 'error');
  appState.setCache('kelasList', kelasRes.data || []);
  renderSiswaTable(siswaRes.data);
}

function renderSiswaTable(list) {
  const kelasOptions = (appState.getCache('kelasList') || []).map(k => `<option value="${k.id_kelas}">${esc(k.nama_kelas)}</option>`).join('');
  const rows = list.map(s => `
    <tr>
      <td>${esc(s.nama)}</td><td class="font-mono">${esc(s.nisn)}</td><td>${esc(s.nama_kelas)}</td>
      <td class="font-mono">${esc(s.username)}</td>
      <td>
        <button class="btn btn-secondary" data-edit="${s.id}">Ubah</button>
        <button class="btn btn-ghost" data-reset="${s.id}">Reset Pass</button>
        <button class="btn btn-danger" data-del="${s.id}">Hapus</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Belum ada data siswa.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Kelola Data Siswa</h3><button class="btn btn-primary" id="btn-add-siswa">+ Tambah Siswa</button></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Nama</th><th>NISN</th><th>Kelas</th><th>Username</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>`;

  document.getElementById('btn-add-siswa').addEventListener('click', () => openSiswaForm(null, kelasOptions));
  list.forEach(s => {
    document.querySelector(`[data-edit="${s.id}"]`)?.addEventListener('click', () => openSiswaForm(s, kelasOptions));
    document.querySelector(`[data-del="${s.id}"]`)?.addEventListener('click', () => confirmDeleteSiswa(s));
    document.querySelector(`[data-reset="${s.id}"]`)?.addEventListener('click', () => resetPasswordSiswa(s));
  });
}

function openSiswaForm(siswa, kelasOptionsHtml) {
  const isEdit = !!siswa;
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Data Siswa</h3><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>Nama Lengkap</label><input id="f-nama" value="${isEdit ? esc(siswa.nama) : ''}"></div>
      <div class="field"><label>NISN</label><input id="f-nisn" value="${isEdit ? esc(siswa.nisn) : ''}" ${isEdit ? 'disabled' : ''}></div>
      <div class="field"><label>Jenis Kelamin</label>
        <select id="f-jk"><option value="L" ${siswa?.jenis_kelamin === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${siswa?.jenis_kelamin === 'P' ? 'selected' : ''}>Perempuan</option></select>
      </div>
      <div class="field"><label>Tanggal Lahir</label><input type="date" id="f-tgl" value="${isEdit && siswa.tanggal_lahir !== '-' ? siswa.tanggal_lahir : ''}"></div>
      <div class="field"><label>Kelas</label><select id="f-kelas">${kelasOptionsHtml}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save-siswa">Simpan</button></div>`);
  if (isEdit) document.getElementById('f-kelas').value = siswa.id_kelas;

  document.getElementById('btn-save-siswa').addEventListener('click', async () => {
    const payload = {
      id: siswa?.id, nama: document.getElementById('f-nama').value.trim(),
      nisn: document.getElementById('f-nisn').value.trim(), jenis_kelamin: document.getElementById('f-jk').value,
      tanggal_lahir: document.getElementById('f-tgl').value, id_kelas: document.getElementById('f-kelas').value
    };
    if (!payload.nama || !payload.nisn) return showToast('Nama dan NISN wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateSiswa' : 'addSiswa', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal();
    appState.invalidate('siswaList');
    if (!isEdit) {
      showToast('Siswa ditambahkan! Username: ' + res.data.username + ' / Password: ' + res.data.password);
    } else {
      showToast('Data siswa diperbarui.');
    }
    viewAdminSiswa();
  });
}

function confirmDeleteSiswa(s) {
  openModal(`
    <div class="modal-head"><h3>Hapus Siswa?</h3></div>
    <div class="modal-body">Yakin ingin menghapus <strong>${esc(s.nama)}</strong>? Tindakan ini tidak dapat dibatalkan.</div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-danger" id="btn-confirm-del">Hapus</button></div>`);
  document.getElementById('btn-confirm-del').addEventListener('click', async () => {
    showLoading(true);
    const res = await apiPost('deleteSiswa', { id: s.id });
    showLoading(false);
    closeModal();
    if (!res.success) return showToast(res.message, 'error');
    showToast('Siswa dihapus.');
    viewAdminSiswa();
  });
}

async function resetPasswordSiswa(s) {
  showLoading(true);
  const res = await apiPost('resetPasswordSiswa', { id: s.id });
  showLoading(false);
  if (!res.success) return showToast(res.message, 'error');
  openModal(`<div class="modal-head"><h3>Password Baru</h3></div>
    <div class="modal-body font-mono">Username: <b>${esc(res.data.username)}</b><br>Password baru: <b>${esc(res.data.password)}</b><br><br>
    <span style="color:var(--on-surface-variant);">Catat/sampaikan sekarang — tidak akan ditampilkan lagi.</span></div>
    <div class="modal-foot"><button class="btn btn-primary" onclick="closeModal()">Tutup</button></div>`);
}

// ---------- DATA KELAS ----------
async function viewAdminKelas() {
  renderShell('admin', 'admin/kelas', `<div class="empty-state">[ MEMUAT DATA KELAS... ]</div>`);
  const res = await apiGet('getKelasList');
  if (!res.success) return showToast(res.message, 'error');
  const rows = res.data.map(k => `
    <tr><td>${esc(k.nama_kelas)}</td><td>${esc(k.wali_kelas)}</td><td class="num">${k.jumlah_siswa}</td>
      <td><button class="btn btn-secondary" data-edit="${k.id_kelas}">Ubah</button> <button class="btn btn-danger" data-del="${k.id_kelas}">Hapus</button></td></tr>`
  ).join('') || '<tr><td colspan="4" class="empty-state">Belum ada kelas.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Kelola Kelas / Rombel</h3><button class="btn btn-primary" id="btn-add">+ Tambah Kelas</button></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Nama Kelas</th><th>Wali Kelas</th><th class="num">Jml Siswa</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-add').addEventListener('click', () => openKelasForm(null));
  res.data.forEach(k => {
    document.querySelector(`[data-edit="${k.id_kelas}"]`)?.addEventListener('click', () => openKelasForm(k));
    document.querySelector(`[data-del="${k.id_kelas}"]`)?.addEventListener('click', async () => {
      showLoading(true);
      const r = await apiPost('deleteKelas', { id_kelas: k.id_kelas });
      showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Kelas dihapus.'); viewAdminKelas();
    });
  });
}

function openKelasForm(kelas) {
  const isEdit = !!kelas;
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Kelas</h3></div>
    <div class="modal-body">
      <div class="field"><label>Nama Kelas</label><input id="f-nama" value="${isEdit ? esc(kelas.nama_kelas) : ''}" placeholder="VII-A"></div>
      <div class="field"><label>Wali Kelas</label><input id="f-wali" value="${isEdit ? esc(kelas.wali_kelas) : ''}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  document.getElementById('btn-save').addEventListener('click', async () => {
    const payload = { id_kelas: kelas?.id_kelas, nama_kelas: document.getElementById('f-nama').value.trim(), wali_kelas: document.getElementById('f-wali').value.trim() };
    if (!payload.nama_kelas) return showToast('Nama kelas wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateKelas' : 'addKelas', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal(); showToast('Tersimpan.'); viewAdminKelas();
  });
}

// ---------- DATA GURU ----------
async function viewAdminGuru() {
  renderShell('admin', 'admin/guru', `<div class="empty-state">[ MEMUAT DATA GURU... ]</div>`);
  const res = await apiGet('getGuruList');
  if (!res.success) return showToast(res.message, 'error');
  const rows = res.data.map(g => `
    <tr><td>${esc(g.nama)}</td><td class="font-mono">${esc(g.nip)}</td><td>${esc(g.mapel)}</td><td class="font-mono">${esc(g.username)}</td>
      <td><button class="btn btn-secondary" data-edit="${g.id}">Ubah</button> <button class="btn btn-danger" data-del="${g.id}">Hapus</button></td></tr>`
  ).join('') || '<tr><td colspan="5" class="empty-state">Belum ada data guru.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Kelola Data Guru</h3><button class="btn btn-primary" id="btn-add">+ Tambah Guru</button></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Nama</th><th>NIP</th><th>Mapel</th><th>Username</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-add').addEventListener('click', () => openGuruForm(null));
  res.data.forEach(g => {
    document.querySelector(`[data-edit="${g.id}"]`)?.addEventListener('click', () => openGuruForm(g));
    document.querySelector(`[data-del="${g.id}"]`)?.addEventListener('click', async () => {
      showLoading(true); const r = await apiPost('deleteGuru', { id: g.id }); showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Guru dihapus.'); viewAdminGuru();
    });
  });
}

function openGuruForm(guru) {
  const isEdit = !!guru;
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Guru</h3></div>
    <div class="modal-body">
      <div class="field"><label>Nama Lengkap</label><input id="f-nama" value="${isEdit ? esc(guru.nama) : ''}"></div>
      <div class="field"><label>NIP</label><input id="f-nip" value="${isEdit ? esc(guru.nip) : ''}"></div>
      <div class="field"><label>Mata Pelajaran</label><input id="f-mapel" value="${isEdit ? esc(guru.mapel) : ''}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  document.getElementById('btn-save').addEventListener('click', async () => {
    const payload = { id: guru?.id, nama: document.getElementById('f-nama').value.trim(), nip: document.getElementById('f-nip').value.trim(), mapel: document.getElementById('f-mapel').value.trim() };
    if (!payload.nama || !payload.mapel) return showToast('Nama dan mapel wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateGuru' : 'addGuru', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal();
    showToast(isEdit ? 'Data guru diperbarui.' : ('Guru ditambahkan! Username: ' + res.data.username + ' / Password: ' + res.data.password));
    viewAdminGuru();
  });
}

// ---------- MODEL SOAL ----------
async function viewAdminModelSoal() {
  renderShell('admin', 'admin/model-soal', `<div class="empty-state">[ MEMUAT MODEL SOAL... ]</div>`);
  const res = await apiGet('getModelSoalList');
  if (!res.success) return showToast(res.message, 'error');
  const rows = res.data.map(m => `
    <tr><td>${esc(m.nama_model)}</td><td>${esc(m.mapel)}</td><td>${esc(m.jenis_soal)}</td><td class="num">${m.jumlah_soal}</td><td class="num">${m.bobot_per_soal}</td><td class="num">${m.durasi_menit}'</td>
      <td><button class="btn btn-secondary" data-edit="${m.id_model}">Ubah</button> <button class="btn btn-danger" data-del="${m.id_model}">Hapus</button></td></tr>`
  ).join('') || '<tr><td colspan="7" class="empty-state">Belum ada model soal.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Kelola Model Soal</h3><button class="btn btn-primary" id="btn-add">+ Tambah Model</button></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Nama Model</th><th>Mapel</th><th>Jenis</th><th class="num">Jml Soal</th><th class="num">Bobot/Soal</th><th class="num">Durasi</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-add').addEventListener('click', () => openModelSoalForm(null));
  res.data.forEach(m => {
    document.querySelector(`[data-edit="${m.id_model}"]`)?.addEventListener('click', () => openModelSoalForm(m));
    document.querySelector(`[data-del="${m.id_model}"]`)?.addEventListener('click', async () => {
      showLoading(true); const r = await apiPost('deleteModelSoal', { id_model: m.id_model }); showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Model soal dihapus.'); viewAdminModelSoal();
    });
  });
}

function openModelSoalForm(m) {
  const isEdit = !!m;
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Model Soal</h3></div>
    <div class="modal-body">
      <div class="field"><label>Nama Model</label><input id="f-nama" value="${isEdit ? esc(m.nama_model) : ''}" placeholder="UTS Ganjil 2025"></div>
      <div class="field"><label>Mata Pelajaran</label><input id="f-mapel" value="${isEdit ? esc(m.mapel) : ''}"></div>
      <div class="field"><label>Jenis Soal</label>
        <select id="f-jenis"><option>Pilihan Ganda</option><option>Esai</option><option>Campuran</option></select>
      </div>
      <div class="field"><label>Jumlah Soal</label><input type="number" id="f-jml" value="${isEdit ? m.jumlah_soal : 40}"></div>
      <div class="field"><label>Bobot per Soal</label><input type="number" step="0.01" id="f-bobot" value="${isEdit ? m.bobot_per_soal : 2.5}"></div>
      <div class="field"><label>Durasi (menit)</label><input type="number" id="f-durasi" value="${isEdit ? m.durasi_menit : 90}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  if (isEdit) document.getElementById('f-jenis').value = m.jenis_soal;
  document.getElementById('btn-save').addEventListener('click', async () => {
    const payload = {
      id_model: m?.id_model, nama_model: document.getElementById('f-nama').value.trim(), mapel: document.getElementById('f-mapel').value.trim(),
      jenis_soal: document.getElementById('f-jenis').value, jumlah_soal: document.getElementById('f-jml').value,
      bobot_per_soal: document.getElementById('f-bobot').value, durasi_menit: document.getElementById('f-durasi').value
    };
    if (!payload.nama_model || !payload.mapel) return showToast('Nama model dan mapel wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateModelSoal' : 'addModelSoal', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal(); showToast('Tersimpan.'); viewAdminModelSoal();
  });
}

// ---------- JADWAL ASESMEN ----------
async function viewAdminJadwal() {
  renderShell('admin', 'admin/jadwal', `<div class="empty-state">[ MEMUAT JADWAL... ]</div>`);
  const [jadwalRes, kelasRes, modelRes] = await Promise.all([apiGet('getJadwalList'), apiGet('getKelasList'), apiGet('getModelSoalList')]);
  if (!jadwalRes.success) return showToast(jadwalRes.message, 'error');
  appState.setCache('kelasList', kelasRes.data); appState.setCache('modelList', modelRes.data);
  renderJadwalTable(jadwalRes.data);
}

function renderJadwalTable(list) {
  const rows = list.map(j => `
    <tr><td>${esc(j.tanggal)}</td><td>${esc(j.hari)}</td><td>${esc(j.jam_ke)}</td><td>${esc(j.mapel)}</td><td>${esc(j.nama_kelas)}</td>
      <td><span class="badge font-mono">${esc(j.token)}</span></td><td><span class="badge ${j.status === 'aktif' ? 'badge-solid' : ''}">${esc(j.status)}</span></td>
      <td><button class="btn btn-secondary" data-edit="${j.id_jadwal}">Ubah</button> <button class="btn btn-danger" data-del="${j.id_jadwal}">Hapus</button></td></tr>`
  ).join('') || '<tr><td colspan="8" class="empty-state">Belum ada jadwal.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Kelola Jadwal Asesmen</h3><button class="btn btn-primary" id="btn-add">+ Tambah Jadwal</button></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Hari</th><th>Jam Ke</th><th>Mapel</th><th>Kelas</th><th>Token</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-add').addEventListener('click', () => openJadwalForm(null));
  list.forEach(j => {
    document.querySelector(`[data-edit="${j.id_jadwal}"]`)?.addEventListener('click', () => openJadwalForm(j));
    document.querySelector(`[data-del="${j.id_jadwal}"]`)?.addEventListener('click', async () => {
      showLoading(true); const r = await apiPost('deleteJadwal', { id_jadwal: j.id_jadwal }); showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Jadwal dihapus.'); viewAdminJadwal();
    });
  });
}

function openJadwalForm(j) {
  const isEdit = !!j;
  const kelasOpt = (appState.getCache('kelasList') || []).map(k => `<option value="${k.id_kelas}" ${j?.id_kelas === k.id_kelas ? 'selected' : ''}>${esc(k.nama_kelas)}</option>`).join('');
  const modelOpt = (appState.getCache('modelList') || []).map(m => `<option value="${m.id_model}" ${j?.id_model === m.id_model ? 'selected' : ''}>${esc(m.nama_model)} (${esc(m.mapel)})</option>`).join('');
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Jadwal Asesmen</h3></div>
    <div class="modal-body">
      <div class="field"><label>Tanggal</label><input type="date" id="f-tgl" value="${isEdit ? j.tanggal : ''}"></div>
      <div class="field"><label>Jam Ke</label><input id="f-jam" value="${isEdit ? esc(j.jam_ke) : 'Sesi 1 (07.30 - 09.00)'}"></div>
      <div class="field"><label>Mata Pelajaran</label><input id="f-mapel" value="${isEdit ? esc(j.mapel) : ''}"></div>
      <div class="field"><label>Kelas</label><select id="f-kelas">${kelasOpt}</select></div>
      <div class="field"><label>Model Soal</label><select id="f-model">${modelOpt}</select></div>
      <div class="field"><label>Durasi (menit)</label><input type="number" id="f-durasi" value="${isEdit ? j.durasi_menit : 90}"></div>
      ${!isEdit ? `<div class="field"><label>Mode Token</label><select id="f-mode"><option value="otomatis">Otomatis (digenerate sistem)</option><option value="manual">Manual</option></select></div>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  document.getElementById('btn-save').addEventListener('click', async () => {
    const payload = {
      id_jadwal: j?.id_jadwal, tanggal: document.getElementById('f-tgl').value, jam_ke: document.getElementById('f-jam').value,
      mapel: document.getElementById('f-mapel').value.trim(), id_kelas: document.getElementById('f-kelas').value,
      id_model: document.getElementById('f-model').value, durasi_menit: document.getElementById('f-durasi').value,
      mode_token: document.getElementById('f-mode')?.value
    };
    if (!payload.tanggal || !payload.mapel || !payload.id_kelas) return showToast('Tanggal, mapel, dan kelas wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateJadwal' : 'addJadwal', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal();
    showToast(isEdit ? 'Jadwal diperbarui.' : ('Jadwal dibuat. Token: ' + res.data.token));
    viewAdminJadwal();
  });
}

// ---------- TOKEN UJIAN ----------
async function viewAdminToken() {
  renderShell('admin', 'admin/token', `<div class="empty-state">[ MEMUAT TOKEN... ]</div>`);
  const res = await apiGet('getTokenList');
  if (!res.success) return showToast(res.message, 'error');
  renderTokenTable(res.data);
}

function renderTokenTable(list) {
  const rows = list.map(t => `
    <tr><td>${esc(t.tanggal)}</td><td>${esc(t.mapel)}</td><td>${esc(t.nama_kelas)}</td>
      <td><span class="badge font-mono" style="letter-spacing:2px;">${esc(t.token)}</span></td><td>${esc(t.mode_token)}</td>
      <td><button class="btn btn-secondary" data-manual="${t.id_jadwal}">Set Manual</button> <button class="btn btn-ghost" data-regen="${t.id_jadwal}">Acak Ulang</button></td></tr>`
  ).join('') || '<tr><td colspan="6" class="empty-state">Belum ada jadwal.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Kelola Token Ujian</h3></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Mapel</th><th>Kelas</th><th>Token</th><th>Mode</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  list.forEach(t => {
    document.querySelector(`[data-manual="${t.id_jadwal}"]`)?.addEventListener('click', () => {
      openModal(`<div class="modal-head"><h3>Set Token Manual</h3></div>
        <div class="modal-body"><div class="field"><label>Token (min. 4 karakter)</label><input id="f-token" style="text-transform:uppercase;letter-spacing:2px;"></div></div>
        <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save-token">Simpan</button></div>`);
      document.getElementById('btn-save-token').addEventListener('click', async () => {
        const tok = document.getElementById('f-token').value.trim();
        showLoading(true); const r = await apiPost('setTokenManual', { id_jadwal: t.id_jadwal, token: tok }); showLoading(false);
        if (!r.success) return showToast(r.message, 'error');
        closeModal(); showToast('Token manual disimpan.'); viewAdminToken();
      });
    });
    document.querySelector(`[data-regen="${t.id_jadwal}"]`)?.addEventListener('click', async () => {
      showLoading(true); const r = await apiPost('regenerateTokenOtomatis', { id_jadwal: t.id_jadwal }); showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Token baru: ' + r.data.token); viewAdminToken();
    });
  });
}

// ---------- CETAK KARTU ASESMEN ----------
async function viewAdminKartu() {
  renderShell('admin', 'admin/kartu', `<div class="empty-state">[ MEMUAT... ]</div>`);
  const res = await apiGet('getJadwalList');
  if (!res.success) return showToast(res.message, 'error');
  const opts = res.data.map(j => `<option value="${j.id_jadwal}">${esc(j.tanggal)} — ${esc(j.mapel)} — ${esc(j.nama_kelas)}</option>`).join('');
  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Kelola & Cetak Kartu Asesmen</h3></div>
      <div class="panel-body">
        <div class="field"><label>Pilih Jadwal</label><select id="f-jadwal">${opts}</select></div>
        <div class="field"><label>Jenis Kartu</label><select id="f-jenis"><option>Kartu Asesmen</option><option>Kartu Ujian</option></select></div>
        <button class="btn btn-primary" id="btn-cetak">🖨 Cetak PDF Sekelas</button>
        <div id="hasil-cetak" style="margin-top:16px;"></div>
      </div>
    </div>`;
  document.getElementById('btn-cetak').addEventListener('click', async () => {
    showLoading(true);
    const r = await apiPost('cetakKartuAsesmen', { id_jadwal: document.getElementById('f-jadwal').value, jenis: document.getElementById('f-jenis').value });
    showLoading(false);
    if (!r.success) return showToast(r.message, 'error');
    document.getElementById('hasil-cetak').innerHTML = `<div class="panel-body" style="border:1px solid #000;">✅ PDF siap. <a href="${r.data.url}" target="_blank">Buka / Unduh PDF</a></div>`;
  });
}

// ---------- UPLOAD TEMPLATE BERKAS ----------
async function viewAdminTemplate() {
  renderShell('admin', 'admin/template', `<div class="empty-state">[ MEMUAT... ]</div>`);
  const res = await apiGet('getTemplateList');
  if (!res.success) return showToast(res.message, 'error');
  renderTemplateList(res.data);
}

function renderTemplateList(list) {
  const rows = list.map(t => `
    <tr><td>${esc(t.nama_file)}</td><td>${esc(t.jenis)}</td><td><a href="${t.url}" target="_blank">Buka</a></td>
      <td><button class="btn btn-danger" data-del="${t.id_template}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada template.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Unggah Template Berkas</h3></div>
      <div class="panel-body">
        <div class="field"><label>Jenis Template</label><select id="f-jenis"><option value="kartu_ujian">Template Kartu Ujian</option><option value="kartu_asesmen">Template Kartu Asesmen</option><option value="lainnya">Lainnya</option></select></div>
        <div class="field" style="border:1.5px dashed #333;padding:20px;text-align:center;">
          <input type="file" id="f-file">
          <div class="uppercase-label" style="margin-top:8px;">DRAG & DROP ATAU PILIH BERKAS [PDF/DOCX/XLSX]</div>
        </div>
        <button class="btn btn-primary" id="btn-upload">Unggah</button>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Daftar Template</h3></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Nama Berkas</th><th>Jenis</th><th>Link</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-upload').addEventListener('click', () => {
    const fileInput = document.getElementById('f-file');
    const file = fileInput.files[0];
    if (!file) return showToast('Pilih berkas terlebih dahulu.', 'error');
    const reader = new FileReader();
    reader.onload = async () => {
      showLoading(true);
      const res = await apiPost('uploadTemplateBerkas', {
        base64: reader.result, nama_file: file.name, mime_type: file.type, jenis: document.getElementById('f-jenis').value
      });
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Template berhasil diunggah.'); viewAdminTemplate();
    };
    reader.readAsDataURL(file);
  });

  list.forEach(t => document.querySelector(`[data-del="${t.id_template}"]`)?.addEventListener('click', async () => {
    showLoading(true); const r = await apiPost('deleteTemplate', { id_template: t.id_template }); showLoading(false);
    if (!r.success) return showToast(r.message, 'error');
    showToast('Template dihapus.'); viewAdminTemplate();
  }));
}
