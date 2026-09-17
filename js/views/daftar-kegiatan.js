window.Views = window.Views || {};

function labelStatusFgd(s) {
  return s === 'selesai' ? 'Lengkap' : s === 'proses' ? 'Proses' : 'Belum';
}

Views.renderDaftarKegiatan = async function (root) {
  const s = App.session;
  if (!s) return goTo('#/pilih-lokus');

  if (s.hasil) {
    const rowsTerkirim = (s.hasil.rows || []).map(function (r) {
      return '<div class="list-row"><div class="list-row-title">' + escapeHtml(r.kodeReferensi) + '</div><div class="list-row-sub">' + escapeHtml(r.timestamp) + '</div></div>';
    }).join('');
    root.innerHTML = `
      <div class="screen">
        <h2 class="section-title">Sudah Terkirim</h2>
        <div class="card">${rowsTerkirim}</div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-baru">Isi Lokus Lain</button>
        </div>
      </div>
    `;
    document.getElementById('btn-baru').onclick = function () {
      clearDraft();
      App.session = null;
      goTo('#/pilih-lokus');
    };
    return;
  }

  root.innerHTML = '<div class="screen"><div class="loading-wrap"><span class="spinner"></span> Memuat pertanyaan...</div></div>';
  let pertanyaan;
  try {
    const all = await cachedPertanyaan('RTL');
    pertanyaan = all.filter(function (q) { return q.idButir !== 'RTL-01'; });
  } catch (e) {
    root.innerHTML = '<div class="screen"><div class="empty-hint">Gagal memuat data: ' + escapeHtml(e.message) + '</div></div>';
    return;
  }

  let rows = '';
  s.kegiatan.forEach(function (keg, i) {
    const status = statusDari(keg.jawaban, pertanyaan);
    const judul = keg.jawaban['RTL-02'] ? escapeHtml(keg.jawaban['RTL-02']) : 'Kegiatan #' + (i + 1);
    rows += '<div class="list-row" data-idx="' + i + '">' +
      '<div><span class="dot-fgd"></span><span class="list-row-title">' + judul + '</span>' +
      '<div class="list-row-sub">Kegiatan #' + (i + 1) + '</div></div>' +
      '<span class="badge badge-' + status + '">' + labelStatusFgd(status) + '</span></div>';
  });
  if (s.kegiatan.length === 0) {
    rows = '<div class="empty-hint">Belum ada kegiatan. Tambahkan minimal satu.</div>';
  }

  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Langkah 2 dari 3</div>
      <h2 class="section-title">${escapeHtml(s.lokus.namaOPD)}</h2>
      <div class="list-row-sub" style="margin-bottom:16px;">${escapeHtml(s.lokus.provinsi)}</div>
      <div class="card">${rows}</div>
      <button class="btn btn-tambah-kegiatan" id="btn-tambah" style="width:100%;margin-bottom:16px;">+ Tambah Kegiatan</button>
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-ganti">Ganti Lokus</button>
        <button class="btn btn-primary" id="btn-submit" ${s.kegiatan.length === 0 ? 'disabled' : ''}>Submit Semua Kegiatan</button>
      </div>
    </div>
  `;

  root.querySelectorAll('.list-row[data-idx]').forEach(function (el) {
    el.onclick = function () {
      App.activeKegiatanIndex = Number(el.dataset.idx);
      goTo('#/form');
    };
  });

  document.getElementById('btn-tambah').onclick = function () {
    s.kegiatan.push({ jawaban: {} });
    saveDraft(s);
    App.activeKegiatanIndex = s.kegiatan.length - 1;
    goTo('#/form');
  };

  document.getElementById('btn-ganti').onclick = function () {
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };

  const btnSubmit = document.getElementById('btn-submit');
  if (btnSubmit) {
    btnSubmit.onclick = async function () {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Mengirim...';
      try {
        const identity = {
          'Provinsi': s.lokus.provinsi,
          'Nama OPD': s.lokus.namaOPD,
          'Alamat OPD': s.lokus.alamatOPD
        };
        const kegiatanPayload = s.kegiatan.map(function (k) { return k.jawaban; });
        const data = await apiSubmitRTL(identity, kegiatanPayload);
        s.hasil = data;
        saveDraft(s);
        if (data.file && data.file.base64) {
          downloadBase64Xlsx(data.file.fileName, data.file.base64);
        }
        App.lastKonfirmasi = { tipe: 'rtl', data: data };
        goTo('#/konfirmasi');
      } catch (e) {
        alert('Gagal submit: ' + e.message);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submit Semua Kegiatan';
      }
    };
  }
};
