window.Views = window.Views || {};

Views.renderForm = async function (root) {
  const s = App.session;
  if (!s) return goTo('#/pilih-lokus');
  if (s.jenis === 'observasi') return renderFormObservasi(root, s);
  return renderFormRTL(root, s);
};

async function renderFormObservasi(root, s) {
  const instrumen = s.instrumen;
  const info = INSTRUMEN_INFO[instrumen];

  if (s.hasil) {
    root.innerHTML = `
      <div class="screen">
        <div class="card"><p>Instrumen ${instrumen} untuk lokus ini sudah dikirim.</p>
        <p class="list-row-sub">Kode referensi: ${escapeHtml(s.hasil.kodeReferensi)}</p></div>
        <div class="btn-row"><button class="btn btn-primary" id="btn-selesai">Selesai</button></div>
      </div>
    `;
    document.getElementById('btn-selesai').onclick = function () {
      clearDraft();
      App.session = null;
      goTo('#/pilih-lokus');
    };
    return;
  }

  root.innerHTML = '<div class="screen"><div class="loading-wrap"><span class="spinner"></span> Memuat pertanyaan...</div></div>';
  let pertanyaan, petugasList;
  try {
    const hasil = await Promise.all([cachedPertanyaan(instrumen), cachedPetugas()]);
    pertanyaan = hasil[0];
    petugasList = hasil[1];
  } catch (e) {
    root.innerHTML = '<div class="screen"><div class="empty-hint">Gagal memuat data: ' + escapeHtml(e.message) + '</div>' +
      '<div class="btn-row"><button class="btn btn-ghost" id="btn-balik">Kembali</button></div></div>';
    document.getElementById('btn-balik').onclick = function () { goTo('#/pilih-lokus'); };
    return;
  }

  const idn = s.identity;
  if (!idn.narasumber || !idn.narasumber.length) idn.narasumber = [{ nama: '', jabatan: '' }];
  if (!idn.petugas || !idn.petugas.length) idn.petugas = [{ nama: '', instansi: '' }];

  const pct = hitungPersen(s.jawaban, pertanyaan);
  const deskripsiHtml = info.deskripsi.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
  const roleDatalist = '<datalist id="dl-jabatan-' + instrumen + '">' + info.roleOptions.map(function (r) {
    return '<option value="' + escapeAttr(r) + '">';
  }).join('') + '</datalist>';
  const petugasDatalist = '<datalist id="dl-petugas">' + petugasList.map(function (p) {
    return '<option value="' + escapeAttr(p.nama) + '">';
  }).join('') + '</datalist>';

  const questionFields = pertanyaan.map(function (q, i) {
    return renderQuestionField(q, i, s.jawaban[q.idButir] || '');
  }).join('');

  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Instrumen ${instrumen} &middot; ${escapeHtml(s.lokus.sekolah.nama)}</div>
      <h2 class="section-title">Deskripsi Kegiatan</h2>
      <div class="card" style="font-size:13px; line-height:1.6;">
        <div class="eyebrow" style="margin-bottom:8px;">Target Narasumber: ${escapeHtml(info.targetRole)}</div>
        ${deskripsiHtml}
      </div>

      <h2 class="section-title">Narasumber</h2>
      <div class="card">
        <div id="list-narasumber"></div>
        <button type="button" class="btn btn-outline" id="btn-tambah-ns" style="margin-top:4px;">+ Tambah Narasumber</button>
      </div>

      <h2 class="section-title">Petugas Pelaksana</h2>
      <div class="card">
        <div id="list-petugas"></div>
        <button type="button" class="btn btn-outline" id="btn-tambah-petugas" style="margin-top:4px;">+ Tambah Petugas</button>
      </div>

      <h2 class="section-title">Data Sekolah</h2>
      <div class="card">
        <div class="field"><label for="f-jumlah-siswa">Jumlah Siswa</label><input type="number" id="f-jumlah-siswa" value="${escapeAttr(idn.jumlahSiswa)}"></div>
      </div>

      <h2 class="section-title">Pertanyaan</h2>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${pct}% pertanyaan terisi</div>
      </div>
      <div class="card">${questionFields}</div>

      ${roleDatalist}
      ${petugasDatalist}

      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-balik">Kembali ke Pilih Lokus</button>
        <button class="btn btn-primary" id="btn-submit">Submit Instrumen ${instrumen}</button>
      </div>
    </div>
  `;

  function renderNarasumberRows() {
    const wrap = document.getElementById('list-narasumber');
    wrap.innerHTML = idn.narasumber.map(function (n, i) {
      return '<div class="person-row" data-idx="' + i + '">' +
        '<input type="text" class="ns-nama" placeholder="Nama" value="' + escapeAttr(n.nama) + '">' +
        '<input type="text" class="ns-jabatan" list="dl-jabatan-' + instrumen + '" placeholder="Jabatan" value="' + escapeAttr(n.jabatan) + '">' +
        (idn.narasumber.length > 1 ? '<button type="button" class="btn-hapus-row" data-idx="' + i + '" title="Hapus">&times;</button>' : '') +
        '</div>';
    }).join('');
    wrap.querySelectorAll('.person-row').forEach(function (row) {
      const i = Number(row.dataset.idx);
      row.querySelector('.ns-nama').addEventListener('input', function (e) { idn.narasumber[i].nama = e.target.value; saveDraft(s); });
      row.querySelector('.ns-jabatan').addEventListener('input', function (e) { idn.narasumber[i].jabatan = e.target.value; saveDraft(s); });
    });
    wrap.querySelectorAll('.btn-hapus-row').forEach(function (btn) {
      btn.onclick = function () {
        idn.narasumber.splice(Number(btn.dataset.idx), 1);
        saveDraft(s);
        renderNarasumberRows();
      };
    });
  }

  function renderPetugasRows() {
    const wrap = document.getElementById('list-petugas');
    wrap.innerHTML = idn.petugas.map(function (p, i) {
      return '<div class="person-row" data-idx="' + i + '">' +
        '<input type="text" class="pt-nama" list="dl-petugas" placeholder="Nama Petugas" value="' + escapeAttr(p.nama) + '">' +
        '<input type="text" class="pt-instansi" placeholder="Instansi" value="' + escapeAttr(p.instansi) + '">' +
        (idn.petugas.length > 1 ? '<button type="button" class="btn-hapus-row" data-idx="' + i + '" title="Hapus">&times;</button>' : '') +
        '</div>';
    }).join('');
    wrap.querySelectorAll('.person-row').forEach(function (row) {
      const i = Number(row.dataset.idx);
      const inpNama = row.querySelector('.pt-nama');
      const inpInstansi = row.querySelector('.pt-instansi');
      inpNama.addEventListener('input', function (e) {
        idn.petugas[i].nama = e.target.value;
        const match = petugasList.find(function (pt) { return pt.nama === e.target.value; });
        if (match) {
          idn.petugas[i].instansi = match.instansi;
          inpInstansi.value = match.instansi;
        }
        saveDraft(s);
      });
      inpInstansi.addEventListener('input', function (e) { idn.petugas[i].instansi = e.target.value; saveDraft(s); });
    });
    wrap.querySelectorAll('.btn-hapus-row').forEach(function (btn) {
      btn.onclick = function () {
        idn.petugas.splice(Number(btn.dataset.idx), 1);
        saveDraft(s);
        renderPetugasRows();
      };
    });
  }

  renderNarasumberRows();
  renderPetugasRows();

  document.getElementById('btn-tambah-ns').onclick = function () {
    idn.narasumber.push({ nama: '', jabatan: '' });
    saveDraft(s);
    renderNarasumberRows();
  };
  document.getElementById('btn-tambah-petugas').onclick = function () {
    idn.petugas.push({ nama: '', instansi: '' });
    saveDraft(s);
    renderPetugasRows();
  };

  root.querySelectorAll('[data-qid]').forEach(function (el) {
    el.addEventListener('input', function () {
      s.jawaban[el.dataset.qid] = el.value;
      saveDraft(s);
    });
  });

  document.getElementById('f-jumlah-siswa').addEventListener('input', function (e) { idn.jumlahSiswa = e.target.value; saveDraft(s); });

  document.getElementById('btn-balik').onclick = function () { goTo('#/pilih-lokus'); };
  document.getElementById('btn-submit').onclick = async function () {
    const namaResponden = idn.narasumber.map(function (n) { return n.nama.trim(); }).filter(Boolean);
    const jabatanResponden = idn.narasumber.map(function (n) { return n.jabatan.trim(); }).filter(Boolean);
    const namaPetugas = idn.petugas.map(function (p) { return p.nama.trim(); }).filter(Boolean);
    const instansiPetugas = idn.petugas.map(function (p) { return p.instansi.trim(); }).filter(Boolean);

    if (!namaResponden.length) { alert('Isi minimal satu narasumber.'); return; }
    if (!namaPetugas.length) { alert('Isi minimal satu petugas pelaksana.'); return; }

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
        'Nama Responden': namaResponden.join('; '),
        'Jabatan Responden': jabatanResponden.join('; '),
        'Nama Petugas Pewawancara': namaPetugas.join('; '),
        'Instansi Petugas': instansiPetugas.join('; ')
      };
      const fn = instrumen === 'B1' ? apiSubmitB1 : apiSubmitB2;
      const data = await fn(identity, s.jawaban);
      s.hasil = data;
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

  root.innerHTML = '<div class="screen"><div class="loading-wrap"><span class="spinner"></span> Memuat pertanyaan...</div></div>';
  let pertanyaan;
  try {
    const all = await cachedPertanyaan('RTL');
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
