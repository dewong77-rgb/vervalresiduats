window.Views = window.Views || {};

// Halaman Progres (endpoint getProgress) — beda dari Rekap (getRekap):
// Rekap menampilkan apa yang SUDAH masuk, Progres membandingkan terhadap
// TARGET/kuota per lokus, supaya tim lapangan tahu mana yang masih kurang.
//
// Catatan: field JSON di bawah mengikuti spesifikasi yang diberikan lewat
// chat (bukan dari file API_CONTRACT.md yang diupload, karena kedua versi
// upload belum punya bagian getProgress). Kalau nama field ternyata beda
// sedikit dari backend asli, akses field di bawah pakai fallback beberapa
// kemungkinan nama supaya tidak gampang patah — tapi kalau tetap ada yang
// tidak cocok, sampaikan supaya disesuaikan.

// Cari properti array di dalam sebuah objek grup, coba nama-nama yang umum
// dipakai dulu, kalau tidak ketemu baru cari properti apa pun yang isinya
// array (di luar nama yang dikecualikan). Backend getProgress ternyata
// tidak memakai nama field persis seperti dugaan awal (mis. "sekolah"),
// jadi pencarian dibuat toleran alih-alih bergantung satu nama saja.
function pickArrayField(obj, candidateNames, excludeNames) {
  if (!obj) return [];
  for (let i = 0; i < candidateNames.length; i++) {
    const v = obj[candidateNames[i]];
    if (Array.isArray(v)) return v;
  }
  const exclude = excludeNames || [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (candidateNames.indexOf(k) !== -1 || exclude.indexOf(k) !== -1) continue;
    if (Array.isArray(obj[k])) return obj[k];
  }
  return [];
}

Views.renderProgress = function (root) {
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  wrap.innerHTML =
    '<div class="eyebrow">Progres Lapangan</div>' +
    '<h2 class="section-title">Progres vs Target</h2>' +
    '<div class="card">' +
      '<div class="field" style="margin-bottom:0;">' +
        '<label>Filter Provinsi</label>' +
        '<select id="sel-filter-provinsi"><option value="">Semua Provinsi</option></select>' +
      '</div>' +
    '</div>' +
    '<div class="progress-tabs">' +
      '<button class="progress-tab active" id="tab-observasi" type="button">Observasi Sekolah</button>' +
      '<button class="progress-tab" id="tab-rtl" type="button">FGD OPD (RTL)</button>' +
    '</div>' +
    '<div id="progress-body"><div class="loading-wrap"><div class="spinner"></div> Memuat progres...</div></div>';

  root.appendChild(wrap);

  const selProvinsi = wrap.querySelector('#sel-filter-provinsi');
  const tabObservasi = wrap.querySelector('#tab-observasi');
  const tabRtl = wrap.querySelector('#tab-rtl');
  const body = wrap.querySelector('#progress-body');

  let activeTab = 'observasi';
  let lastData = null;

  cachedProvinsi().then(function (list) {
    selProvinsi.innerHTML = '<option value="">Semua Provinsi</option>' +
      list.map(function (p) { return '<option value="' + escapeAttr(p) + '">' + escapeHtml(p) + '</option>'; }).join('');
  }).catch(function (e) {
    console.error('loadProvinsi (progres) gagal:', e);
  });

  function setActiveTab(tab) {
    activeTab = tab;
    tabObservasi.classList.toggle('active', tab === 'observasi');
    tabRtl.classList.toggle('active', tab === 'rtl');
    renderBody();
  }

  tabObservasi.onclick = function () { setActiveTab('observasi'); };
  tabRtl.onclick = function () { setActiveTab('rtl'); };

  function loadData() {
    body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div> Memuat progres...</div>';
    apiGetProgress(selProvinsi.value || undefined).then(function (data) {
      lastData = data;
      renderBody();
    }).catch(function (e) {
      console.error('loadProgress gagal:', e);
      body.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal memuat progres: ' + escapeHtml(e.message || e) + '</div>';
    });
  }

  selProvinsi.onchange = loadData;

  function renderBody() {
    if (!lastData) return;
    if (activeTab === 'observasi') {
      renderObservasi(lastData.observasi || []);
    } else {
      renderRtl(lastData.rtl || []);
    }
  }

  function labelStatusLokusClass(status) {
    if (status === 'Selesai' || status === true) return 'badge-selesai';
    return 'badge-proses';
  }

  function renderObservasi(list) {
    if (!list.length) {
      body.innerHTML = '<div class="empty-hint">Tidak ada data progres observasi.</div>';
      return;
    }
    body.innerHTML = list.map(function (grp, gi) {
      const sekolahListRaw = pickArrayField(
        grp,
        ['sekolah', 'sekolahList', 'daftarSekolah', 'detailSekolah', 'listSekolah', 'rincianSekolah', 'detail', 'rincian', 'items']
      );
      if (gi === 0 && !sekolahListRaw.length) {
        console.error('renderObservasi: tidak ketemu field array daftar sekolah di grup pertama. Properti yang ada:', Object.keys(grp));
      }
      const targetSekolah = grp.targetSekolah != null ? grp.targetSekolah : sekolahListRaw.length;
      const lengkap = grp.lengkapKeduanya != null ? grp.lengkapKeduanya : sekolahListRaw.filter(function (sk) { return sk.sudahB1 && sk.sudahB2; }).length;
      const statusLokus = grp.statusLokus || (lengkap >= targetSekolah && targetSekolah > 0 ? 'Selesai' : 'Proses');
      const sekolahList = sekolahListRaw.slice().sort(function (a, b) {
        const aDone = a.sudahB1 && a.sudahB2 ? 1 : 0;
        const bDone = b.sudahB1 && b.sudahB2 ? 1 : 0;
        return aDone - bDone;
      });

      const rows = sekolahList.map(function (sk) {
        const tagBeda = sk.sesuaiLokus === false ? '<span class="tag-info">Beda dari lokus awal</span>' : '';
        return (
          '<div class="list-row-static">' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px;">' + escapeHtml(sk.namaSekolah || sk.nama || '-') + tagBeda + '</div>' +
              '<div class="hint">NPSN ' + escapeHtml(sk.npsn || '-') + '</div>' +
            '</div>' +
            '<div class="progress-group-meta">' +
              '<span class="badge ' + (sk.sudahB1 ? 'badge-selesai' : 'badge-belum') + '">B1</span>' +
              '<span class="badge ' + (sk.sudahB2 ? 'badge-selesai' : 'badge-belum') + '">B2</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      return (
        '<div class="progress-group" data-grp="obs-' + gi + '">' +
          '<div class="progress-group-header">' +
            '<div>' +
              '<div class="progress-group-title">' + escapeHtml(grp.kabKota || '-') + '</div>' +
              '<div class="progress-group-sub">' + escapeHtml(grp.provinsi || '-') + ' &middot; ' + lengkap + '/' + targetSekolah + ' sekolah lengkap</div>' +
            '</div>' +
            '<div class="progress-group-meta">' +
              '<span class="badge ' + labelStatusLokusClass(statusLokus) + '">' + escapeHtml(statusLokus) + '</span>' +
              '<span class="progress-group-chevron">&#9656;</span>' +
            '</div>' +
          '</div>' +
          '<div class="progress-group-body">' + (rows || '<div class="empty-hint">' + (targetSekolah > 0 ? 'Data sekolah tidak terbaca dari respons server (cek console browser).' : 'Belum ada sekolah.') + '</div>') + '</div>' +
        '</div>'
      );
    }).join('');
    attachToggles(body);
  }

  function renderRtl(list) {
    if (!list.length) {
      body.innerHTML = '<div class="empty-hint">Tidak ada data progres RTL.</div>';
      return;
    }
    body.innerHTML = list.map(function (grp, gi) {
      const opdList = pickArrayField(
        grp,
        ['opd', 'opdList', 'daftarOPD', 'detailOPD', 'listOPD', 'rincianOPD', 'detail', 'rincian', 'items'],
        ['diLuarTarget']
      );
      if (gi === 0 && !opdList.length) {
        console.error('renderRtl: tidak ketemu field array daftar OPD di grup pertama. Properti yang ada:', Object.keys(grp));
      }
      const targetOPD = grp.targetOPD != null ? grp.targetOPD : opdList.length;
      const sudahIsi = grp.sudahIsi != null ? grp.sudahIsi : opdList.filter(function (o) { return o.sudahIsi; }).length;
      const belumIsi = grp.belumIsi != null ? grp.belumIsi : Math.max(targetOPD - sudahIsi, 0);
      const diLuar = grp.diLuarTarget || [];

      const rows = opdList.map(function (o) {
        const info = o.sudahIsi
          ? ((o.jumlahKegiatan != null ? o.jumlahKegiatan + ' kegiatan' : '') + (o.terakhir ? ' &middot; ' + escapeHtml(o.terakhir) : ''))
          : 'Belum isi';
        return (
          '<div class="list-row-static">' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px;">' + escapeHtml(o.namaOPD || o.nama || '-') + '</div>' +
              '<div class="hint">' + info + '</div>' +
            '</div>' +
            '<span class="badge ' + (o.sudahIsi ? 'badge-selesai' : 'badge-belum') + '">' + (o.sudahIsi ? 'Sudah Isi' : 'Belum Isi') + '</span>' +
          '</div>'
        );
      }).join('');

      let diLuarHtml = '';
      if (diLuar.length) {
        diLuarHtml =
          '<div class="progress-subheading">OPD di Luar Daftar Resmi</div>' +
          diLuar.map(function (o) {
            const info = (o.jumlahKegiatan != null ? o.jumlahKegiatan + ' kegiatan' : '') + (o.terakhir ? ' &middot; ' + escapeHtml(o.terakhir) : '');
            return (
              '<div class="list-row-static">' +
                '<div>' +
                  '<div style="font-weight:600;font-size:13px;">' + escapeHtml(o.namaOPD || o.nama || '-') + ' <span class="tag-info">OPD di luar daftar resmi</span></div>' +
                  '<div class="hint">' + info + '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');
      }

      const badgeStatus = belumIsi === 0
        ? '<span class="badge badge-selesai">Lengkap</span>'
        : '<span class="badge badge-proses">' + belumIsi + ' belum isi</span>';

      return (
        '<div class="progress-group" data-grp="rtl-' + gi + '">' +
          '<div class="progress-group-header">' +
            '<div>' +
              '<div class="progress-group-title">' + escapeHtml(grp.provinsi || '-') + '</div>' +
              '<div class="progress-group-sub">' + sudahIsi + '/' + targetOPD + ' OPD sudah isi RTL</div>' +
            '</div>' +
            '<div class="progress-group-meta">' +
              badgeStatus +
              '<span class="progress-group-chevron">&#9656;</span>' +
            '</div>' +
          '</div>' +
          '<div class="progress-group-body">' + (rows || '<div class="empty-hint">' + (targetOPD > 0 ? 'Data OPD tidak terbaca dari respons server (cek console browser).' : 'Belum ada OPD.') + '</div>') + diLuarHtml + '</div>' +
        '</div>'
      );
    }).join('');
    attachToggles(body);
  }

  function attachToggles(container) {
    container.querySelectorAll('.progress-group-header').forEach(function (header) {
      header.onclick = function () {
        header.closest('.progress-group').classList.toggle('open');
      };
    });
  }

  loadData();
};
