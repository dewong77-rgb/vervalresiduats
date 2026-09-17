// Komunikasi ke backend Google Apps Script sesuai API_CONTRACT.md.

const BASE_URL = 'https://script.google.com/macros/s/AKfycbxNyHj4woa8SmLM8KMkRvbDFsnxV1FnB6w8Xsl7zOqwFFoQg8KWUysAAuyODDCQVgofTg/exec';

async function apiGet(action, params) {
  const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
  const res = await fetch(BASE_URL + '?' + qs.toString());
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Gagal mengambil data');
  return json.data;
}

async function apiPost(action, body) {
  const payload = Object.assign({ action: action }, body);
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // wajib text/plain, lihat API_CONTRACT.md soal CORS
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Gagal mengirim data');
  return json.data;
}

function apiGetProvinsi() {
  return apiGet('getProvinsi');
}

function apiGetKabKota(provinsi) {
  return apiGet('getKabKota', { provinsi: provinsi });
}

function apiGetSekolah(provinsi, kabKota) {
  return apiGet('getSekolah', { provinsi: provinsi, kabKota: kabKota });
}

function apiGetPetugas() {
  return apiGet('getPetugas');
}

function apiGetPertanyaan(instrumen) {
  return apiGet('getPertanyaan', { instrumen: instrumen });
}

function apiSubmitB1(identity, jawaban) {
  return apiPost('submitB1', { identity: identity, jawaban: jawaban });
}

function apiSubmitB2(identity, jawaban) {
  return apiPost('submitB2', { identity: identity, jawaban: jawaban });
}

function apiSubmitRTL(identity, kegiatan) {
  return apiPost('submitRTL', { identity: identity, kegiatan: kegiatan });
}

function downloadBase64Xlsx(fileName, base64) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
