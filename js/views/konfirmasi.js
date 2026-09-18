window.Views = window.Views || {};

Views.renderKonfirmasi = function (root) {
  const info = App.lastKonfirmasi;
  if (!info) {
    root.innerHTML = '<div class="screen"><p class="empty-hint">Tidak ada data konfirmasi.</p></div>';
    return;
  }

  let body;
  if (info.tipe === 'instrumen') {
    body = `
      <div class="card" style="display:inline-block; padding: 16px 28px;">
        <div class="list-row-sub">Instrumen ${info.instrumen}</div>
        <div style="font-weight:700; font-size:16px;">${escapeHtml(info.data.kodeReferensi)}</div>
        <div class="list-row-sub" style="margin-top:6px;">${escapeHtml(info.data.timestamp)}</div>
      </div>`;
  } else {
    const rows = (info.data.rows || []).map(function (r) {
      return '<div class="list-row"><div class="list-row-title">' + escapeHtml(r.kodeReferensi) + '</div><div class="list-row-sub">' + escapeHtml(r.timestamp) + '</div></div>';
    }).join('');
    body = '<div class="card" style="text-align:left;">' + rows + '</div>' +
      '<p class="empty-hint">File Excel rekap kegiatan sudah otomatis terunduh.</p>';
  }

  const isEdit = info.mode === 'edit';

  root.innerHTML = `
    <div class="screen" style="text-align:center; padding-top:48px;">
      <div class="eyebrow">${isEdit ? 'Perubahan Terkirim' : 'Terkirim'}</div>
      <h2 class="section-title">${isEdit ? 'Perubahan Tersimpan' : 'Isian Tersimpan'}</h2>
      ${body}
      <div class="btn-row" style="justify-content:center;">
        <button class="btn btn-primary" id="btn-lanjut">Lanjut</button>
      </div>
    </div>
  `;

  document.getElementById('btn-lanjut').onclick = function () {
    App.lastKonfirmasi = null;
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };
};
