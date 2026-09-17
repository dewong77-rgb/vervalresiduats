# API Backend - Instrumen Verval Residu dan ATS DO

Base URL (exec URL deployment):
`https://script.google.com/macros/s/AKfycbxNyHj4woa8SmLM8KMkRvbDFsnxV1FnB6w8Xsl7zOqwFFoQg8KWUysAAuyODDCQVgofTg/exec`

Semua request lewat parameter `action`. GET untuk baca data, POST untuk submit.

## CORS, wajib dibaca sebelum bikin fetch POST

Apps Script Web App tidak mendukung preflight OPTIONS. Kirim POST dari
frontend dengan header:

```
Content-Type: text/plain;charset=utf-8
```

bukan `application/json`, meski body-nya tetap string JSON biasa. Kalau pakai
`application/json`, browser akan preflight dan gagal kena CORS.

## GET - baca data

### `?action=getPertanyaan&instrumen=B1|B2|RTL`
Daftar butir pertanyaan, urut sesuai kolom Urutan di Bank Soal.
```json
{ "ok": true, "data": [
  { "idButir": "B1-01", "targetResponden": "...", "urutan": 1,
    "labelKolom": "Kondisi Demografi Orang Tua/Wali Siswa",
    "teksPertanyaan": "...", "tipeJawaban": "Teks Panjang (Naratif)", "keterangan": "" }
]}
```

### `?action=getPetugas`
```json
{ "ok": true, "data": [ { "nama": "Uce Veriyanti", "instansi": "Direktorat SMA - Teknis" }, ... ] }
```
Frontend menambahkan sendiri opsi "Lainnya (isi manual)" di UI, backend tidak
memvalidasi nama petugas terhadap daftar ini.

### `?action=getProvinsi`
```json
{ "ok": true, "data": ["Jawa Barat", "DI Yogyakarta", "Jawa Tengah", "Banten"] }
```

### `?action=getKabKota&provinsi=Jawa Barat`
```json
{ "ok": true, "data": ["Kota Bandung (FGD Dinas)", "Kab. Bogor", ...] }
```
Entri yang namanya diakhiri "(FGD Dinas)" tidak punya sekolah, hanya
relevan untuk alur RTL, bukan B1/B2.

### `?action=getSekolah&provinsi=Jawa Barat&kabKota=Kab. Bandung Barat`
```json
{ "ok": true, "data": [ { "nama": "SMAN 1 CILILIN", "npsn": "20206146" }, ... ] }
```
Array kosong berarti lokus FGD Dinas tanpa sekolah. Untuk kab/kota apa pun,
UI tetap perlu opsi "Sekolah lain (isi manual)" yang membuka field Nama
Sekolah dan NPSN bebas, karena Lokus bisa saja belum lengkap.

### `?action=getOPD&provinsi=Jawa Barat`
```json
{ "ok": true, "data": [ { "nama": "Bappeda Provinsi Jawa Barat", "alamat": "Jl. ..." }, ... ] }
```
Sumbernya sheet "Data OPD" di Bank Data, diisi manual. Isinya bukan daftar
instansi bebas, tapi kategori peserta Advokasi Pemda yang sama di semua
provinsi (Bappeda, Disdukcapil, Kanwil Kemenag, Dinas PMD, Dinas Pendidikan),
ditambah Balai TIK kalau provinsi itu punya lembaganya. Satu baris per
kategori per provinsi. Frontend tetap sediakan opsi "OPD lain (isi manual)"
di luar daftar ini untuk kasus di luar enam kategori itu.

### `?action=getRekap` atau `?action=getRekap&provinsi=Jawa Barat`
Status pengisian lintas lokus, dikelompokkan per sekolah dan per OPD, bukan
per baris submission mentah.
```json
{
  "ok": true,
  "data": {
    "observasi": [
      { "provinsi": "Jawa Barat", "kabKota": "Kab. Bandung Barat", "npsn": "20206146",
        "namaSekolah": "SMAN 1 CILILIN", "b1": true, "b2": false,
        "b1Terakhir": "17/09/2026 16:37", "b2Terakhir": null }
    ],
    "rtl": [
      { "provinsi": "Jawa Barat", "namaOPD": "Dinas Pendidikan Kota Bandung",
        "jumlahKegiatan": 3, "terakhir": "17/09/2026 16:40" }
    ]
  }
}
```
Belum ada persentase terhadap total target lokus, dan belum ada pembatasan
akses (siapa pun yang tahu exec URL bisa memanggil ini, sama seperti
endpoint lain). Dua-duanya menunggu keputusan lebih lanjut.

### `?action=getIsian&instrumen=B1&kodeReferensi=B1-20206146-20260917`
Untuk buka/edit isian dari device lain, tidak tergantung `idIsian` yang
tersimpan di localStorage device yang submit pertama kali.
```json
{ "ok": true, "data": { "idIsian": "...", "identity": {...}, "jawaban": {...}, "timestamp": "..." } }
```

### `?action=getIsianRTL&provinsi=Jawa Barat&namaOPD=Dinas Pendidikan Kota Bandung`
Satu OPD bisa punya banyak baris kegiatan, jadi dicari per OPD, bukan per
Kode Referensi satu kegiatan.
```json
{ "ok": true, "data": { "identity": {...}, "kegiatan": [ { "idIsian": "...", "kodeReferensi": "...", "RTL-02": "...", ... } ] } }
```

## POST - submit hasil isian

Body selalu string JSON, dengan `action` di dalamnya.

### `submitB1` / `submitB2`
```json
{
  "action": "submitB1",
  "identity": {
    "Provinsi": "Jawa Barat",
    "Kab/Kota": "Kab. Bandung Barat",
    "Nama Sekolah": "SMAN 1 CILILIN",
    "NPSN": "20206146",
    "Jumlah Siswa": 500,
    "Nama Responden": "...",
    "Jabatan Responden": "...",
    "Nama Petugas Pewawancara": "...",
    "Instansi Petugas": "..."
  },
  "jawaban": { "B1-01": "teks jawaban", "B1-02": "teks jawaban", ... }
}
```
Balasan:
```json
{ "ok": true, "data": { "idIsian": "uuid", "kodeReferensi": "B1-20206146-20260917", "timestamp": "17/09/2026 16:37" } }
```
`jawaban` pakai key ID Butir persis (B1-01, B1-02, dst), ambil daftar ID
Butir dan urutannya dari `getPertanyaan`. Satu kali submit = satu baris di
sheet Kerangka Hasil, dikirim setelah semua pertanyaan terjawab, bukan per
pertanyaan.

### `updateB1` / `updateB2`
```json
{
  "action": "updateB1",
  "idIsian": "uuid-yang-sudah-ada",
  "identity": { ...sama persis bentuknya seperti submitB1... },
  "jawaban": { ...sama persis bentuknya seperti submitB1... }
}
```
Balasan bentuknya sama seperti submitB1, tapi `kodeReferensi` tetap yang
lama, tidak dibuat ulang. Timpa seluruh baris, bukan cuma field yang
berubah, jadi frontend kirim identity dan jawaban lengkap, bukan cuma yang
diedit. Kalau `idIsian` tidak ketemu, balas `{ "ok": false, "error": "idIsian tidak ditemukan: ..." }`.

### `submitRTL`
```json
{
  "action": "submitRTL",
  "identity": {
    "Provinsi": "Jawa Barat",
    "Nama OPD": "Bappeda Provinsi Jawa Barat",
    "Alamat OPD": "...",
    "Nama": "nama peserta yang mengisi",
    "Jabatan": "jabatan peserta yang mengisi"
  },
  "kegiatan": [
    { "RTL-02": "Uraian kegiatan 1", "RTL-03": "Tujuan 1", "RTL-04": "Sasaran",
      "RTL-05": "Waktu", "RTL-06": "PIC", "RTL-07": "Mitra", "RTL-08": "Output 1" },
    { "RTL-02": "Uraian kegiatan 2", ... }
  ]
}
```
`RTL-01` (No Kegiatan) tidak dikirim, backend isi otomatis sesuai urutan
array. Satu OPD boleh kirim beberapa kegiatan sekaligus, jadi beberapa baris.

Balasan:
```json
{
  "ok": true,
  "data": {
    "rows": [ { "idIsian": "uuid-1", "kodeReferensi": "RTL-DINAS-...-20260917", "timestamp": "..." }, ... ],
    "file": { "fileName": "RTL_DINAS-...-20260917.xlsx", "base64": "..." }
  }
}
```
`file.base64` adalah isi file Excel rekap kegiatan yang baru disubmit, untuk
didownload peserta FGD saat itu juga. Tidak tersimpan di server, cuma
sekali kirim. Contoh trigger download di browser:
```javascript
function downloadBase64Xlsx(fileName, base64) {
  var byteChars = atob(base64);
  var byteNumbers = new Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  var blob = new Blob([new Uint8Array(byteNumbers)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

### `updateRTL`
```json
{
  "action": "updateRTL",
  "identity": { "Provinsi": "...", "Nama OPD": "...", "Alamat OPD": "...", "Nama": "...", "Jabatan": "..." },
  "kegiatan": [
    { "idIsian": "uuid-lama-1", "RTL-02": "...", "RTL-03": "...", ... },
    { "RTL-02": "kegiatan baru, tanpa idIsian", ... }
  ]
}
```
Kegiatan yang punya `idIsian` ditimpa di baris lamanya. Kegiatan tanpa
`idIsian` jadi baris baru, persis seperti `submitRTL`. Kirim seluruh daftar
kegiatan OPD itu (lama + baru), bukan cuma yang berubah, karena `No Kegiatan`
dinomori ulang sesuai urutan array dan file Excel balasannya mencakup semua
kegiatan, bukan cuma yang diedit. Balasan bentuknya sama seperti
`submitRTL`, `rows` plus `file`.

Versi ini belum menangani penghapusan kegiatan yang sudah terkirim. Kalau
suatu kegiatan mau dihapus, itu perlu endpoint terpisah, sengaja belum
dibuat karena satu baris Excel yang sudah didownload peserta FGD tidak bisa
ditarik lagi begitu terhapus.

## Error format

Semua kegagalan (GET atau POST) balik dengan status 200 tapi `ok: false`:
```json
{ "ok": false, "error": "pesan error" }
```
Frontend selalu cek `ok` dulu, jangan andalkan HTTP status code.

## Alur dropdown yang disarankan

**Titik masuk**: pilih jenis kegiatan dulu, Observasi Sekolah atau FGD OPD.

- **Observasi Sekolah** → pilih target responden, Kepala Sekolah (masuk ke
  instrumen B1) atau Operator/Wakasek Kesiswaan/Guru BK (masuk ke instrumen
  B2). Baru setelah itu masuk alur lokasi di bawah.
- **FGD OPD** → langsung masuk alur RTL di bawah, tidak ada pemilihan target
  responden karena instrumennya cuma satu.

**B1 / B2**: Provinsi -> Kab/Kota -> Sekolah (NPSN ikut otomatis, read-only)
-> field manual (Nama Responden, Jabatan Responden, Nama Petugas
Pewawancara, Instansi Petugas, dropdown dari `getPetugas` + opsi Lainnya) ->
render pertanyaan dari `getPertanyaan` sesuai instrumen -> kumpulkan semua
jawaban -> submit sekali di akhir.

**RTL**: Provinsi -> pilih kategori OPD dari `getOPD` (atau isi manual) ->
Nama dan Jabatan peserta yang mengisi -> daftar kegiatan (bisa tambah baris
berkali-kali di form) -> submit sekali -> download Excel otomatis dari
balasan.
