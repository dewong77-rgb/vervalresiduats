window.Views = window.Views || {};

function renderDraftBanner(session) {
  const label = session.jenis === 'fgd'
    ? 'FGD ' + escapeHtml(session.lokus.namaOPD)
    : 'Observasi ' + escapeHtml(session.lokus.sekolah.nama) + ' (' + escapeHtml(session.instrumen) + ')';
  return '<div class="draft-banner"><div class="draft-banner-text">Ada isian belum selesai untuk <strong>' + label + '</strong>.</div>' +
    '<button class="btn btn-outline" id="btn-lanjutkan-draft" type="button">Lanjutkan Isian</button></div>';
}

Views.renderPilihLokus = async function (root) {
  const draftBanner = App.session ? renderDraftBanner(App.session) : '';
  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Langkah 1</div>
      <h2 class="section-title">Pilih Kegiatan</h2>
      ${draftBanner}
      <div class="card">
        <div class="field">
          <label for="inp-jenis">Jenis Kegiatan</label>
          <select id="inp-jenis">
            <option value="observasi">Observasi Sekolah</option>
            <option value="fgd">FGD OPD</option>
          </select>
        </div>
        <div id="area-dinamis"><div class="loading-wrap"><span class="spinner"></span> Memuat provinsi...</div></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-lanjut">Lanjut</button>
      </div>
    </div>
  `;

  const btnLanjutkanDraft = document.getElementById('btn-lanjutkan-draft');
  if (btnLanjutkanDraft) {
    btnLanjutkanDraft.onclick = function () {
      goTo(App.session.jenis === 'fgd' ? '#/daftar-kegiatan' : '#/form');
    };
  }

  const jenisSel = document.getElementById('inp-jenis');
  const area = document.getElementById('area-dinamis');
  let provinsiList = [];

  try {
    provinsiList = await cachedProvinsi();
  } catch (e) {
    console.error('cachedProvinsi gagal:', e);
    area.innerHTML = '<div class="empty-hint">Gagal memuat provinsi: ' + escapeHtml(e.message) + '</div>';
    return;
  }

  function opsiProvinsi() {
    return provinsiList.map(function (p) {
      return '<option value="' + escapeAttr(p) + '">' + escapeHtml(p) + '</option>';
    }).join('');
  }

  function opsiTargetResponden() {
    return ['B1', 'B2'].map(function (kode) {
      const info = INSTRUMEN_INFO[kode];
      return '<label class="target-option">' +
        '<input type="radio" name="target-instrumen" value="' + kode + '">' +
        '<div><div class="target-option-title">' + escapeHtml(info.pilihLabel) + '</div>' +
        '<div class="target-option-sub">Instrumen ' + kode + ' &middot; ' + escapeHtml(info.targetRole) + '</div></div>' +
        '</label>';
    }).join('');
  }

  function renderAreaObservasi() {
    area.innerHTML =
      '<div class="field">' +
      '<label>Target Responden</label>' +
      '<div class="target-options">' + opsiTargetResponden() + '</div>' +
      '</div>' +
      '<div class="field"><label for="inp-provinsi">Provinsi</label><select id="inp-provinsi">' + opsiProvinsi() + '</select></div>' +
      '<div class="field"><label for="inp-kabkota">Kab/Kota</label><select id="inp-kabkota"><option value="">Memuat...</option></select></div>' +
      '<div class="field"><label for="inp-sekolah">Sekolah</label><select id="inp-sekolah"><option value="">Pilih Kab/Kota dulu</option></select></div>' +
      '<div id="area-manual-sekolah" style="display:none;">' +
      '<div class="field"><label for="inp-nama-sekolah-manual">Nama Sekolah</label><input type="text" id="inp-nama-sekolah-manual"></div>' +
      '<div class="field"><label for="inp-npsn-manual">NPSN</label><input type="text" id="inp-npsn-manual"></div>' +
      '</div>';

    const provSel = document.getElementById('inp-provinsi');
    const kabSel = document.getElementById('inp-kabkota');
    const sekSel = document.getElementById('inp-sekolah');
    const manualBox = document.getElementById('area-manual-sekolah');

    async function loadKabKota() {
      kabSel.innerHTML = '<option value="">Memuat...</option>';
      sekSel.innerHTML = '<option value="">Pilih Kab/Kota dulu</option>';
      manualBox.style.display = 'none';
      try {
        const raw = await cachedKabKota(provSel.value);
        const filtered = raw.filter(function (k) { return k.indexOf('(FGD Dinas)') === -1; });
        if (!filtered.length) {
          kabSel.innerHTML = '<option value="">Tidak ada kab/kota dengan sekolah</option>';
          return;
        }
        kabSel.innerHTML = filtered.map(function (k) {
          return '<option value="' + escapeAttr(k) + '">' + escapeHtml(k) + '</option>';
        }).join('');
        loadSekolah();
      } catch (e) {
        console.error('loadKabKota gagal:', e);
        kabSel.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
      }
    }

    async function loadSekolah() {
      sekSel.innerHTML = '<option value="">Memuat...</option>';
      manualBox.style.display = 'none';
      try {
        const data = await cachedSekolah(provSel.value, kabSel.value);
        const opts = data.map(function (d, i) {
          return '<option value="' + i + '">' + escapeHtml(d.nama) + ' (' + escapeHtml(d.npsn) + ')</option>';
        }).join('');
        sekSel.innerHTML = opts + '<option value="manual">Sekolah lain (isi manual)</option>';
        sekSel.dataset.list = JSON.stringify(data);
        sekSel.onchange = function () {
          manualBox.style.display = sekSel.value === 'manual' ? 'block' : 'none';
        };
        if (!data.length) manualBox.style.display = 'block';
      } catch (e) {
        console.error('loadSekolah gagal:', e);
        sekSel.innerHTML = '<option value="manual">Sekolah lain (isi manual)</option>';
        sekSel.dataset.list = '[]';
        manualBox.style.display = 'block';
      }
    }

    provSel.onchange = loadKabKota;
    kabSel.onchange = loadSekolah;
    loadKabKota();
  }

  function renderAreaFgd() {
    area.innerHTML =
      '<div class="field"><label for="inp-provinsi">Provinsi</label><select id="inp-provinsi">' + opsiProvinsi() + '</select></div>' +
      '<div class="field"><label for="inp-opd">Kategori OPD</label><select id="inp-opd"><option value="">Memuat...</option></select></div>' +
      '<div id="area-manual-opd" style="display:none;">' +
      '<div class="field"><label for="inp-nama-opd-manual">Nama OPD</label><input type="text" id="inp-nama-opd-manual"></div>' +
      '<div class="field"><label for="inp-alamat-opd-manual">Alamat OPD</label><input type="text" id="inp-alamat-opd-manual"></div>' +
      '</div>' +
      '<div class="field"><label for="inp-nama-pengisi">Nama Peserta yang Mengisi</label><input type="text" id="inp-nama-pengisi"></div>' +
      '<div class="field"><label for="inp-jabatan-pengisi">Jabatan Peserta</label><input type="text" id="inp-jabatan-pengisi"></div>';

    const provSel = document.getElementById('inp-provinsi');
    const opdSel = document.getElementById('inp-opd');
    const manualBox = document.getElementById('area-manual-opd');

    async function loadOpd() {
      opdSel.innerHTML = '<option value="">Memuat...</option>';
      manualBox.style.display = 'none';
      try {
        const data = await cachedOPD(provSel.value);
        const opts = data.map(function (d, i) {
          return '<option value="' + i + '">' + escapeHtml(d.nama) + '</option>';
        }).join('');
        opdSel.innerHTML = opts + '<option value="manual">OPD lain (isi manual)</option>';
        opdSel.dataset.list = JSON.stringify(data);
        opdSel.onchange = function () {
          manualBox.style.display = opdSel.value === 'manual' ? 'block' : 'none';
        };
        if (!data.length) manualBox.style.display = 'block';
      } catch (e) {
        console.error('loadOpd gagal:', e);
        opdSel.innerHTML = '<option value="manual">OPD lain (isi manual)</option>';
        opdSel.dataset.list = '[]';
        manualBox.style.display = 'block';
      }
    }

    provSel.onchange = loadOpd;
    loadOpd();
  }

  jenisSel.onchange = function () {
    if (jenisSel.value === 'fgd') renderAreaFgd(); else renderAreaObservasi();
  };
  renderAreaObservasi();

  document.getElementById('btn-lanjut').onclick = function () {
    const jenis = jenisSel.value;
    const provSel = document.getElementById('inp-provinsi');
    if (!provSel || !provSel.value) { alert('Pilih provinsi terlebih dahulu.'); return; }

    if (jenis === 'fgd') {
      const opdSel = document.getElementById('inp-opd');
      let opd;
      if (opdSel.value === 'manual') {
        const nama = document.getElementById('inp-nama-opd-manual').value.trim();
        const alamat = document.getElementById('inp-alamat-opd-manual').value.trim();
        if (!nama) { alert('Nama OPD wajib diisi.'); return; }
        opd = { nama: nama, alamat: alamat };
      } else {
        const list = JSON.parse(opdSel.dataset.list || '[]');
        opd = list[Number(opdSel.value)];
        if (!opd) { alert('Pilih kategori OPD terlebih dahulu.'); return; }
      }
      const namaPengisi = document.getElementById('inp-nama-pengisi').value.trim();
      const jabatanPengisi = document.getElementById('inp-jabatan-pengisi').value.trim();
      if (!namaPengisi) { alert('Nama peserta yang mengisi wajib diisi.'); return; }

      App.session = {
        jenis: 'fgd',
        lokus: { provinsi: provSel.value, namaOPD: opd.nama, alamatOPD: opd.alamat || '' },
        pengisi: { nama: namaPengisi, jabatan: jabatanPengisi },
        kegiatan: [],
        hasil: null
      };
      saveDraft(App.session);
      goTo('#/daftar-kegiatan');
      return;
    }

    const targetRadio = document.querySelector('input[name="target-instrumen"]:checked');
    if (!targetRadio) { alert('Pilih target responden terlebih dahulu.'); return; }
    const instrumen = targetRadio.value;

    const kabSel = document.getElementById('inp-kabkota');
    if (!kabSel.value) { alert('Pilih Kab/Kota terlebih dahulu.'); return; }
    const sekSel = document.getElementById('inp-sekolah');

    let sekolah;
    if (sekSel.value === 'manual') {
      const nama = document.getElementById('inp-nama-sekolah-manual').value.trim();
      const npsn = document.getElementById('inp-npsn-manual').value.trim();
      if (!nama) { alert('Nama sekolah wajib diisi.'); return; }
      sekolah = { nama: nama, npsn: npsn };
    } else {
      const list = JSON.parse(sekSel.dataset.list || '[]');
      const item = list[Number(sekSel.value)];
      if (!item) { alert('Pilih sekolah terlebih dahulu.'); return; }
      sekolah = item;
    }

    App.session = {
      jenis: 'observasi',
      instrumen: instrumen,
      lokus: { provinsi: provSel.value, kabKota: kabSel.value, sekolah: sekolah },
      identity: {
        narasumber: [{ nama: '', jabatan: '' }],
        jumlahSiswa: '',
        petugas: [{ nama: '', instansi: '' }]
      },
      jawaban: {},
      hasil: null
    };
    saveDraft(App.session);
    goTo('#/form');
  };
};
