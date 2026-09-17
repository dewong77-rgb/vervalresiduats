// Cache di memori untuk data referensi yang jarang berubah dalam satu sesi
// (provinsi, kab/kota, sekolah, petugas, pertanyaan). Tujuannya, layar yang
// sama tidak memanggil ulang Apps Script tiap kali dibuka, karena tiap
// panggilan ke Apps Script relatif lambat.

window.Cache = window.Cache || {
  provinsi: null,
  kabKota: {},
  sekolah: {},
  petugas: null,
  pertanyaan: {}
};

async function cachedProvinsi() {
  if (!Cache.provinsi) Cache.provinsi = await apiGetProvinsi();
  return Cache.provinsi;
}

async function cachedKabKota(provinsi) {
  if (!Cache.kabKota[provinsi]) Cache.kabKota[provinsi] = await apiGetKabKota(provinsi);
  return Cache.kabKota[provinsi];
}

async function cachedSekolah(provinsi, kabKota) {
  const key = provinsi + '|' + kabKota;
  if (!Cache.sekolah[key]) Cache.sekolah[key] = await apiGetSekolah(provinsi, kabKota);
  return Cache.sekolah[key];
}

async function cachedPetugas() {
  if (!Cache.petugas) Cache.petugas = await apiGetPetugas();
  return Cache.petugas;
}

async function cachedPertanyaan(instrumen) {
  if (!Cache.pertanyaan[instrumen]) Cache.pertanyaan[instrumen] = await apiGetPertanyaan(instrumen);
  return Cache.pertanyaan[instrumen];
}

// Dipanggil sekali saat app dibuka, jalan di belakang layar supaya begitu
// pengguna sampai ke layar yang butuh data ini, sudah tersedia dari cache.
function prefetchAwal() {
  cachedProvinsi().catch(function () {});
  cachedPetugas().catch(function () {});
  cachedPertanyaan('B1').catch(function () {});
  cachedPertanyaan('B2').catch(function () {});
  cachedPertanyaan('RTL').catch(function () {});
}
