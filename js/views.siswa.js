// ============================================================
// VIEWS.SISWA.JS — Jadwal (W-17) & Mesin Pengerjaan Soal (W-18..W-20)
// ============================================================

async function viewSiswaJadwal() {
  renderShell('siswa', 'siswa/jadwal', `<div class="empty-state">[ MEMUAT JADWAL... ]</div>`);
  const res = await apiGet('getJadwalSiswa');
  if (!res.success) return showToast(res.message, 'error');
  renderJadwalSiswa(res.data);
}

function renderJadwalSiswa(list) {
  const statusLabel = { belum_dimulai: 'Belum Dimulai', berlangsung: 'Sedang Berlangsung', selesai: 'Selesai' };
  const rows = list.map(j => {
    let btn = '';
    if (j.status !== 'aktif') btn = `<span class="badge">Nonaktif</span>`;
    else if (j.status_pengerjaan === 'selesai') btn = `<span class="badge badge-outline-success">Selesai</span>`;
    else if (j.status_pengerjaan === 'berlangsung') btn = `<button class="btn btn-primary" data-lanjut="${j.id_jadwal}">Lanjutkan Ujian</button>`;
    else btn = `<button class="btn btn-primary" data-mulai="${j.id_jadwal}">Mulai Ujian</button>`;
    return `<tr><td>${esc(j.tanggal)}</td><td>${esc(j.hari)}</td><td>${esc(j.jam_ke)}</td><td>${esc(j.mapel)}</td>
      <td><span class="badge">${statusLabel[j.status_pengerjaan] || j.status_pengerjaan}</span></td><td>${btn}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada jadwal asesmen untuk kelas Anda.</td></tr>';

  document.getElementById('page-content').innerHTML = `
    <div class="panel"><div class="panel-head"><h3>Jadwal Asesmen Saya</h3></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Hari</th><th>Jam Ke</th><th>Mapel</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;

  list.forEach(j => {
    document.querySelector(`[data-mulai="${j.id_jadwal}"]`)?.addEventListener('click', () => openTokenModal(j));
    document.querySelector(`[data-lanjut="${j.id_jadwal}"]`)?.addEventListener('click', () => openTokenModal(j));
  });
}

function openTokenModal(jadwal) {
  openModal(`
    <div class="modal-head"><h3>Masuk Asesmen — ${esc(jadwal.mapel)}</h3></div>
    <div class="modal-body">
      <p>Masukkan token ujian yang diberikan pengawas/admin.</p>
      <div class="field"><label>Token Ujian</label><input id="f-token" class="font-mono" style="text-transform:uppercase;letter-spacing:4px;text-align:center;font-size:1.2rem;" maxlength="8"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-masuk">Masuk</button></div>`);
  document.getElementById('btn-masuk').addEventListener('click', async () => {
    const token = document.getElementById('f-token').value.trim();
    if (!token) return showToast('Token wajib diisi.', 'error');
    showLoading(true);
    const res = await apiPost('validateTokenUjian', { id_jadwal: jadwal.id_jadwal, token: token });
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    closeModal();
    startExam(res.data.id_hasil);
  });
}

// ---------- MESIN UJIAN ----------
const examSession = {
  idHasil: null, soal: [], current: 0, sisaDetik: 0, timerHandle: null, autosaveHandle: null,
  dirty: {}, // { id_soal: {jawaban, status} } — perubahan yg belum tersinkron ke server
};

async function startExam(idHasil) {
  showLoading(true);
  const res = await apiGet('getSoalUjian', { id_hasil: idHasil });
  showLoading(false);
  if (!res.success) { showToast(res.message, 'error'); return Router.go('siswa/jadwal'); }

  examSession.idHasil = idHasil;
  examSession.soal = res.data.soal;
  examSession.sisaDetik = res.data.sisa_detik;
  examSession.current = 0;
  examSession.dirty = {};

  // Pulihkan draft lokal (jaga-jaga koneksi sempat putus sebelumnya)
  const draft = ExamDraft.load(idHasil);
  examSession.soal.forEach(s => { if (draft[s.id_soal]) { s.jawaban = draft[s.id_soal].jawaban; s.status = draft[s.id_soal].status; } });

  renderExamShell();
  startExamTimer();
  startAutosaveLoop();
}

function startExamTimer() {
  clearInterval(examSession.timerHandle);
  examSession.timerHandle = setInterval(() => {
    examSession.sisaDetik = Math.max(0, examSession.sisaDetik - 1);
    updateTimerDisplay();
    if (examSession.sisaDetik === 0) {
      clearInterval(examSession.timerHandle);
      showToast('Waktu habis! Jawaban Anda disubmit otomatis.', 'error');
      doSubmit(true);
    }
  }, 1000);
}

function startAutosaveLoop() {
  clearInterval(examSession.autosaveHandle);
  examSession.autosaveHandle = setInterval(() => flushAutosave(), 8000); // batch tiap 8 detik (bukan per-klik)
}

function flushAutosave() {
  const changes = Object.keys(examSession.dirty).map(id => ({ id_soal: id, jawaban: examSession.dirty[id].jawaban, status: examSession.dirty[id].status }));
  if (!changes.length) return;
  apiPostBackground('autosaveJawaban', { id_hasil: examSession.idHasil, perubahan: changes });
  examSession.dirty = {}; // optimistic: anggap tersinkron; localStorage tetap jadi cadangan
}

function markDirty(soal) {
  examSession.dirty[soal.id_soal] = { jawaban: soal.jawaban, status: soal.status };
  // Optimistic UI + localStorage (gas-instant-ux prinsip #2)
  const draft = ExamDraft.load(examSession.idHasil);
  draft[soal.id_soal] = { jawaban: soal.jawaban, status: soal.status };
  ExamDraft.save(examSession.idHasil, draft);
}

function updateTimerDisplay() {
  const el = document.getElementById('exam-timer-val');
  if (!el) return;
  const m = Math.floor(examSession.sisaDetik / 3600), mm = Math.floor((examSession.sisaDetik % 3600) / 60), ss = examSession.sisaDetik % 60;
  el.textContent = String(m).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
  const box = document.getElementById('exam-timer-box');
  if (box) box.classList.toggle('low-time', examSession.sisaDetik <= 300);
}

function renderExamShell() {
  document.getElementById('app').innerHTML = `
    <div class="exam-shell">
      <div class="exam-topbar">
        <div>
          <div class="uppercase-label">[MAPEL: ${esc(examSession.soal.length ? (appState.session.profile.mapel||'') : '')}] ASESMEN ONLINE</div>
          <div style="font-weight:700;">Peserta: ${esc(appState.session.profile.nama)} (NISN: ${esc(appState.session.profile.nisn)})</div>
        </div>
        <div id="exam-timer-box" class="exam-timer"><span>⏱ SISA WAKTU</span><span id="exam-timer-val" class="font-mono">--:--:--</span></div>
      </div>
      <div class="exam-body">
        <div class="exam-main" id="exam-main"></div>
        <div class="exam-rail" id="exam-rail"></div>
      </div>
    </div>`;
  updateTimerDisplay();
  renderCurrentQuestion();
  renderPalette();
}

function renderCurrentQuestion() {
  const s = examSession.soal[examSession.current];
  if (!s) return;
  const opsiHtml = Object.entries(s.opsi).filter(([k,v]) => v).map(([k, v]) => `
    <div class="option-row ${s.jawaban === k ? 'selected' : ''}" data-opt="${k}">
      <span class="option-mark"></span><strong>${k}.</strong> ${esc(v)}
    </div>`).join('');

  document.getElementById('exam-main').innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>SOAL NOMOR ${s.nomor}</h3>
        <span class="badge">BOBOT: ${s.bobot}</span>
      </div>
      <div class="panel-body">
        <p style="font-size:1rem;line-height:1.6;">${esc(s.teks_soal)}</p>
        <div style="margin-top:16px;">${opsiHtml}</div>
      </div>
    </div>
    <div class="exam-navbtns">
      <button class="btn btn-secondary" id="btn-prev" ${examSession.current === 0 ? 'disabled' : ''}>← Sebelumnya</button>
      <button class="btn btn-secondary" id="btn-ragu">[?] Ragu-ragu</button>
      <button class="btn btn-primary" id="btn-next">Simpan & Lanjutkan →</button>
    </div>`;

  document.querySelectorAll('.option-row').forEach(row => row.addEventListener('click', () => {
    s.jawaban = row.dataset.opt;
    if (s.status === 'belum') s.status = 'terjawab';
    markDirty(s);
    renderCurrentQuestion();
    renderPalette();
  }));

  document.getElementById('btn-prev').addEventListener('click', () => { examSession.current--; renderCurrentQuestion(); renderPalette(); });
  document.getElementById('btn-ragu').addEventListener('click', () => {
    s.status = s.status === 'ragu' ? (s.jawaban ? 'terjawab' : 'belum') : 'ragu';
    markDirty(s);
    renderCurrentQuestion(); renderPalette();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (s.jawaban && s.status === 'belum') { s.status = 'terjawab'; markDirty(s); }
    if (examSession.current < examSession.soal.length - 1) examSession.current++;
    renderCurrentQuestion(); renderPalette();
  });
}

function renderPalette() {
  const terjawab = examSession.soal.filter(s => s.status === 'terjawab').length;
  const ragu = examSession.soal.filter(s => s.status === 'ragu').length;
  const belum = examSession.soal.length - terjawab - ragu;

  const cells = examSession.soal.map((s, idx) => `
    <div class="palette-cell ${s.status === 'terjawab' ? 'answered' : ''} ${s.status === 'ragu' ? 'ragu' : ''} ${idx === examSession.current ? 'active' : ''}" data-goto="${idx}">${s.nomor}</div>`
  ).join('');

  document.getElementById('exam-rail').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>NAVIGASI SOAL [${examSession.soal.length} BUTIR]</h3></div>
      <div class="panel-body">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:8px;" class="font-mono">
          <span>Terjawab: ${terjawab}</span><span>Ragu: ${ragu}</span><span>Belum: ${belum}</span>
        </div>
        <div class="palette-grid">${cells}</div>
        <div style="margin-top:16px;font-size:.75rem;" class="font-mono">
          <div>■ Terjawab &nbsp; ▢ Ragu-ragu &nbsp; □ Belum</div>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:16px;" id="btn-submit">✓ SELESAIKAN UJIAN (SUBMIT)</button>
        <p style="font-size:.7rem;color:var(--on-surface-variant);margin-top:8px;">Hanya dapat diklik setelah semua soal ditinjau.</p>
      </div>
    </div>`;

  document.querySelectorAll('.palette-cell').forEach(c => c.addEventListener('click', () => { examSession.current = Number(c.dataset.goto); renderCurrentQuestion(); renderPalette(); }));
  document.getElementById('btn-submit').addEventListener('click', () => confirmSubmit());
}

function confirmSubmit() {
  const belum = examSession.soal.filter(s => s.status !== 'terjawab');
  if (belum.length > 0) {
    openModal(`
      <div class="modal-head"><h3>⚠ Lengkapi Semua Soal</h3></div>
      <div class="modal-body">Masih ada <strong>${belum.length}</strong> soal berstatus belum terjawab/ragu-ragu final. Lengkapi semua soal sebelum mengakhiri asesmen.</div>
      <div class="modal-foot"><button class="btn btn-primary" onclick="closeModal()">Kembali ke Soal</button></div>`);
    return;
  }
  openModal(`
    <div class="modal-head"><h3>Selesaikan Ujian?</h3></div>
    <div class="modal-body">Semua soal sudah terjawab. Setelah disubmit, jawaban tidak dapat diubah kembali.</div>
    <div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="btn-confirm-submit">Ya, Submit Sekarang</button></div>`);
  document.getElementById('btn-confirm-submit').addEventListener('click', () => doSubmit(false));
}

async function doSubmit(paksa) {
  closeModal();
  clearInterval(examSession.timerHandle);
  clearInterval(examSession.autosaveHandle);
  const changes = examSession.soal.map(s => ({ id_soal: s.id_soal, jawaban: s.jawaban, status: s.status }));
  showLoading(true);
  const res = await apiPost('submitUjian', { id_hasil: examSession.idHasil, perubahan: changes, paksa_submit: paksa });
  showLoading(false);
  if (!res.success) {
    showToast(res.message, 'error');
    if (res.code === 'BELUM_LENGKAP') { startExamTimer(); startAutosaveLoop(); return; }
    return Router.go('siswa/jadwal');
  }
  ExamDraft.clear(examSession.idHasil);
  renderKonfirmasiSelesai(res.data);
}

function renderKonfirmasiSelesai(data) {
  document.getElementById('app').innerHTML = `
    <div class="auth-shell">
      <div class="auth-card" style="max-width:420px;text-align:center;">
        <div class="auth-topbar"><span>SYS_STATUS // DONE</span><span>OK</span></div>
        <div class="auth-body">
          <div style="font-size:2.5rem;">✓</div>
          <h2>Asesmen Selesai</h2>
          <p>Jawaban Anda telah tersimpan dan dinilai otomatis oleh sistem.</p>
          <table style="margin:0 auto;">
            <tr><td class="uppercase-label">Nilai Akhir</td><td class="font-mono" style="font-weight:700;font-size:1.3rem;">${data.nilai_akhir}</td></tr>
            <tr><td class="uppercase-label">Durasi Pengerjaan</td><td class="font-mono">${fmtDuration(data.durasi_detik)}</td></tr>
          </table>
          <button class="btn btn-primary btn-block" id="btn-kembali">Kembali ke Jadwal</button>
        </div>
      </div>
    </div>`;
  document.getElementById('btn-kembali').addEventListener('click', () => Router.go('siswa/jadwal'));
}
