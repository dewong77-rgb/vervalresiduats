const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 jam

function bacaCacheLokal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number') return undefined;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return undefined;
    return parsed.value;
  } catch (e) {
    console.error('bacaCacheLokal gagal:', key, e);
    return undefined;
  }
}

function simpanCacheLokal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value: value }));
  } catch (e) {
    console.error('simpanCacheLokal gagal:', key, e);
  }
}

function hapusCacheLokal() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('ref_') === 0) toRemove.push(k);
    }
    toRemove.forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {
    console.error('hapusCacheLokal gagal:', e);
  }
}

// PENTING: jangan pernah pakai nama global "Cache" untuk objek cache custom
// ini. `Cache` adalah nama bawaan browser (Service Worker Cache API) yang
// SUDAH truthy di semua browser modern, jadi `window.Cache = window.Cache ||
// {...}` tidak akan pernah menetapkan objek custom kita — semua akses
// `Cache.kabKota`, `Cache.sekolah`, dst akan diam-diam jadi undefined tanpa
// error yang jelas. Ini pernah jadi root cause bug "kab/kota gagal dimuat"
// yang butuh beberapa putaran debug untuk ditemukan. Pakai `AppCache`.
window.AppCache = window.AppCache || {
  provinsi: null,
  kabKota: {},
  sekolah: {},
  opd: {},
  petugas: null,
  pertanyaan: {}
};

async function cachedProvinsi() {
  if (AppCache.provinsi && AppCache.provinsi.length) return AppCache.provinsi;
  const persisted = bacaCacheLokal('ref_provinsi');
  if (persisted && persisted.length) {
    AppCache.provinsi = persisted;
    return persisted;
  }
  const data = await apiGetProvinsi();
  AppCache.provinsi = data;
  simpanCacheLokal('ref_provinsi', data);
  return data;
}

async function cachedKabKota(provinsi) {
  if (AppCache.kabKota[provinsi] && AppCache.kabKota[provinsi].length) return AppCache.kabKota[provinsi];
  const storageKey = 'ref_kabkota_' + provinsi;
  const persisted = bacaCacheLokal(storageKey);
  if (persisted && persisted.length) {
    AppCache.kabKota[provinsi] = persisted;
    return persisted;
  }
  const data = await apiGetKabKota(provinsi);
  AppCache.kabKota[provinsi] = data;
  simpanCacheLokal(storageKey, data);
  return data;
}

async function cachedSekolah(provinsi, kabKota) {
  const memKey = provinsi + '|' + kabKota;
  if (AppCache.sekolah[memKey] && AppCache.sekolah[memKey].length) return AppCache.sekolah[memKey];
  const storageKey = 'ref_sekolah_' + memKey;
  const persisted = bacaCacheLokal(storageKey);
  if (persisted && persisted.length) {
    AppCache.sekolah[memKey] = persisted;
    return persisted;
  }
  const data = await apiGetSekolah(provinsi, kabKota);
  AppCache.sekolah[memKey] = data;
  simpanCacheLokal(storageKey, data);
  return data;
}

async function cachedOPD(provinsi) {
  if (AppCache.opd[provinsi] && AppCache.opd[provinsi].length) return AppCache.opd[provinsi];
  const storageKey = 'ref_opd_' + provinsi;
  const persisted = bacaCacheLokal(storageKey);
  if (persisted && persisted.length) {
    AppCache.opd[provinsi] = persisted;
    return persisted;
  }
  const data = await apiGetOPD(provinsi);
  AppCache.opd[provinsi] = data;
  simpanCacheLokal(storageKey, data);
  return data;
}

async function cachedPetugas() {
  if (AppCache.petugas && AppCache.petugas.length) return AppCache.petugas;
  const persisted = bacaCacheLokal('ref_petugas');
  if (persisted && persisted.length) {
    AppCache.petugas = persisted;
    return persisted;
  }
  const data = await apiGetPetugas();
  AppCache.petugas = data;
  simpanCacheLokal('ref_petugas', data);
  return data;
}

async function cachedPertanyaan(instrumen) {
  if (AppCache.pertanyaan[instrumen] && AppCache.pertanyaan[instrumen].length) return AppCache.pertanyaan[instrumen];
  const storageKey = 'ref_pertanyaan_' + instrumen;
  const persisted = bacaCacheLokal(storageKey);
  if (persisted && persisted.length) {
    AppCache.pertanyaan[instrumen] = persisted;
    return persisted;
  }
  const data = await apiGetPertanyaan(instrumen);
  AppCache.pertanyaan[instrumen] = data;
  simpanCacheLokal(storageKey, data);
  return data;
}

function prefetchAwal() {
  // Cuma provinsi yang di-prefetch di awal biar layar pertama cepat muncul;
  // data lain (kab/kota, sekolah, dst) dimuat sesuai kebutuhan saja.
  cachedProvinsi().catch(function (e) { console.error('prefetchAwal gagal:', e); });
}
