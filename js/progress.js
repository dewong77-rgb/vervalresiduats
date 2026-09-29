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

// Ambil nilai field pertama yang ADA (bukan undefined) dari beberapa nama
// kandidat. Dipakai untuk field status per baris (sudah B1/B2, sudah isi
// RTL) yang nama persisnya di backend ternyata beda dari dugaan awal.
function pickField(obj, candidateNames) {
  if (!obj) return undefined;
  for (let i = 0; i < candidateNames.length; i++) {
    const v = obj[candidateNames[i]];
    if (v !== undefined) return v;
  }
  return undefined;
}

// Backend bisa saja kirim status sebagai boolean asli, angka, atau teks
// ("Sudah"/"Belum", "true"/"false"). Normalisasi semua ke boolean supaya
// badge dan sorting konsisten apa pun bentuk aslinya.
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 'ya' || s === 'yes' || s === '1' || s === 'sudah' || s === 'selesai' || s === 'lengkap';
  }
  return !!v;
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
      } else if (gi === 0 && sekolahListRaw.length) {
        const contohSk = sekolahListRaw[0];
        const b1Debug = pickField(contohSk, ['sudahB1', 'b1', 'isiB1', 'statusB1', 'lengkapB1']);
        if (b1Debug === undefined) {
          console.error('renderObservasi: tidak ketemu field status B1 di baris sekolah pertama. Properti yang ada:', Object.keys(contohSk));
        }
      }
      const B1_KEYS = ['sudahB1', 'b1', 'isiB1', 'statusB1', 'lengkapB1'];
      const B2_KEYS = ['sudahB2', 'b2', 'isiB2', 'statusB2', 'lengkapB2'];
      const sudahB1 = function (sk) { return toBool(pickField(sk, B1_KEYS)); };
      const sudahB2 = function (sk) { return toBool(pickField(sk, B2_KEYS)); };

      const targetSekolah = grp.targetSekolah != null ? grp.targetSekolah : sekolahListRaw.length;
      const lengkap = grp.lengkapKeduanya != null ? grp.lengkapKeduanya : sekolahListRaw.filter(function (sk) { return sudahB1(sk) && sudahB2(sk); }).length;
      const statusLokus = grp.statusLokus || (lengkap >= targetSekolah && targetSekolah > 0 ? 'Selesai' : 'Proses');
      const sekolahList = sekolahListRaw.slice().sort(function (a, b) {
        const aDone = sudahB1(a) && sudahB2(a) ? 1 : 0;
        const bDone = sudahB1(b) && sudahB2(b) ? 1 : 0;
        return aDone - bDone;
      });

      const rows = sekolahList.map(function (sk) {
        const sesuaiLokusVal = pickField(sk, ['sesuaiLokus', 'sesuaiTarget', 'cocokLokus']);
        const sesuaiLokus = sesuaiLokusVal === undefined ? true : toBool(sesuaiLokusVal);
        const tagBeda = !sesuaiLokus ? '<span class="tag-info">Beda dari lokus awal</span>' : '';
        return (
          '<div class="list-row-static">' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px;">' + escapeHtml(sk.namaSekolah || sk.nama || '-') + tagBeda + '</div>' +
              '<div class="hint">NPSN ' + escapeHtml(sk.npsn || '-') + '</div>' +
            '</div>' +
            '<div class="progress-group-meta">' +
              '<span class="badge ' + (sudahB1(sk) ? 'badge-selesai' : 'badge-belum') + '">B1</span>' +
              '<span class="badge ' + (sudahB2(sk) ? 'badge-selesai' : 'badge-belum') + '">B2</span>' +
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
      } else if (gi === 0 && opdList.length) {
        const contohO = opdList[0];
        const isiDebug = pickField(contohO, ['sudahIsi', 'isi', 'statusIsi', 'sudah']);
        if (isiDebug === undefined) {
          console.error('renderRtl: tidak ketemu field status sudah-isi di baris OPD pertama. Properti yang ada:', Object.keys(contohO));
        }
      }
      const ISI_KEYS = ['sudahIsi', 'isi', 'statusIsi', 'sudah'];
      const opdSudahIsi = function (o) { return toBool(pickField(o, ISI_KEYS)); };

      const targetOPD = grp.targetOPD != null ? grp.targetOPD : opdList.length;
      const sudahIsi = grp.sudahIsi != null ? grp.sudahIsi : opdList.filter(opdSudahIsi).length;
      const belumIsi = grp.belumIsi != null ? grp.belumIsi : Math.max(targetOPD - sudahIsi, 0);
      const diLuar = grp.diLuarTarget || [];

      const rows = opdList.map(function (o) {
        const sudah = opdSudahIsi(o);
        const info = sudah
          ? ((o.jumlahKegiatan != null ? o.jumlahKegiatan + ' kegiatan' : '') + (o.terakhir ? ' &middot; ' + escapeHtml(o.terakhir) : ''))
          : 'Belum isi';
        return (
          '<div class="list-row-static">' +
            '<div>' +
              '<div style="font-weight:600;font-size:13px;">' + escapeHtml(o.namaOPD || o.nama || '-') + '</div>' +
              '<div class="hint">' + info + '</div>' +
            '</div>' +
            '<span class="badge ' + (sudah ? 'badge-selesai' : 'badge-belum') + '">' + (sudah ? 'Sudah Isi' : 'Belum Isi') + '</span>' +
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
