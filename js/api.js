const BASE_URL = 'https://script.google.com/macros/s/AKfycbxNyHj4woa8SmLM8KMkRvbDFsnxV1FnB6w8Xsl7zOqwFFoQg8KWUysAAuyODDCQVgofTg/exec';

// Baca body response sebagai teks dulu, baru coba parse JSON. Kalau backend
// kebetulan balas halaman error HTML (bukan JSON), pesan error yang muncul
// ke user jadi jelas ("dapat HTML, bukan JSON...") alih-alih error
// JSON.parse bawaan browser yang membingungkan ("unexpected character at
// line 1 column 1").
async function parseJsonResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const cuplikan = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(
      'Respons server bukan JSON yang valid (kemungkinan halaman error dari Apps Script). Cuplikan: ' +
      (cuplikan || '(kosong)')
    );
  }
  return json;
}

async function apiGet(action, params) {
  const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
  const url = BASE_URL + '?' + qs.toString();
  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (e) {
    console.error('apiGet fetch gagal:', action, e);
    throw new Error('Tidak bisa menghubungi server (' + action + '): ' + (e.message || e));
  }
  const json = await parseJsonResponse(res);
  if (!json.ok) {
    throw new Error(json.error || ('Gagal memuat data (' + action + ')'));
  }
  return json.data;
}

async function apiPost(action, body) {
  let res;
  try {
    res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, body || {}))
    });
  } catch (e) {
    console.error('apiPost fetch gagal:', action, e);
    throw new Error('Tidak bisa menghubungi server (' + action + '): ' + (e.message || e));
  }
  const json = await parseJsonResponse(res);
  if (!json.ok) {
    throw new Error(json.error || ('Gagal mengirim data (' + action + ')'));
  }
  return json.data;
}

function apiGetProvinsi() { return apiGet('getProvinsi'); }
function apiGetKabKota(provinsi) { return apiGet('getKabKota', { provinsi: provinsi }); }
function apiGetSekolah(provinsi, kabKota) { return apiGet('getSekolah', { provinsi: provinsi, kabKota: kabKota }); }
function apiGetPetugas() { return apiGet('getPetugas'); }
function apiGetPertanyaan(instrumen) { return apiGet('getPertanyaan', { instrumen: instrumen }); }
function apiGetOPD(provinsi) { return apiGet('getOPD', { provinsi: provinsi }); }
function apiGetRekap(provinsi) { return apiGet('getRekap', provinsi ? { provinsi: provinsi } : {}); }
function apiGetProgress(provinsi) { return apiGet('getProgress', provinsi ? { provinsi: provinsi } : {}); }
function apiGetIsian(instrumen, kodeReferensi) { return apiGet('getIsian', { instrumen: instrumen, kodeReferensi: kodeReferensi }); }
function apiGetIsianRTL(provinsi, namaOPD) { return apiGet('getIsianRTL', { provinsi: provinsi, namaOPD: namaOPD }); }

function apiSubmitB1(identity, jawaban) { return apiPost('submitB1', { identity: identity, jawaban: jawaban }); }
function apiSubmitB2(identity, jawaban) { return apiPost('submitB2', { identity: identity, jawaban: jawaban }); }
function apiUpdateB1(idIsian, identity, jawaban) { return apiPost('updateB1', { idIsian: idIsian, identity: identity, jawaban: jawaban }); }
function apiUpdateB2(idIsian, identity, jawaban) { return apiPost('updateB2', { idIsian: idIsian, identity: identity, jawaban: jawaban }); }

function apiSubmitRTL(identity, kegiatan) { return apiPost('submitRTL', { identity: identity, kegiatan: kegiatan }); }
function apiUpdateRTL(identity, kegiatan) { return apiPost('updateRTL', { identity: identity, kegiatan: kegiatan }); }

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
