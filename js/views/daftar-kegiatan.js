window.Views = window.Views || {};

Views.renderDaftarKegiatan = function (root) {
  const s = App.session;
  const wrap = document.createElement('div');
  wrap.className = 'screen accent-fgd';

  const editMode = !!s.editMode;

  let listHtml = '';
  if (!s.kegiatan.length) {
    listHtml = '<div class="empty-hint">Belum ada kegiatan ditambahkan.</div>';
  } else {
    listHtml = s.kegiatan.map(function (k, i) {
      const status = 'proses'; // RTL tidak punya daftar pertanyaan tetap untuk hitung persen di sini
      const label = 'Kegiatan #' + (i + 1) + (k.jawaban && k.jawaban['RTL-02'] ? ': ' + escapeHtml(String(k.jawaban['RTL-02']).slice(0, 40)) : '');
      return (
        '<div class="list-row" data-idx="' + i + '">' +
          '<div>' +
            '<div style="font-weight:600;font-size:14px;">' + label + '</div>' +
          '</div>' +
          '<span class="badge badge-proses">Edit</span>' +
        '</div>'
      );
    }).join('');
  }

  wrap.innerHTML =
    '<div class="eyebrow">Langkah 2 dari 3 &middot; FGD OPD</div>' +
    '<h2 class="section-title">Daftar Kegiatan RTL</h2>' +
    '<div class="card">' +
      '<div style="font-size:14px;font-weight:700;">' + escapeHtml(s.lokus.namaOPD) + '</div>' +
      '<div class="hint">' + escapeHtml(s.lokus.provinsi) + (s.lokus.alamatOPD ? ' &middot; ' + escapeHtml(s.lokus.alamatOPD) : '') + '</div>' +
      '<div class="hint">Diisi oleh: ' + escapeHtml(s.pengisi.nama || '-') + (s.pengisi.jabatan ? ' (' + escapeHtml(s.pengisi.jabatan) + ')' : '') + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div id="list-kegiatan">' + listHtml + '</div>' +
      '<button class="btn btn-tambah-kegiatan" id="btn-tambah" type="button" style="margin-top:12px;width:100%;">+ Tambah Kegiatan</button>' +
    '</div>' +
    '<div id="status-kirim"></div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-outline" id="btn-batal" type="button">Batal / Mulai Ulang</button>' +
      '<button class="btn btn-primary" id="btn-submit-semua" type="button">' + (editMode ? 'Simpan Perubahan' : 'Submit Semua Kegiatan') + '</button>' +
    '</div>';

  root.appendChild(wrap);

  wrap.querySelectorAll('#list-kegiatan .list-row').forEach(function (row) {
    row.onclick = function () {
      App.activeKegiatanIndex = parseInt(row.dataset.idx, 10);
      goTo('#/form');
    };
  });

  wrap.querySelector('#btn-tambah').onclick = function () {
    s.kegiatan.push({ jawaban: {} });
    saveDraft(s);
    App.activeKegiatanIndex = s.kegiatan.length - 1;
    goTo('#/form');
  };

  wrap.querySelector('#btn-batal').onclick = function () {
    if (!confirm('Batalkan pengisian dan hapus draf ini?')) return;
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };

  wrap.querySelector('#btn-submit-semua').onclick = function () {
    if (!s.kegiatan.length) { alert('Belum ada kegiatan untuk dikirim.'); return; }
    const statusEl = wrap.querySelector('#status-kirim');
    const btn = wrap.querySelector('#btn-submit-semua');
    btn.disabled = true;
    statusEl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div> Mengirim...</div>';

    const identity = {
      Provinsi: s.lokus.provinsi,
      'Nama OPD': s.lokus.namaOPD,
      'Alamat OPD': s.lokus.alamatOPD || '',
      Nama: s.pengisi.nama || '',
      Jabatan: s.pengisi.jabatan || ''
    };
    const kegiatanPayload = s.kegiatan.map(function (k) {
      const row = Object.assign({}, k.jawaban);
      if (k.idIsian) row.idIsian = k.idIsian;
      return row;
    });

    const call = editMode ? apiUpdateRTL(identity, kegiatanPayload) : apiSubmitRTL(identity, kegiatanPayload);
    call.then(function (data) {
      if (data.file && data.file.base64) {
        downloadBase64Xlsx(data.file.fileName, data.file.base64);
      }
      App.lastKonfirmasi = { jenis: 'fgd', mode: editMode ? 'edit' : 'baru', rows: data.rows || [] };
      clearDraft();
      App.session = null;
      goTo('#/konfirmasi');
    }).catch(function (e) {
      console.error('submit RTL gagal:', e);
      statusEl.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal mengirim: ' + escapeHtml(e.message || e) + '</div>';
      btn.disabled = false;
    });
  };
};
