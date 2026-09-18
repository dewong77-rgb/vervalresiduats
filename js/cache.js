// Cache dua lapis untuk data referensi yang jarang berubah (provinsi,
// kab/kota, sekolah, OPD, petugas, bank soal):
// 1. Di memori (Cache object), cepat tapi hilang tiap refresh halaman.
// 2. Di localStorage, bertahan lintas sesi dan lintas hari, kedaluwarsa
//    otomatis setelah CACHE_TTL_MS supaya tidak basi kalau Bank Data
//    diedit tim Direktorat SMA.
//
// Efeknya, Apps Script yang lambat itu cuma benar-benar dipanggil sekali
// per data per perangkat, dalam jendela waktu TTL. Pembukaan berikutnya
// instan dari localStorage, tanpa nunggu jaringan sama sekali.

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

window.Cache = window.Cache || {
  provinsi: null,
  kabKota: {},
  sekolah: {},
  opd: {},
  petugas: null,
  pertanyaan: {}
};

async function cachedProvinsi() {
  if (Cache.provinsi === null) {
    const persisted = bacaCacheLokal('ref_provinsi');
    if (persisted !== undefined) {
      Cache.provinsi = persisted;
    } else {
      Cache.provinsi = await apiGetProvinsi();
      simpanCacheLokal('ref_provinsi', Cache.provinsi);
    }
  }
  return Cache.provinsi;
}

async function cachedKabKota(provinsi) {
  if (!(provinsi in Cache.kabKota)) {
    const storageKey = 'ref_kabkota_' + provinsi;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted !== undefined) {
      Cache.kabKota[provinsi] = persisted;
    } else {
      Cache.kabKota[provinsi] = await apiGetKabKota(provinsi);
      simpanCacheLokal(storageKey, Cache.kabKota[provinsi]);
    }
  }
  return Cache.kabKota[provinsi];
}

async function cachedSekolah(provinsi, kabKota) {
  const memKey = provinsi + '|' + kabKota;
  if (!(memKey in Cache.sekolah)) {
    const storageKey = 'ref_sekolah_' + memKey;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted !== undefined) {
      Cache.sekolah[memKey] = persisted;
    } else {
      Cache.sekolah[memKey] = await apiGetSekolah(provinsi, kabKota);
      simpanCacheLokal(storageKey, Cache.sekolah[memKey]);
    }
  }
  return Cache.sekolah[memKey];
}

async function cachedOPD(provinsi) {
  if (!(provinsi in Cache.opd)) {
    const storageKey = 'ref_opd_' + provinsi;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted !== undefined) {
      Cache.opd[provinsi] = persisted;
    } else {
      Cache.opd[provinsi] = await apiGetOPD(provinsi);
      simpanCacheLokal(storageKey, Cache.opd[provinsi]);
    }
  }
  return Cache.opd[provinsi];
}

async function cachedPetugas() {
  if (Cache.petugas === null) {
    const persisted = bacaCacheLokal('ref_petugas');
    if (persisted !== undefined) {
      Cache.petugas = persisted;
    } else {
      Cache.petugas = await apiGetPetugas();
      simpanCacheLokal('ref_petugas', Cache.petugas);
    }
  }
  return Cache.petugas;
}

async function cachedPertanyaan(instrumen) {
  if (!(instrumen in Cache.pertanyaan)) {
    const storageKey = 'ref_pertanyaan_' + instrumen;
    const persisted = bacaCacheLokal(storageKey);
    if (persisted !== undefined) {
      Cache.pertanyaan[instrumen] = persisted;
    } else {
      Cache.pertanyaan[instrumen] = await apiGetPertanyaan(instrumen);
      simpanCacheLokal(storageKey, Cache.pertanyaan[instrumen]);
    }
  }
  return Cache.pertanyaan[instrumen];
}

// Dipanggil sekali saat app dibuka. Cuma provinsi yang di-prefetch, data
// lain diambil saat layar yang membutuhkannya benar-benar dibuka.
function prefetchAwal() {
  cachedProvinsi().catch(function () {});
}
