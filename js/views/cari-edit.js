window.Views = window.Views || {};

Views.renderCariEdit = function (root) {
  root.innerHTML = `
    <div class="screen">
      <div class="eyebrow">Cari &amp; Edit Isian</div>
      <h2 class="section-title">Cari Isian yang Sudah Terkirim</h2>
      <div class="card">
        <div class="field">
          <label for="inp-jenis-edit">Jenis</label>
          <select id="inp-jenis-edit">
            <option value="B1">Observasi &mdash; Instrumen B1</option>
            <option value="B2">Observasi &mdash; Instrumen B2</option>
            <option value="RTL">FGD &mdash; RTL</option>
          </select>
        </div>
        <div id="area-cari"></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="btn-batal">Batal</button>
        <button class="btn btn-primary" id="btn-cari">Cari</button>
      </div>
      <div id="hasil-cari"></div>
    </div>
  `;

  const jenisSel = document.getElementById('inp-jenis-edit');
  const area = document.getElementById('area-cari');

  function renderAreaB() {
    area.innerHTML = '<div class="field"><label for="inp-kode-referensi">Kode Referensi</label>' +
      '<input type="text" id="inp-kode-referensi" placeholder="Contoh: B1-20206146-20260917"></div>';
  }

  function renderAreaRtl() {
    area.innerHTML =
      '<div class="field"><label for="inp-provinsi-cari">Provinsi</label><input type="text" id="inp-provinsi-cari" placeholder="Contoh: Jawa Barat"></div>' +
      '<div class="field"><label for="inp-opd-cari">Nama OPD</label><input type="text" id="inp-opd-cari" placeholder="Nama OPD persis seperti saat submit"></div>';
  }

  jenisSel.onchange = function () {
    if (jenisSel.value === 'RTL') renderAreaRtl(); else renderAreaB();
  };
  renderAreaB();

  document.getElementById('btn-batal').onclick = function () { goTo('#/pilih-lokus'); };

  document.getElementById('btn-cari').onclick = async function () {
    const jenis = jenisSel.value;
    const hasilBox = document.getElementById('hasil-cari');
    hasilBox.innerHTML = '<div class="loading-wrap"><span class="spinner"></span> Mencari...</div>';

    try {
      if (jenis === 'RTL') {
        const provinsi = document.getElementById('inp-provinsi-cari').value.trim();
        const namaOPD = document.getElementById('inp-opd-cari').value.trim();
        if (!provinsi || !namaOPD) {
          hasilBox.innerHTML = '<div class="empty-hint">Isi Provinsi dan Nama OPD dulu.</div>';
          return;
        }
        const data = await apiGetIsianRTL(provinsi, namaOPD);
        if (!data.kegiatan || !data.kegiatan.length) {
          hasilBox.innerHTML = '<div class="empty-hint">Tidak ditemukan isian RTL untuk OPD ini. Pastikan nama OPD ditulis persis seperti saat submit.</div>';
          return;
        }

        App.session = {
          jenis: 'fgd',
          editMode: true,
          lokus: {
            provinsi: provinsi,
            namaOPD: data.identity['Nama OPD'] || namaOPD,
            alamatOPD: data.identity['Alamat OPD'] || ''
          },
          pengisi: { nama: data.identity['Nama'] || '', jabatan: data.identity['Jabatan'] || '' },
          kegiatan: data.kegiatan.map(function (k) {
            const jawaban = {};
            Object.keys(k).forEach(function (key) {
              if (key !== 'idIsian' && key !== 'kodeReferensi' && key !== 'timestamp') jawaban[key] = k[key];
            });
            return { idIsian: k.idIsian, jawaban: jawaban };
          }),
          hasil: null
        };
        saveDraft(App.session);
        goTo('#/daftar-kegiatan');
        return;
      }

      const instrumen = jenis;
      const kodeReferensi = document.getElementById('inp-kode-referensi').value.trim();
      if (!kodeReferensi) {
        hasilBox.innerHTML = '<div class="empty-hint">Isi kode referensi dulu.</div>';
        return;
      }
      const data = await apiGetIsian(instrumen, kodeReferensi);

      const namaResponden = splitJoined(data.identity['Nama Responden']);
      const jabatanResponden = splitJoined(data.identity['Jabatan Responden']);
      const namaPetugas = splitJoined(data.identity['Nama Petugas Pewawancara']);
      const instansiPetugas = splitJoined(data.identity['Instansi Petugas']);
      const narasumber = namaResponden.map(function (nama, i) { return { nama: nama, jabatan: jabatanResponden[i] || '' }; });
      const petugas = namaPetugas.map(function (nama, i) { return { nama: nama, instansi: instansiPetugas[i] || '' }; });

      App.session = {
        jenis: 'observasi',
        instrumen: instrumen,
        editMode: true,
        idIsian: data.idIsian,
        lokus: {
          provinsi: data.identity['Provinsi'],
          kabKota: data.identity['Kab/Kota'],
          sekolah: { nama: data.identity['Nama Sekolah'], npsn: data.identity['NPSN'] }
        },
        identity: {
          narasumber: narasumber.length ? narasumber : [{ nama: '', jabatan: '' }],
          jumlahSiswa: data.identity['Jumlah Siswa'] || '',
          petugas: petugas.length ? petugas : [{ nama: '', instansi: '' }]
        },
        jawaban: data.jawaban || {},
        hasil: null
      };
      saveDraft(App.session);
      goTo('#/form');
    } catch (e) {
      hasilBox.innerHTML = '<div class="empty-hint">Gagal menemukan isian: ' + escapeHtml(e.message) + '</div>';
    }
  };
};
