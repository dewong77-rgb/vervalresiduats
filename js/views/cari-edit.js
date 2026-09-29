window.Views = window.Views || {};

Views.renderCariEdit = function (root) {
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  wrap.innerHTML =
    '<div class="eyebrow">Cari &amp; Edit Isian</div>' +
    '<h2 class="section-title">Lanjutkan atau Ubah Isian Tersimpan</h2>' +
    '<div class="card">' +
      '<div class="field">' +
        '<label>Jenis Isian</label>' +
        '<select id="sel-jenis-cari">' +
          '<option value="">-- Pilih jenis isian --</option>' +
          '<option value="B1">Observasi &mdash; Instrumen B1</option>' +
          '<option value="B2">Observasi &mdash; Instrumen B2</option>' +
          '<option value="RTL">FGD OPD &mdash; RTL</option>' +
        '</select>' +
      '</div>' +
      '<div id="area-cari"></div>' +
      '<div id="status-cari"></div>' +
    '</div>' +
    '<div class="btn-row"><button class="btn btn-outline" id="btn-kembali" type="button">Kembali</button></div>';

  root.appendChild(wrap);

  wrap.querySelector('#btn-kembali').onclick = function () { goTo('#/pilih-lokus'); };

  const areaCari = wrap.querySelector('#area-cari');
  const statusCari = wrap.querySelector('#status-cari');

  wrap.querySelector('#sel-jenis-cari').onchange = function (e) {
    statusCari.innerHTML = '';
    const jenis = e.target.value;
    if (jenis === 'B1' || jenis === 'B2') {
      areaCari.innerHTML =
        '<div class="field"><label>Kode Referensi</label><input type="text" id="inp-kode-referensi" placeholder="contoh: B1-20206146-20260917"></div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="btn-cari" type="button">Cari Isian</button></div>';
      wrap.querySelector('#btn-cari').onclick = function () {
        const kode = wrap.querySelector('#inp-kode-referensi').value.trim();
        if (!kode) { alert('Isi kode referensi terlebih dahulu.'); return; }
        cariB1B2(jenis, kode);
      };
    } else if (jenis === 'RTL') {
      areaCari.innerHTML =
        '<div class="field"><label>Provinsi</label><input type="text" id="inp-prov-rtl" placeholder="contoh: Jawa Barat"></div>' +
        '<div class="field"><label>Nama OPD</label><input type="text" id="inp-opd-rtl" placeholder="contoh: Dinas Pendidikan Kota Bandung"></div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="btn-cari-rtl" type="button">Cari Isian</button></div>';
      wrap.querySelector('#btn-cari-rtl').onclick = function () {
        const prov = wrap.querySelector('#inp-prov-rtl').value.trim();
        const opd = wrap.querySelector('#inp-opd-rtl').value.trim();
        if (!prov || !opd) { alert('Isi provinsi dan nama OPD terlebih dahulu.'); return; }
        cariRTL(prov, opd);
      };
    } else {
      areaCari.innerHTML = '';
    }
  };

  function cariB1B2(instrumen, kode) {
    statusCari.innerHTML = '<div class="loading-wrap"><div class="spinner"></div> Mencari...</div>';
    apiGetIsian(instrumen, kode).then(function (data) {
      const identity = data.identity || {};
      App.session = {
        jenis: 'observasi',
        instrumen: instrumen,
        editMode: true,
        idIsian: data.idIsian,
        lokus: {
          provinsi: identity['Provinsi'] || '',
          kabKota: identity['Kab/Kota'] || '',
          sekolah: { nama: identity['Nama Sekolah'] || '', npsn: identity['NPSN'] || '' }
        },
        identity: {
          narasumber: (function () {
            const namas = splitJoined(identity['Nama Responden']);
            const jabatans = splitJoined(identity['Jabatan Responden']);
            const len = Math.max(namas.length, jabatans.length, 1);
            const arr = [];
            for (let i = 0; i < len; i++) arr.push({ nama: namas[i] || '', jabatan: jabatans[i] || '' });
            return arr;
          })(),
          jumlahSiswa: identity['Jumlah Siswa'] || '',
          petugas: (function () {
            const namas = splitJoined(identity['Nama Petugas Pewawancara']);
            const instansis = splitJoined(identity['Instansi Petugas']);
            const len = Math.max(namas.length, instansis.length, 1);
            const arr = [];
            for (let i = 0; i < len; i++) arr.push({ nama: namas[i] || '', instansi: instansis[i] || '' });
            return arr;
          })()
        },
        jawaban: data.jawaban || {},
        hasil: null
      };
      saveDraft(App.session);
      goTo('#/form');
    }).catch(function (e) {
      console.error('cariB1B2 gagal:', e);
      statusCari.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal mencari: ' + escapeHtml(e.message || e) + '</div>';
    });
  }

  function cariRTL(provinsi, namaOPD) {
    statusCari.innerHTML = '<div class="loading-wrap"><div class="spinner"></div> Mencari...</div>';
    apiGetIsianRTL(provinsi, namaOPD).then(function (data) {
      const identity = data.identity || {};
      const kegiatan = (data.kegiatan || []).map(function (row) {
        const jawaban = {};
        let idIsian;
        Object.keys(row).forEach(function (k) {
          if (k === 'idIsian') { idIsian = row[k]; return; }
          if (k === 'kodeReferensi' || k === 'timestamp') return;
          jawaban[k] = row[k];
        });
        return { idIsian: idIsian, jawaban: jawaban };
      });
      App.session = {
        jenis: 'fgd',
        editMode: true,
        lokus: { provinsi: identity['Provinsi'] || provinsi, namaOPD: identity['Nama OPD'] || namaOPD, alamatOPD: identity['Alamat OPD'] || '' },
        pengisi: { nama: identity['Nama'] || '', jabatan: identity['Jabatan'] || '' },
        kegiatan: kegiatan,
        hasil: null
      };
      saveDraft(App.session);
      goTo('#/daftar-kegiatan');
    }).catch(function (e) {
      console.error('cariRTL gagal:', e);
      statusCari.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal mencari: ' + escapeHtml(e.message || e) + '</div>';
    });
  }
};
