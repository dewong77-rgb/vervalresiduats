window.Views = window.Views || {};

Views.renderForm = async function (root) {
  const s = App.session;
  if (!s) return goTo('#/pilih-lokus');
  if (s.jenis === 'observasi') return renderFormObservasi(root, s);
  return renderFormRTL(root, s);
};

async function renderFormObservasi(root, s) {
  const instrumen = App.activeInstrumen;
  if (!instrumen) return goTo('#/checklist-instrumen');
  const slot = s.perInstrumen[instrumen];

  if (slot.hasil) {
    root.innerHTML = `
      <div class="screen">
        <div class="card"><p>Instrumen ${instrumen} untuk lokus ini sudah dikirim.</p>
        <p class="list-row-sub">Kode referensi: ${escapeHtml(slot.hasil.kodeReferensi)}</p></div>
        <div class="btn-row"><button class="btn btn-primary" id="btn-balik">Kembali</button></div>
      </div>
    `;
    document.getElementById('btn-balik').onclick = function () { goTo('#/checklist-instrumen'); };
    return;
  }

  root.innerHTML = '<div class="screen"><p class="empty-hint">Memuat pertanyaan...</p></div>';
  let pertanyaan, petugasList;
  try {
    const hasil = await Promise.all([apiGetPertanyaan(instrumen), apiGetPetugas()]);
    pertanyaan = hasil[0];
    petugasList = hasil[1];
  } catch (e) {
    root.innerHTML = '<div class="screen"><div class="empty-hint">Gagal memuat data: ' + escapeHtml(e.message) + '</div>' +
      '<div class="btn-row"><button class="btn btn-ghost" id="btn-balik">Kembali</button></div></div>';
    document.getElementById('btn-balik').onclick = function () { goTo('#/checklist-instrumen'); };
    return;
  }

  const idn = slot.identity;
  const pct = hitungPersen(slot.jawaban, pertanyaan);
  const petugasOptions = petugasList.map(function (p) {
    return '<option value="' + escapeAttr(p.nama) + '" data-instansi="' + escapeAttr(p.instansi) + '"' +
      (idn.namaPetugas === p.nama && !idn.petugasLainnya ? ' selected' : '') + '>' + escapeHtml(p.nama) + '</option>';
  }).join('');

  const questionFields = pertanyaan.map(function (q, i) {
    return renderQuestionField(q, i, slot.jawaban[q.idButir] || '');
  }).join('');

  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Instrumen ${instrumen} &middot; ${escapeHtml(s.lokus.sekolah.nama)}</div>
      <h2 class="section-title">Identitas Responden</h2>
      <div class="card">
        <div class="field"><label for="f-nama-responden">Nama Responden</label><input type="text" id="f-nama-responden" value="${escapeAttr(idn.namaResponden)}"></div>
        <div class="field"><label for="f-jabatan-responden">Jabatan Responden</label><input type="text" id="f-jabatan-responden" value="${escapeAttr(idn.jabatanResponden)}" placeholder="Contoh: Kepala Sekolah, Guru BK, Operator"></div>
        <div class="field"><label for="f-jumlah-siswa">Jumlah Siswa</label><input type="number" id="f-jumlah-siswa" value="${escapeAttr(idn.jumlahSiswa)}"></div>
        <div class="field">
          <label for="f-petugas-nama">Nama Petugas Pewawancara</label>
          <select id="f-petugas-nama">
            <option value="">Pilih...</option>
            ${petugasOptions}
            <option value="__lainnya__" ${idn.petugasLainnya ? 'selected' : ''}>Lainnya (isi manual)</option>
          </select>
        </div>
        <div class="field" id="wrap-petugas-manual" style="display:${idn.petugasLainnya ? 'block' : 'none'};">
          <label for="f-petugas-manual">Nama Petugas (manual)</label>
          <input type="text" id="f-petugas-manual" value="${escapeAttr(idn.petugasLainnya ? idn.namaPetugas : '')}">
        </div>
        <div class="field"><label for="f-instansi-petugas">Instansi Petugas</label><input type="text" id="f-instansi-petugas" value="${escapeAttr(idn.instansiPetugas)}"></div>
      </div>

      <h2 class="section-title">Pertanyaan</h2>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${pct}% pertanyaan terisi</div>
      </div>
      <div class="card">${questionFields}</div>

      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-balik">Kembali ke Checklist</button>
        <button class="btn btn-primary" id="btn-submit">Submit Instrumen ${instrumen}</button>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-qid]').forEach(function (el) {
    el.addEventListener('input', function () {
      slot.jawaban[el.dataset.qid] = el.value;
      saveDraft(s);
    });
  });

  document.getElementById('f-nama-responden').addEventListener('input', function (e) { idn.namaResponden = e.target.value; saveDraft(s); });
  document.getElementById('f-jabatan-responden').addEventListener('input', function (e) { idn.jabatanResponden = e.target.value; saveDraft(s); });
  document.getElementById('f-jumlah-siswa').addEventListener('input', function (e) { idn.jumlahSiswa = e.target.value; saveDraft(s); });
  document.getElementById('f-instansi-petugas').addEventListener('input', function (e) { idn.instansiPetugas = e.target.value; saveDraft(s); });

  const selPetugas = document.getElementById('f-petugas-nama');
  const wrapManual = document.getElementById('wrap-petugas-manual');
  const inpManual = document.getElementById('f-petugas-manual');
  selPetugas.addEventListener('change', function () {
    if (selPetugas.value === '__lainnya__') {
      idn.petugasLainnya = true;
      idn.namaPetugas = inpManual.value;
      wrapManual.style.display = 'block';
    } else {
      idn.petugasLainnya = false;
      idn.namaPetugas = selPetugas.value;
      const opt = selPetugas.selectedOptions[0];
      idn.instansiPetugas = opt ? (opt.dataset.instansi || '') : '';
      document.getElementById('f-instansi-petugas').value = idn.instansiPetugas;
      wrapManual.style.display = 'none';
    }
    saveDraft(s);
  });
  inpManual.addEventListener('input', function () { idn.namaPetugas = inpManual.value; saveDraft(s); });

  document.getElementById('btn-balik').onclick = function () { goTo('#/checklist-instrumen'); };
  document.getElementById('btn-submit').onclick = async function () {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Mengirim...';
    try {
      const identity = {
        'Provinsi': s.lokus.provinsi,
        'Kab/Kota': s.lokus.kabKota,
        'Nama Sekolah': s.lokus.sekolah.nama,
        'NPSN': s.lokus.sekolah.npsn,
        'Jumlah Siswa': isNaN(Number(idn.jumlahSiswa)) || idn.jumlahSiswa === '' ? idn.jumlahSiswa : Number(idn.jumlahSiswa),
        'Nama Responden': idn.namaResponden,
        'Jabatan Responden': idn.jabatanResponden,
        'Nama Petugas Pewawancara': idn.namaPetugas,
        'Instansi Petugas': idn.instansiPetugas
      };
      const fn = instrumen === 'B1' ? apiSubmitB1 : apiSubmitB2;
      const data = await fn(identity, slot.jawaban);
      slot.hasil = data;
      saveDraft(s);
      App.lastKonfirmasi = { tipe: 'instrumen', instrumen: instrumen, data: data };
      goTo('#/konfirmasi');
    } catch (e) {
      alert('Gagal submit: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'Submit Instrumen ' + instrumen;
    }
  };
}

async function renderFormRTL(root, s) {
  const idx = App.activeKegiatanIndex;
  if (idx === null || idx === undefined || !s.kegiatan[idx]) return goTo('#/daftar-kegiatan');
  const keg = s.kegiatan[idx];

  root.innerHTML = '<div class="screen"><p class="empty-hint">Memuat pertanyaan...</p></div>';
  let pertanyaan;
  try {
    const all = await apiGetPertanyaan('RTL');
    pertanyaan = all.filter(function (q) { return q.idButir !== 'RTL-01'; });
  } catch (e) {
    root.innerHTML = '<div class="screen"><div class="empty-hint">Gagal memuat data: ' + escapeHtml(e.message) + '</div>' +
      '<div class="btn-row"><button class="btn btn-ghost" id="btn-balik">Kembali</button></div></div>';
    document.getElementById('btn-balik').onclick = function () { goTo('#/daftar-kegiatan'); };
    return;
  }

  const pct = hitungPersen(keg.jawaban, pertanyaan);
  const fields = pertanyaan.map(function (q, i) {
    return renderQuestionField(q, i, keg.jawaban[q.idButir] || '');
  }).join('');

  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Kegiatan RTL #${idx + 1} &middot; ${escapeHtml(s.lokus.namaOPD)}</div>
      <h2 class="section-title">Isi Kegiatan</h2>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${pct}% pertanyaan terisi</div>
      </div>
      <div class="card">${fields}</div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-balik">Kembali ke Daftar Kegiatan</button>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-qid]').forEach(function (el) {
    el.addEventListener('input', function () {
      keg.jawaban[el.dataset.qid] = el.value;
      saveDraft(s);
    });
  });
  document.getElementById('btn-balik').onclick = function () { goTo('#/daftar-kegiatan'); };
}
