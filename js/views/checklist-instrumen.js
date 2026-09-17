window.Views = window.Views || {};

function labelStatus(s) {
  return s === 'selesai' ? 'Terkirim' : s === 'proses' ? 'Proses' : 'Belum';
}

Views.renderChecklistInstrumen = async function (root) {
  const s = App.session;
  if (!s) return goTo('#/pilih-lokus');

  root.innerHTML = '<div class="screen"><p class="empty-hint">Memuat status instrumen...</p></div>';

  let pertB1, pertB2;
  try {
    const hasil = await Promise.all([apiGetPertanyaan('B1'), apiGetPertanyaan('B2')]);
    pertB1 = hasil[0];
    pertB2 = hasil[1];
  } catch (e) {
    root.innerHTML = '<div class="screen"><div class="empty-hint">Gagal memuat data: ' + escapeHtml(e.message) + '</div></div>';
    return;
  }

  const pertMap = { B1: pertB1, B2: pertB2 };
  let rows = '';
  ['B1', 'B2'].forEach(function (kode) {
    const slot = s.perInstrumen[kode];
    let status, sub;
    if (slot.hasil) {
      status = 'selesai';
      sub = 'Terkirim &middot; ' + escapeHtml(slot.hasil.kodeReferensi);
    } else {
      status = statusDari(slot.jawaban, pertMap[kode]);
      sub = 'Instrumen ' + kode;
    }
    rows += '<div class="list-row" data-instrumen="' + kode + '">' +
      '<div><span class="dot-observasi"></span><span class="list-row-title">Instrumen ' + kode + '</span>' +
      '<div class="list-row-sub">' + sub + '</div></div>' +
      '<span class="badge badge-' + status + '">' + labelStatus(status) + '</span></div>';
  });

  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Langkah 2 dari 3</div>
      <h2 class="section-title">${escapeHtml(s.lokus.sekolah.nama)}</h2>
      <div class="list-row-sub" style="margin-bottom:16px;">${escapeHtml(s.lokus.provinsi)} &middot; ${escapeHtml(s.lokus.kabKota)}${s.lokus.sekolah.npsn ? ' &middot; NPSN ' + escapeHtml(s.lokus.sekolah.npsn) : ''}</div>
      <div class="card">${rows}</div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-ganti">Ganti Lokus</button>
      </div>
    </div>
  `;

  root.querySelectorAll('.list-row[data-instrumen]').forEach(function (el) {
    el.onclick = function () {
      App.activeInstrumen = el.dataset.instrumen;
      goTo('#/form');
    };
  });

  document.getElementById('btn-ganti').onclick = function () {
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };
};
