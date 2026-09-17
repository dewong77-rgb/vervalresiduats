window.Views = window.Views || {};

function identityKosong() {
  return {
    narasumber: [{ nama: '', jabatan: '' }],
    jumlahSiswa: '',
    petugas: [{ nama: '', instansi: '' }]
  };
}

function renderDraftBanner(session) {
  const label = session.jenis === 'fgd'
    ? 'FGD ' + escapeHtml(session.lokus.namaOPD)
    : 'Observasi ' + escapeHtml(session.lokus.sekolah.nama);
  return '<div class="draft-banner"><div class="draft-banner-text">Ada isian belum selesai untuk <strong>' + label + '</strong>.</div>' +
    '<button class="btn btn-outline" id="btn-lanjutkan-draft" type="button">Lanjutkan Isian</button></div>';
}

Views.renderPilihLokus = async function (root) {
  const draftBanner = App.session ? renderDraftBanner(App.session) : '';
  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Langkah 1 dari 3</div>
      <h2 class="section-title">Pilih Kegiatan &amp; Lokus</h2>
      ${draftBanner}
      <div class="card">
        <div class="field">
          <label for="inp-jenis">Jenis Kegiatan</label>
          <select id="inp-jenis">
            <option value="observasi">Observasi Sekolah (B1 &amp; B2)</option>
            <option value="fgd">FGD Dinas (RTL)</option>
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
      goTo(App.session.jenis === 'fgd' ? '#/daftar-kegiatan' : '#/checklist-instrumen');
    };
  }

  const jenisSel = document.getElementById('inp-jenis');
  const area = document.getElementById('area-dinamis');
  let provinsiList = [];

  try {
    provinsiList = await cachedProvinsi();
  } catch (e) {
    area.innerHTML = '<div class="empty-hint">Gagal memuat provinsi: ' + escapeHtml(e.message) + '</div>';
    return;
  }

  function opsiProvinsi() {
    return provinsiList.map(function (p) {
      return '<option value="' + escapeAttr(p) + '">' + escapeHtml(p) + '</option>';
    }).join('');
  }

  function renderAreaObservasi() {
    area.innerHTML =
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
        kabSel.innerHTML = '<option value="">Gagal memuat</option>';
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
      '<div class="field"><label for="inp-nama-opd">Nama OPD</label><input type="text" id="inp-nama-opd" placeholder="Contoh: Dinas Pendidikan Kota Bandung"></div>' +
      '<div class="field"><label for="inp-alamat-opd">Alamat OPD</label><input type="text" id="inp-alamat-opd"></div>';
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
      const namaOPD = document.getElementById('inp-nama-opd').value.trim();
      const alamatOPD = document.getElementById('inp-alamat-opd').value.trim();
      if (!namaOPD) { alert('Nama OPD wajib diisi.'); return; }
      App.session = {
        jenis: 'fgd',
        lokus: { provinsi: provSel.value, namaOPD: namaOPD, alamatOPD: alamatOPD },
        kegiatan: [],
        hasil: null
      };
      saveDraft(App.session);
      goTo('#/daftar-kegiatan');
      return;
    }

    const kabSel = document.getElementById('inp-kabkota');
    const sekSel = document.getElementById('inp-sekolah');
    if (!kabSel.value) { alert('Pilih Kab/Kota terlebih dahulu.'); return; }

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
      lokus: { provinsi: provSel.value, kabKota: kabSel.value, sekolah: sekolah },
      perInstrumen: {
        B1: { hasil: null, identity: identityKosong(), jawaban: {} },
        B2: { hasil: null, identity: identityKosong(), jawaban: {} }
      }
    };
    saveDraft(App.session);
    goTo('#/checklist-instrumen');
  };
};
