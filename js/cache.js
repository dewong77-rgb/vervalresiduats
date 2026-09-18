// Cache dua lapis untuk data referensi yang jarang berubah (provinsi,
// kab/kota, sekolah, OPD, petugas, bank soal):
// 1. Di memori (AppCache, objek global), cepat tapi hilang tiap refresh halaman.
// 2. Di localStorage, bertahan lintas sesi dan lintas hari, kedaluwarsa
//    otomatis setelah CACHE_TTL_MS supaya tidak basi kalau Bank Data
//    diedit tim Direktorat SMA.
//
// Efeknya, Apps Script yang lambat itu cuma benar-benar dipanggil sekali
// per data per perangkat, dalam jendela waktu TTL. Pembukaan berikutnya
// instan dari localStorage, tanpa nunggu jaringan sama sekali.
//
// PENTING: objek globalnya sengaja dinamai `AppCache`, bukan `Cache`.
// `window.Cache` sudah dipakai browser sebagai bagian dari Service Worker
// API (tersedia di semua browser modern walau service worker tidak
// dipakai), jadi `window.Cache = window.Cache || {...}` tidak akan pernah
// menimpa nilai bawaan itu, dan seluruh cache lokal ini diam-diam tidak
// pernah aktif. Jangan pakai nama `Cache` lagi di file manapun.

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
    return undefined;
  }
}

function simpanCacheLokal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value: value }));
  } catch (e) {
    // localStorage penuh atau diblokir browser, lanjut tanpa cache lokal
  }
}

// Hapus semua cache referensi lokal, dipakai tombol "Muat Ulang Data" di
// header untuk memaksa ambil data terbaru dari Apps Script.
function hapusCacheLokal() {
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('ref_') === 0) localStorage.removeItem(k);
    });
  } catch (e) {}
}

window.AppCache = window.AppCache || {
  provinsi: null,
  kabKota: {},
  sekolah: {},
  opd: {},
  petugas: null,
  pertanyaan: {}
};

async function cachedProvinsi() {
  if (!AppCache.provinsi || !AppCache.provinsi.length) {
    const persisted = bacaCacheLokal('ref_provinsi');
    if (persisted && persisted.length) {
      AppCache.provinsi = persisted;
    } else {
      AppCache.provinsi = await apiGetProvinsi();
      if (AppCache.provinsi && AppCache.provinsi.length) simpanCacheLokal('ref_provinsi', AppCache.provinsi);
    }
  }
  return AppCache.provinsi;
}

async function cachedKabKota(provinsi) {
  if (!AppCache.kabKota[provinsi] || !AppCache.kabKota[provinsi].length) {
    const storageKey = 'ref_kabkota_' + provinsi;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted && persisted.length) {
      AppCache.kabKota[provinsi] = persisted;
    } else {
      AppCache.kabKota[provinsi] = await apiGetKabKota(provinsi);
      if (AppCache.kabKota[provinsi] && AppCache.kabKota[provinsi].length) simpanCacheLokal(storageKey, AppCache.kabKota[provinsi]);
    }
  }
  return AppCache.kabKota[provinsi];
}

async function cachedSekolah(provinsi, kabKota) {
  const memKey = provinsi + '|' + kabKota;
  if (!AppCache.sekolah[memKey] || !AppCache.sekolah[memKey].length) {
    const storageKey = 'ref_sekolah_' + memKey;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted && persisted.length) {
      AppCache.sekolah[memKey] = persisted;
    } else {
      AppCache.sekolah[memKey] = await apiGetSekolah(provinsi, kabKota);
      if (AppCache.sekolah[memKey] && AppCache.sekolah[memKey].length) simpanCacheLokal(storageKey, AppCache.sekolah[memKey]);
    }
  }
  return AppCache.sekolah[memKey];
}

async function cachedOPD(provinsi) {
  if (!AppCache.opd[provinsi] || !AppCache.opd[provinsi].length) {
    const storageKey = 'ref_opd_' + provinsi;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted && persisted.length) {
      AppCache.opd[provinsi] = persisted;
    } else {
      AppCache.opd[provinsi] = await apiGetOPD(provinsi);
      if (AppCache.opd[provinsi] && AppCache.opd[provinsi].length) simpanCacheLokal(storageKey, AppCache.opd[provinsi]);
    }
  }
  return AppCache.opd[provinsi];
}

async function cachedPetugas() {
  if (!AppCache.petugas || !AppCache.petugas.length) {
    const persisted = bacaCacheLokal('ref_petugas');
    if (persisted && persisted.length) {
      AppCache.petugas = persisted;
    } else {
      AppCache.petugas = await apiGetPetugas();
      if (AppCache.petugas && AppCache.petugas.length) simpanCacheLokal('ref_petugas', AppCache.petugas);
    }
  }
  return AppCache.petugas;
}

async function cachedPertanyaan(instrumen) {
  if (!AppCache.pertanyaan[instrumen] || !AppCache.pertanyaan[instrumen].length) {
    const storageKey = 'ref_pertanyaan_' + instrumen;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted && persisted.length) {
      AppCache.pertanyaan[instrumen] = persisted;
    } else {
      AppCache.pertanyaan[instrumen] = await apiGetPertanyaan(instrumen);
      if (AppCache.pertanyaan[instrumen] && AppCache.pertanyaan[instrumen].length) simpanCacheLokal(storageKey, AppCache.pertanyaan[instrumen]);
    }
  }
  return AppCache.pertanyaan[instrumen];
}

// Dipanggil sekali saat app dibuka. Cuma provinsi yang di-prefetch, data
// lain diambil saat layar yang membutuhkannya benar-benar dibuka.
function prefetchAwal() {
  cachedProvinsi().catch(function () {});
}
