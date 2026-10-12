// ============================================================
// VIEWS.GURU.JS — Halaman-halaman Panel Guru (W-12..W-16)
// ============================================================

async function viewGuruDashboard() {
  renderShell('guru', 'guru/dashboard', `<div class="empty-state">[ MEMUAT DASHBOARD... ]</div>`);
  const res = await apiGet('getGuruDashboardSummary');
  if (!res.success) return showToast(res.message, 'error');
  const d = res.data;
  const rows = (d.jadwal_mendatang || []).map(j => `<tr><td>${esc(j.tanggal)}</td><td>${esc(j.hari)}</td><td>${esc(j.jam_ke)}</td></tr>`).join('')
    || '<tr><td colspan="3" class="empty-state">Belum ada jadwal mendatang.</td></tr>';
  document.getElementById('page-content').innerHTML = `
    <div class="grid grid-3">
      <div class="metric-card"><div class="label">MAPEL DIAMPU</div><div class="num" style="font-size:1.1rem;">${esc(d.mapel)}</div></div>
      <div class="metric-card"><div class="label">BANK SOAL</div><div class="num">${d.jumlah_soal}</div><div class="label">Soal Tersimpan</div></div>
    </div>
    <div class="panel" style="margin-top:16px;"><div class="panel-head"><h3>Jadwal Ujian Mendatang</h3></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Tanggal</th><th>Hari</th><th>Jam Ke</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}

// ---------- BUAT/KELOLA SOAL ----------
async function viewGuruSoal() {
  renderShell('guru', 'guru/soal', `<div class="empty-state">[ MEMUAT BANK SOAL... ]</div>`);
  const [soalRes, modelRes] = await Promise.all([apiGet('getBankSoalList'), apiGet('getModelSoalList')]);
  if (!soalRes.success) return showToast(soalRes.message, 'error');
  appState.setCache('modelListGuru', modelRes.data || []);
  renderSoalTable(soalRes.data);
}

function renderSoalTable(list) {
  const rows = list.sort((a,b)=>a.nomor-b.nomor).map(s => `
    <tr><td class="num">${s.nomor}</td><td>${esc(String(s.teks_soal).slice(0,60))}${String(s.teks_soal).length>60?'…':''}</td>
      <td><span class="badge">${esc(s.kunci_jawaban)}</span></td><td class="num">${s.bobot}</td>
      <td><button class="btn btn-secondary" data-edit="${s.id_soal}">Ubah</button> <button class="btn btn-danger" data-del="${s.id_soal}">Hapus</button></td></tr>`
  ).join('') || '<tr><td colspan="5" class="empty-state">Belum ada soal. Mulai tambahkan soal untuk mapel Anda.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Buat & Kelola Soal</h3><button class="btn btn-primary" id="btn-add">+ Tambah Soal</button></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th class="num">No</th><th>Teks Soal</th><th>Kunci</th><th class="num">Bobot</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  document.getElementById('btn-add').addEventListener('click', () => openSoalForm(null));
  list.forEach(s => {
    document.querySelector(`[data-edit="${s.id_soal}"]`)?.addEventListener('click', () => openSoalForm(s));
    document.querySelector(`[data-del="${s.id_soal}"]`)?.addEventListener('click', async () => {
      showLoading(true); const r = await apiPost('deleteSoal', { id_soal: s.id_soal }); showLoading(false);
      if (!r.success) return showToast(r.message, 'error');
      showToast('Soal dihapus.'); viewGuruSoal();
    });
  });
}

function openSoalForm(s) {
  const isEdit = !!s;
  const opsi = isEdit ? JSON.parse(s.opsi_json || '{}') : {};
  const modelOpt = (appState.getCache('modelListGuru') || []).map(m => `<option value="${m.id_model}" ${s?.id_model === m.id_model ? 'selected' : ''}>${esc(m.nama_model)}</option>`).join('');
  openModal(`
    <div class="modal-head"><h3>${isEdit ? 'Ubah' : 'Tambah'} Soal</h3></div>
    <div class="modal-body">
      <div class="field"><label>Model Soal</label><select id="f-model">${modelOpt}</select></div>
      <div class="field"><label>Nomor Soal</label><input type="number" id="f-nomor" value="${isEdit ? s.nomor : ''}"></div>
      <div class="field"><label>Teks Soal</label><textarea id="f-teks" rows="3">${isEdit ? esc(s.teks_soal) : ''}</textarea></div>
      <div class="field"><label>Opsi A</label><input id="f-a" value="${esc(opsi.A||'')}"></div>
      <div class="field"><label>Opsi B</label><input id="f-b" value="${esc(opsi.B||'')}"></div>
      <div class="field"><label>Opsi C</label><input id="f-c" value="${esc(opsi.C||'')}"></div>
      <div class="field"><label>Opsi D</label><input id="f-d" value="${esc(opsi.D||'')}"></div>
      <div class="field"><label>Opsi E</label><input id="f-e" value="${esc(opsi.E||'')}"></div>
      <div class="field"><label>Kunci Jawaban</label><select id="f-kunci"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select></div>
      <div class="field"><label>Bobot Nilai</label><input type="number" step="0.1" id="f-bobot" value="${isEdit ? s.bobot : 2.5}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  if (isEdit) document.getElementById('f-kunci').value = s.kunci_jawaban;

  document.getElementById('btn-save').addEventListener('click', async () => {
    const selectedModel = (appState.getCache('modelListGuru') || []).find(m => m.id_model === document.getElementById('f-model').value);
    const payload = {
      id_soal: s?.id_soal, id_model: document.getElementById('f-model').value,
      mapel: selectedModel ? selectedModel.mapel : (s ? s.mapel : appState.session.profile.mapel),
      nomor: document.getElementById('f-nomor').value, teks_soal: document.getElementById('f-teks').value.trim(),
      opsi: { A: document.getElementById('f-a').value, B: document.getElementById('f-b').value, C: document.getElementById('f-c').value, D: document.getElementById('f-d').value, E: document.getElementById('f-e').value },
      kunci_jawaban: document.getElementById('f-kunci').value, bobot: document.getElementById('f-bobot').value
    };
    if (!payload.teks_soal) return showToast('Teks soal wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost(isEdit ? 'updateSoal' : 'addSoal', payload);
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal(); showToast('Tersimpan.'); viewGuruSoal();
  });
}

// ---------- REKAP NILAI ----------
async function viewGuruRekap() {
  renderShell('guru', 'guru/rekap', `<div class="empty-state">[ MEMUAT... ]</div>`);
  const res = await apiGet('getJadwalList');
  if (!res.success) return showToast(res.message, 'error');
  const opts = res.data.map(j => `<option value="${j.id_jadwal}">${esc(j.tanggal)} — ${esc(j.mapel)} — ${esc(j.nama_kelas)}</option>`).join('');
  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Rekap Nilai</h3></div>
      <div class="panel-body">
        <div class="field"><label>Pilih Sesi Jadwal</label><select id="f-jadwal">${opts}</select></div>
        <button class="btn btn-primary" id="btn-load">Tampilkan Rekap</button>
        <button class="btn btn-secondary" id="btn-excel" style="display:none;">⬇ Unduh Excel</button>
      </div>
    </div>
    <div id="rekap-result"></div>`;

  document.getElementById('btn-load').addEventListener('click', loadRekap);
  async function loadRekap() {
    const idJadwal = document.getElementById('f-jadwal').value;
    if (!idJadwal) return;
    showLoading(true);
    const r = await apiGet('getRekapNilai', { id_jadwal: idJadwal });
    showLoading(false);
    if (!r.success) return showToast(r.message, 'error');
    renderRekapResult(r.data, idJadwal);
    document.getElementById('btn-excel').style.display = 'inline-flex';
    document.getElementById('btn-excel').onclick = async () => {
      showLoading(true);
      const ex = await apiPost('exportRekapNilaiExcel', { id_jadwal: idJadwal });
      showLoading(false);
      if (!ex.success) return showToast(ex.message, 'error');
      window.open(ex.data.url, '_blank');
    };
  }
}

function renderRekapResult(data, idJadwal) {
  const h = data.header;
  const rows = data.tabel.map(r => `
    <tr><td class="num">${r.no}</td><td class="font-mono">${esc(r.nisn)}</td><td>${esc(r.nama)}</td>
      <td class="num">${r.nilai}</td><td><span class="badge">${esc(r.status)}</span></td>
      <td><button class="btn btn-ghost" data-catatan="${r.nisn}">${r.catatan_guru ? 'Lihat/Ubah Catatan' : '+ Catatan'}</button></td></tr>`
  ).join('');

  document.getElementById('rekap-result').innerHTML = `
    <div class="panel" style="margin-top:16px;">
      <div class="panel-head"><h3>Mapel: ${esc(h.mapel)} — Kelas: ${esc(h.kelas)}</h3><span class="uppercase-label">${esc(h.hari)}, ${esc(h.tanggal)}</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>No</th><th>NISN</th><th>Nama</th><th class="num">Nilai</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  data.tabel.forEach(r => document.querySelector(`[data-catatan="${r.nisn}"]`)?.addEventListener('click', () => openCatatanForm(r, idJadwal)));
}

function openCatatanForm(r, idJadwal) {
  openModal(`
    <div class="modal-head"><h3>Catatan untuk ${esc(r.nama)}</h3></div>
    <div class="modal-body"><div class="field"><label>Catatan</label><textarea id="f-catatan" rows="4">${esc(r.catatan_guru||'')}</textarea></div></div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-save">Simpan</button></div>`);
  document.getElementById('btn-save').addEventListener('click', async () => {
    showLoading(true);
    const res = await apiPost('tambahCatatanSiswa', { nisn: r.nisn, id_jadwal: idJadwal, catatan: document.getElementById('f-catatan').value });
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal(); showToast('Catatan tersimpan.');
    document.getElementById('btn-load').click();
  });
}

// ---------- CATATAN SISWA (ringkasan terpisah, memakai alur sama dengan rekap) ----------
async function viewGuruCatatan() {
  renderShell('guru', 'guru/catatan', '');
  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-body empty-state">
      Catatan siswa ditambahkan langsung dari halaman <strong>Rekap Nilai</strong> — pilih sesi jadwal, lalu klik "+ Catatan" pada baris siswa yang dituju.
    </div></div>
    <button class="btn btn-primary" id="btn-go-rekap">Buka Rekap Nilai</button>`;
  document.getElementById('btn-go-rekap').addEventListener('click', () => Router.go('guru/rekap'));
}
