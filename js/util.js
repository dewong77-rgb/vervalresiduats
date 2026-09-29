function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// Balik string hasil join('; ') jadi array trimmed, dipakai saat edit isian
// yang identity-nya sudah digabung jadi satu string (Nama Responden, dst).
function splitJoined(str) {
  if (!str) return [];
  return String(str)
    .split(';')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

// Belum semua nilai tipeJawaban dari backend terkonfirmasi, baru "Teks
// Panjang (Naratif)" yang pasti. Selebihnya ditebak dari kata kunci.
function tipeInputDari(tipeJawaban) {
  const t = (tipeJawaban || '').toLowerCase();
  if (t.indexOf('panjang') !== -1 || t.indexOf('naratif') !== -1) return 'textarea';
  if (t.indexOf('angka') !== -1) return 'number';
  return 'text';
}

function renderQuestionField(q, idx, val) {
  const tipe = tipeInputDari(q.tipeJawaban);
  const value = val || '';
  let inputHtml;
  if (tipe === 'textarea') {
    inputHtml = '<textarea data-id-butir="' + escapeAttr(q.idButir) + '" placeholder="Tulis jawaban...">' + escapeHtml(value) + '</textarea>';
  } else if (tipe === 'number') {
    inputHtml = '<input type="number" data-id-butir="' + escapeAttr(q.idButir) + '" value="' + escapeAttr(value) + '">';
  } else {
    inputHtml = '<input type="text" data-id-butir="' + escapeAttr(q.idButir) + '" value="' + escapeAttr(value) + '">';
  }

  let sub = '';
  if (q.targetResponden) {
    sub += '<div class="hint">Target: ' + escapeHtml(q.targetResponden) + '</div>';
  }
  if (q.keterangan) {
    sub += '<div class="hint">' + escapeHtml(q.keterangan) + '</div>';
  }

  return (
    '<div class="field" data-field-butir="' + escapeAttr(q.idButir) + '">' +
      '<label>' + (idx + 1) + '. ' + escapeHtml(q.teksPertanyaan || q.labelKolom || q.idButir) + '</label>' +
      inputHtml +
      sub +
    '</div>'
  );
}

// Informasi Deskripsi Kegiatan per instrumen. Teks disalin persis dari
// lembar informasi wawancara yang dipakai petugas lapangan — jangan diubah.
const INSTRUMEN_INFO = {
  B1: {
    pilihLabel: 'Kepala Sekolah',
    targetRole: 'Kepala Sekolah / Waka Kesiswaan / Guru BK',
    roleOptions: ['Kepala Sekolah', 'Waka Kesiswaan', 'Guru BK'],
    deskripsi: [
      'Instrumen B1 ditujukan kepada pemangku kebijakan di sekolah: Kepala Sekolah, Wakil Kepala Sekolah bidang Kesiswaan, atau Guru Bimbingan Konseling (BK).',
      'Wawancara ini merupakan bagian dari kegiatan Supervisi Pencegahan dan Penanganan Anak Tidak Sekolah (ATS), bertujuan menggali kebijakan, strategi, dan langkah-langkah yang telah dan akan diambil sekolah dalam mencegah serta menangani siswa yang berisiko putus sekolah atau tidak sekolah.',
      'Narasumber dapat lebih dari satu orang dalam satu sesi wawancara, dan petugas pewawancara yang hadir juga dapat lebih dari satu orang. Seluruh narasumber dan petugas yang terlibat dicatat dalam satu isian ini.',
      'Mohon dijawab berdasarkan kondisi dan kebijakan riil yang berlaku di sekolah, bukan berdasarkan dokumen formal semata.'
    ]
  },
  B2: {
    pilihLabel: 'Operator / Wakasek Kesiswaan / Guru BK',
    targetRole: 'Waka Kesiswaan / Guru BK / Operator',
    roleOptions: ['Waka Kesiswaan', 'Guru BK', 'Operator Sekolah'],
    deskripsi: [
      'Instrumen B2 ditujukan kepada pelaksana teknis di sekolah: Wakil Kepala Sekolah bidang Kesiswaan, Guru Bimbingan Konseling (BK), atau Operator Sekolah (Dapodik).',
      'Wawancara ini merupakan bagian dari kegiatan Supervisi Pencegahan dan Penanganan Anak Tidak Sekolah (ATS), bertujuan menggali data teknis dan operasional terkait siswa residu dan Anak Tidak Sekolah (ATS) di lapangan, termasuk proses pendataan, verifikasi, dan tindak lanjut administratif.',
      'Narasumber dapat lebih dari satu orang dalam satu sesi wawancara, dan petugas pewawancara yang hadir juga dapat lebih dari satu orang. Seluruh narasumber dan petugas yang terlibat dicatat dalam satu isian ini.',
      'Mohon dijawab berdasarkan data dan kondisi teknis yang sebenarnya di lapangan, termasuk kendala yang dihadapi dalam proses pendataan.'
    ]
  }
};
