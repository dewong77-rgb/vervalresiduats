const DRAFT_KEY = 'verval_draft_v1';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadDraft gagal:', e);
    return null;
  }
}

function saveDraft(session) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('saveDraft gagal:', e);
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.error('clearDraft gagal:', e);
  }
}

function countAnswered(jawaban, pertanyaanList) {
  if (!pertanyaanList || !pertanyaanList.length) return 0;
  let n = 0;
  pertanyaanList.forEach(function (q) {
    const v = jawaban && jawaban[q.idButir];
    if (v !== undefined && v !== null && String(v).trim() !== '') n++;
  });
  return n;
}

function hitungPersen(jawaban, pertanyaanList) {
  if (!pertanyaanList || !pertanyaanList.length) return 0;
  return Math.round((countAnswered(jawaban, pertanyaanList) / pertanyaanList.length) * 100);
}

function statusDari(jawaban, pertanyaanList) {
  const n = countAnswered(jawaban, pertanyaanList);
  if (n === 0) return 'belum';
  if (pertanyaanList && n === pertanyaanList.length) return 'selesai';
  return 'proses';
}
