# Instrumen Verval Residu & ATS DO — Frontend

Aplikasi web statis (vanilla JS, tanpa framework/build step) untuk
pendataan lapangan kegiatan Observasi Sekolah (instrumen B1/B2) dan FGD OPD
(RTL). Backend: Google Apps Script Web App di atas Google Sheet, kontrak
API ada di `API_CONTRACT.md`.

## Struktur Folder

```
index.html          shell aplikasi + router
panduan.html         halaman panduan pengguna, berdiri sendiri
API_CONTRACT.md      salinan lokal kontrak backend (GET/POST, bentuk data)
css/
  variables.css      token desain (warna, spacing) — satu-satunya tempat
                      ubah skema warna
  base.css           komponen bersama (tombol, kartu, form, badge, dst)
  observasi.css      aksen visual khusus alur Observasi Sekolah
  fgd.css            aksen visual khusus alur FGD OPD
js/
  util.js            helper umum (escape HTML, deskripsi instrumen, dst)
  state.js           draf lokal (localStorage) + hitung persentase/status
  api.js             semua panggilan ke backend Apps Script
  cache.js           cache 2 lapis (memori + localStorage, TTL 3 jam)
  app.js             router hash-based
  views/
    pilih-lokus.js       Langkah 1: jenis kegiatan → lokasi/OPD
    daftar-kegiatan.js   Langkah 2 FGD: daftar kegiatan RTL
    form-isian.js        Langkah 2 Observasi / isi 1 kegiatan RTL
    konfirmasi.js         layar setelah submit
    cari-edit.js          cari isian lama untuk diedit
    progress.js           halaman Progres vs Target (getProgress)
```

Pemisahan CSS ini disengaja: kalau ada permintaan ubah warna, cukup ubah
`variables.css`, tidak perlu menyentuh file lain. Kalau alur Observasi atau
FGD butuh gaya berbeda sendiri-sendiri, cukup ubah `observasi.css` /
`fgd.css` tanpa memengaruhi komponen bersama di `base.css`.

## Alur Data

**Observasi (B1/B2)**: instrumen dipilih di layar pertama (sebelum lokasi),
tersimpan flat di `App.session.instrumen`. Narasumber dan petugas
pewawancara adalah array (bisa lebih dari satu orang), disimpan sebagai
array of object di draf, lalu digabung jadi satu string dengan pemisah
`'; '` (lihat `.join('; ')` di `form-isian.js`) saat dikirim ke backend,
karena skema sheet (`Nama Responden`, `Jabatan Responden`, dst) masih
berupa string tunggal. `splitJoined()` di `util.js` membalik proses ini
saat membuka isian lama untuk diedit (`cari-edit.js`).

**FGD (RTL)**: satu OPD bisa punya banyak baris kegiatan sekaligus,
dikumpulkan di `App.session.kegiatan` sebagai array, dikirim sekaligus saat
submit di `daftar-kegiatan.js`. Respons submit menyertakan file Excel
(base64) yang otomatis didownload lewat `downloadBase64Xlsx()`.

**Edit isian**: `submitB1/B2` → `updateB1/B2` (butuh `idIsian`),
`submitRTL` → `updateRTL` (kegiatan lama bawa `idIsian`, kegiatan baru
tanpa `idIsian` diperlakukan sebagai baris baru). Dicari lewat
`cari-edit.js` pakai Kode Referensi (B1/B2) atau Provinsi+Nama OPD (RTL).

**Progres vs Rekap**: `getRekap` menunjukkan apa yang sudah masuk;
`getProgress` (halaman baru, `js/views/progress.js`) membandingkan
keterisian terhadap target/kuota per lokus. Detail bentuk data dan asumsi
field ada di `API_CONTRACT.md` bagian getProgress — bagian itu ditulis dari
spesifikasi chat karena belum ada di file kontrak yang diupload, jadi kalau
ada revisi kontrak resmi, perlu dicek ulang kecocokan nama field.

## Draf Lokal & Cache

- **Draf isian** (`verval_draft_v1` di localStorage): tersimpan otomatis
  setiap kali user mengetik, dihapus hanya setelah submit final berhasil.
  Ini device/browser-specific, tidak ikut pindah kalau ganti perangkat.
- **Cache referensi** (provinsi, kab/kota, sekolah, OPD, petugas, bank
  soal): dua lapis — objek in-memory `window.AppCache` + localStorage
  (prefix `ref_`), TTL 3 jam. Ada link "Muat Ulang Data" di header yang
  menghapus cache localStorage dan reload halaman, untuk kondisi data di
  server berubah tapi cache lama belum kedaluwarsa.

**Penting — jangan pakai nama global `Cache`.** `window.Cache` adalah nama
bawaan browser (Service Worker Cache API) yang sudah truthy di semua
browser modern, jadi `window.Cache = window.Cache || {...}` tidak pernah
benar-benar menetapkan objek custom — akses propertinya diam-diam jadi
`undefined` tanpa error yang jelas. Ini pernah jadi penyebab bug
"kab/kota gagal dimuat" / "OPD tidak muncul" yang butuh beberapa putaran
debug untuk ditemukan. Nama yang dipakai di proyek ini adalah `AppCache`.

## Penanganan Error

Semua `catch` di kode ini logging ke `console.error()` sekaligus
menampilkan pesan error singkat langsung di UI (bukan disembunyikan),
supaya masalah backend/jaringan terlihat tanpa harus buka DevTools.
`apiGet`/`apiPost` di `api.js` membaca body response sebagai teks dulu
sebelum `JSON.parse`, supaya kalau backend kebetulan balas halaman error
HTML (bukan JSON), pesan errornya menyebut cuplikan isi respons, bukan
error `JSON.parse` bawaan browser yang membingungkan.

## Keterbatasan yang Diketahui

- Validasi form masih minimal (cek field wajib dasar saja).
- `tipeInputDari()` di `util.js` baru mengenali dengan pasti tipe jawaban
  "Teks Panjang (Naratif)"; tipe lain ditebak dari kata kunci ("angka" →
  input number, selain itu → teks biasa).
- `updateRTL` di backend belum menangani penghapusan kegiatan yang sudah
  terkirim (lihat catatan di `API_CONTRACT.md`).
- Halaman Progres mengasumsikan bentuk field `getProgress` dari spesifikasi
  chat, belum divalidasi terhadap file kontrak resmi — cek kembali kalau
  ada data yang tidak tampil sesuai harapan.
