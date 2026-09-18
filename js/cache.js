// Cache di memori untuk data referensi yang jarang berubah dalam satu sesi
// (provinsi, kab/kota, sekolah, OPD, petugas, pertanyaan). Tujuannya, layar
// yang sama tidak memanggil ulang Apps Script tiap kali dibuka, karena tiap
// panggilan ke Apps Script relatif lambat.
//
// PENTING: pengecekan pakai `in` / `=== null`, bukan `!nilai`, karena array
// kosong `[]` itu truthy di JavaScript. Kalau dicek pakai `!nilai`, hasil
// kosong yang sah (atau bekas kegagalan sebelumnya) akan dikira "sudah
// pernah diambil" dan tidak pernah diminta ulang walau datanya sebenarnya
// sudah berubah di backend.

window.Cache = window.Cache || {
  provinsi: null,
  kabKota: {},
  sekolah: {},
  opd: {},
  petugas: null,
  pertanyaan: {}
};

async function cachedProvinsi() {
  if (Cache.provinsi === null) Cache.provinsi = await apiGetProvinsi();
  return Cache.provinsi;
}

async function cachedKabKota(provinsi) {
  if (!(provinsi in Cache.kabKota)) Cache.kabKota[provinsi] = await apiGetKabKota(provinsi);
  return Cache.kabKota[provinsi];
}

async function cachedSekolah(provinsi, kabKota) {
  const key = provinsi + '|' + kabKota;
  if (!(key in Cache.sekolah)) Cache.sekolah[key] = await apiGetSekolah(provinsi, kabKota);
  return Cache.sekolah[key];
}

async function cachedOPD(provinsi) {
  if (!(provinsi in Cache.opd)) Cache.opd[provinsi] = await apiGetOPD(provinsi);
  return Cache.opd[provinsi];
}

async function cachedPetugas() {
  if (Cache.petugas === null) Cache.petugas = await apiGetPetugas();
  return Cache.petugas;
}

async function cachedPertanyaan(instrumen) {
  if (!(instrumen in Cache.pertanyaan)) Cache.pertanyaan[instrumen] = await apiGetPertanyaan(instrumen);
  return Cache.pertanyaan[instrumen];
}

// Dipanggil sekali saat app dibuka. Sengaja cuma provinsi yang di-prefetch,
// karena menembak banyak request bersamaan ke Apps Script yang sama justru
// bikin saling antre di sisi Google, bukan benar-benar paralel. Data lain
// (petugas, bank soal) tetap kena cache, cuma diambil saat layar yang
// membutuhkannya benar-benar dibuka.
function prefetchAwal() {
  cachedProvinsi().catch(function () {});
}
