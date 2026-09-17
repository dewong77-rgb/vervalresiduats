// Simpan/ambil draf isian dari localStorage. Draf baru terkirim ke server saat submit (lihat api.js).

const STORAGE_KEY = 'verval_draft_v1';

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Gagal membaca draf', e);
    return null;
  }
}

function saveDraft(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Gagal menyimpan draf', e);
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function countAnswered(jawaban, pertanyaanList) {
  if (!jawaban || !pertanyaanList) return 0;
  return pertanyaanList.filter(function (q) {
    const v = jawaban[q.idButir];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;
}

function hitungPersen(jawaban, pertanyaanList) {
  const total = pertanyaanList.length;
  if (!total) return 0;
  return Math.round((countAnswered(jawaban, pertanyaanList) / total) * 100);
}

function statusDari(jawaban, pertanyaanList) {
  const pct = hitungPersen(jawaban, pertanyaanList);
  if (pct === 0) return 'belum';
  if (pct < 100) return 'proses';
  return 'selesai';
}
