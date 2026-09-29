window.Views = window.Views || {};

Views.renderKonfirmasi = function (root) {
  const info = App.lastKonfirmasi;
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  const editMode = info && info.mode === 'edit';
  const title = editMode ? 'Perubahan Tersimpan' : 'Isian Tersimpan';
  const eyebrow = editMode ? 'Perubahan Terkirim' : 'Berhasil Dikirim';

  let bodyHtml = '';
  if (info && info.jenis === 'observasi') {
    const d = info.data || {};
    bodyHtml =
      '<div class="card">' +
        '<div class="field"><label>Kode Referensi</label><div style="font-size:16px;font-weight:700;">' + escapeHtml(d.kodeReferensi || '-') + '</div></div>' +
        '<div class="hint">Waktu: ' + escapeHtml(d.timestamp || '-') + '</div>' +
      '</div>';
  } else if (info && info.jenis === 'fgd') {
    const rows = info.rows || [];
    bodyHtml =
      '<div class="card">' +
        '<div class="section-title" style="font-size:15px;">Kegiatan Terkirim (' + rows.length + ')</div>' +
        rows.map(function (r) {
          return '<div class="list-row-static"><div>' + escapeHtml(r.kodeReferensi || '-') + '</div><div class="hint">' + escapeHtml(r.timestamp || '') + '</div></div>';
        }).join('') +
      '</div>' +
      '<div class="hint">File Excel rekap kegiatan sudah otomatis terunduh.</div>';
  } else {
    bodyHtml = '<div class="empty-hint">Tidak ada data konfirmasi.</div>';
  }

  wrap.innerHTML =
    '<div class="eyebrow">' + eyebrow + '</div>' +
    '<h2 class="section-title">' + title + '</h2>' +
    bodyHtml +
    '<div class="btn-row"><button class="btn btn-primary" id="btn-lanjut" type="button">Lanjut</button></div>';

  root.appendChild(wrap);

  wrap.querySelector('#btn-lanjut').onclick = function () {
    App.lastKonfirmasi = null;
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };
};
