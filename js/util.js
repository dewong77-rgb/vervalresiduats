// Utilitas kecil dipakai lintas layar.

// Info target responden dan deskripsi kegiatan per instrumen, dipakai di
// layar checklist dan form. Teks deskripsi persis dari lembar informasi
// wawancara B1/B2, dipecah per paragraf.
const INSTRUMEN_INFO = {
  B1: {
    targetRole: 'Kepala Sekolah/Waka Kesiswaan/Guru BK',
    roleOptions: ['Kepala Sekolah', 'Waka Kesiswaan', 'Guru BK'],
    deskripsi: [
      'Kami akan melakukan kegiatan Supervisi Pencegahan dan Penanganan ATS terkait Upaya Pencegahan Anak Beresiko Putus Sekolah dan Penanganan ATS melalui Verval Data ATS. Kegiatan ini dilakukan oleh Direktorat SMA, Direktorat Jenderal Pendidikan Anak Usia Dini, Pendidikan Dasar dan PNFI, Kementerian Pendidikan, Dasar dan Menengah untuk mengidentifikasi apakah satuan pendidikan sudah melakukan upaya pencegahan dan/atau penanganan ATS.',
      'Melalui lembar informasi ini, kami mohon perkenan Bapak/Ibu Kepala Sekolah / Wakil Kepala Sekolah / Guru Bimbingan Konseling Kelas untuk berpartisipasi dalam kegiatan ini melalui wawancara. Perspektif dan pengalaman Bapak/Ibu dan Rekan akan sangat berguna untuk tujuan identifikasi awal dan tindak lanjutnya. Bapak/Ibu dan Rekan memegang peranan penting dalam proses penyusunan kebijakan. Kami berharap Bapak/Ibu dan Rekan bersedia untuk meluangkan waktu dan membantu kami dalam proses wawancara.',
      'Data dan informasi akan disimpan dan dihapus dengan cara yang aman dan rahasia. Data dan informasi yang diberikan akan digunakan dalam memberikan advokasi upaya pencegahan dan penanganan ATS secara lebih tepat.'
    ]
  },
  B2: {
    targetRole: 'Waka Kesiswaan/Guru BK/Operator',
    roleOptions: ['Waka Kesiswaan', 'Guru BK', 'Operator Sekolah'],
    deskripsi: [
      'Kami akan melakukan kegiatan Supervisi Pencegahan dan Penanganan ATS terkait Upaya Pencegahan Anak Beresiko Putus Sekolah dan Penanganan ATS melalui Verval Data ATS. Kegiatan ini dilakukan oleh Direktorat SMA, Direktorat Jenderal Pendidikan Anak Usia Dini, Pendidikan Dasar dan PNFI, Kementerian Pendidikan, Dasar dan Menengah untuk mengidentifikasi apakah satuan pendidikan sudah melakukan upaya pencegahan dan/atau penanganan ATS.',
      'Melalui lembar informasi ini, kami mohon perkenan Bapak/Ibu Kepala Sekolah / Wakil Kepala Sekolah / Guru Bimbingan Konseling / Operator Sekolah untuk berpartisipasi dalam kegiatan ini melalui wawancara dan observasi. Perspektif dan pengalaman Bapak/Ibu dan Rekan akan sangat berguna untuk tujuan memperoleh gambaran dan tindak lanjutnya. Bapak/Ibu dan Rekan memegang peranan penting dalam proses penyusunan kebijakan. Kami berharap Bapak/Ibu dan Rekan bersedia untuk meluangkan waktu dan membantu kami dalam proses wawancara.',
      'Data dan informasi akan disimpan dan dihapus dengan cara yang aman dan rahasia. Data dan informasi yang diberikan akan digunakan dalam memberikan advokasi upaya pencegahan dan penanganan ATS secara lebih tepat.'
    ]
  }
};

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// Pemetaan tipeJawaban dari Bank Soal ke jenis input HTML.
// Baru ketahuan satu nilai pasti dari kontrak: "Teks Panjang (Naratif)".
// Sesuaikan daftar ini begitu nilai tipeJawaban lain dari Bank Soal diketahui.
function tipeInputDari(tipeJawaban) {
  const t = (tipeJawaban || '').toLowerCase();
  if (t.indexOf('panjang') !== -1 || t.indexOf('naratif') !== -1) return 'textarea';
  if (t.indexOf('angka') !== -1) return 'number';
  return 'text';
}

function renderQuestionField(q, idx, val) {
  const tipe = tipeInputDari(q.tipeJawaban);
  const targetTag = q.targetResponden ? '<div class="eyebrow">' + escapeHtml(q.targetResponden) + '</div>' : '';
  const keterangan = q.keterangan ? '<div class="list-row-sub">' + escapeHtml(q.keterangan) + '</div>' : '';
  let input;
  if (tipe === 'textarea') {
    input = '<textarea data-qid="' + q.idButir + '">' + escapeHtml(val) + '</textarea>';
  } else if (tipe === 'number') {
    input = '<input type="number" data-qid="' + q.idButir + '" value="' + escapeAttr(val) + '">';
  } else {
    input = '<input type="text" data-qid="' + q.idButir + '" value="' + escapeAttr(val) + '">';
  }
  return '<div class="field">' + targetTag + '<label>' + (idx + 1) + '. ' + escapeHtml(q.teksPertanyaan) + '</label>' + input + keterangan + '</div>';
}
