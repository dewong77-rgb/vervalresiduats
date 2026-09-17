// Utilitas kecil dipakai lintas layar.

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// Pemetaan tipeJawaban dari Bank Soal ke jenis input HTML.
// Baru ketahuan satu nilai pasti dari kontrak: "Teks Panjang (Naratif)".
// Sesuaikan daftar ini begitu nilai tipeJawaban lain dari Bank Soal diketahui.
function tipeInputDari(tipeJawaban) {
  const t = (tipeJawaban || '').toLowerCase();
  if (t.indexOf('panjang') !== -1 || t.indexOf('naratif') !== -1) return 'textarea';
  if (t.indexOf('angka') !== -1) return 'number';
  return 'text';
}

function renderQuestionField(q, idx, val) {
  const tipe = tipeInputDari(q.tipeJawaban);
  const targetTag = q.targetResponden ? '<div class="eyebrow">' + escapeHtml(q.targetResponden) + '</div>' : '';
  const keterangan = q.keterangan ? '<div class="list-row-sub">' + escapeHtml(q.keterangan) + '</div>' : '';
  let input;
  if (tipe === 'textarea') {
    input = '<textarea data-qid="' + q.idButir + '">' + escapeHtml(val) + '</textarea>';
  } else if (tipe === 'number') {
    input = '<input type="number" data-qid="' + q.idButir + '" value="' + escapeAttr(val) + '">';
  } else {
    input = '<input type="text" data-qid="' + q.idButir + '" value="' + escapeAttr(val) + '">';
  }
  return '<div class="field">' + targetTag + '<label>' + (idx + 1) + '. ' + escapeHtml(q.teksPertanyaan) + '</label>' + input + keterangan + '</div>';
}
