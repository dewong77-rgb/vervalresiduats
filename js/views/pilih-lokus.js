window.Views = window.Views || {};

Views.renderPilihLokus = function (root) {
  const wrap = document.createElement('div');
  wrap.className = 'screen';

  let draftBanner = '';
  if (App.session && !App.session.hasil) {
    draftBanner =
      '<div class="draft-banner">' +
        '<div><strong>Ada draf isian yang belum selesai.</strong><div class="hint">Lanjutkan atau mulai kegiatan baru di bawah.</div></div>' +
        '<button class="btn btn-primary" id="btn-lanjutkan-draft" type="button">Lanjutkan Isian</button>' +
      '</div>';
  }

  wrap.innerHTML =
    draftBanner +
    '<div class="eyebrow">Langkah 1</div>' +
    '<h2 class="section-title">Pilih Kegiatan</h2>' +
    '<div class="card">' +
      '<div class="field">' +
        '<label>Jenis Kegiatan</label>' +
        '<select id="sel-jenis">' +
          '<option value="">-- Pilih jenis kegiatan --</option>' +
          '<option value="observasi">Observasi Sekolah</option>' +
          '<option value="fgd">FGD OPD</option>' +
        '</select>' +
      '</div>' +
      '<div id="area-observasi" style="display:none;"></div>' +
      '<div id="area-fgd" style="display:none;"></div>' +
      '<div id="area-lokasi"></div>' +
      '<div id="btn-area"></div>' +
    '</div>';

  root.appendChild(wrap);

  const selJenis = wrap.querySelector('#sel-jenis');
  const areaObservasi = wrap.querySelector('#area-observasi');
  const areaFgd = wrap.querySelector('#area-fgd');
  const areaLokasi = wrap.querySelector('#area-lokasi');
  const btnArea = wrap.querySelector('#btn-area');

  const btnLanjut = wrap.querySelector('#btn-lanjutkan-draft');
  if (btnLanjut) {
    btnLanjut.onclick = function () {
      goTo(App.session.jenis === 'fgd' ? '#/daftar-kegiatan' : '#/form');
    };
  }

  let instrumenTerpilih = null;

  selJenis.onchange = function () {
    instrumenTerpilih = null;
    areaLokasi.innerHTML = '';
    btnArea.innerHTML = '';
    if (selJenis.value === 'observasi') {
      areaObservasi.style.display = '';
      areaFgd.style.display = 'none';
      renderTargetResponden();
    } else if (selJenis.value === 'fgd') {
      areaObservasi.style.display = 'none';
      areaFgd.style.display = '';
      renderFgdAwal();
    } else {
      areaObservasi.style.display = 'none';
      areaFgd.style.display = 'none';
    }
  };

  function renderTargetResponden() {
    areaObservasi.innerHTML =
      '<div class="field">' +
        '<label>Target Responden</label>' +
        '<div class="target-options">' +
          '<label class="target-option">' +
            '<input type="radio" name="target-responden" value="B1">' +
            '<div class="opt-title">' + escapeHtml(INSTRUMEN_INFO.B1.pilihLabel) + '</div>' +
            '<div class="opt-desc">Instrumen B1 &middot; ' + escapeHtml(INSTRUMEN_INFO.B1.targetRole) + '</div>' +
          '</label>' +
          '<label class="target-option">' +
            '<input type="radio" name="target-responden" value="B2">' +
            '<div class="opt-title">' + escapeHtml(INSTRUMEN_INFO.B2.pilihLabel) + '</div>' +
            '<div class="opt-desc">Instrumen B2 &middot; ' + escapeHtml(INSTRUMEN_INFO.B2.targetRole) + '</div>' +
          '</label>' +
        '</div>' +
      '</div>';

    const radios = areaObservasi.querySelectorAll('input[name="target-responden"]');
    radios.forEach(function (r) {
      r.onchange = function () {
        instrumenTerpilih = r.value;
        renderLokasiObservasi();
      };
    });
  }

  function renderLokasiObservasi() {
    areaLokasi.innerHTML =
      '<div class="field">' +
        '<label>Provinsi</label>' +
        '<select id="sel-provinsi"><option value="">Memuat...</option></select>' +
      '</div>' +
      '<div class="field" id="field-kabkota" style="display:none;">' +
        '<label>Kab/Kota</label>' +
        '<select id="sel-kabkota"><option value="">-- Pilih provinsi dulu --</option></select>' +
      '</div>' +
      '<div class="field" id="field-sekolah" style="display:none;">' +
        '<label>Sekolah</label>' +
        '<select id="sel-sekolah"><option value="">-- Pilih kab/kota dulu --</option></select>' +
      '</div>' +
      '<div class="field" id="field-sekolah-manual" style="display:none;">' +
        '<label>Nama Sekolah (manual)</label>' +
        '<input type="text" id="inp-nama-sekolah-manual">' +
        '<label style="margin-top:12px;">NPSN (manual)</label>' +
        '<input type="text" id="inp-npsn-manual">' +
      '</div>';

    const selProvinsi = areaLokasi.querySelector('#sel-provinsi');
    const fieldKabkota = areaLokasi.querySelector('#field-kabkota');
    const selKabkota = areaLokasi.querySelector('#sel-kabkota');
    const fieldSekolah = areaLokasi.querySelector('#field-sekolah');
    const selSekolah = areaLokasi.querySelector('#sel-sekolah');
    const fieldSekolahManual = areaLokasi.querySelector('#field-sekolah-manual');

    cachedProvinsi().then(function (list) {
      selProvinsi.innerHTML = '<option value="">-- Pilih provinsi --</option>' +
        list.map(function (p) { return '<option value="' + escapeAttr(p) + '">' + escapeHtml(p) + '</option>'; }).join('');
    }).catch(function (e) {
      console.error('loadProvinsi gagal:', e);
      selProvinsi.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
    });

    selProvinsi.onchange = function () {
      fieldSekolah.style.display = 'none';
      fieldSekolahManual.style.display = 'none';
      btnArea.innerHTML = '';
      if (!selProvinsi.value) {
        fieldKabkota.style.display = 'none';
        return;
      }
      fieldKabkota.style.display = '';
      selKabkota.innerHTML = '<option value="">Memuat...</option>';
      cachedKabKota(selProvinsi.value).then(function (list) {
        const filtered = list.filter(function (k) { return k.indexOf('(FGD Dinas)') === -1; });
        selKabkota.innerHTML = '<option value="">-- Pilih kab/kota --</option>' +
          filtered.map(function (k) { return '<option value="' + escapeAttr(k) + '">' + escapeHtml(k) + '</option>'; }).join('');
      }).catch(function (e) {
        console.error('loadKabKota gagal:', e);
        selKabkota.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
      });
    };

    selKabkota.onchange = function () {
      btnArea.innerHTML = '';
      if (!selKabkota.value) {
        fieldSekolah.style.display = 'none';
        fieldSekolahManual.style.display = 'none';
        return;
      }
      fieldSekolah.style.display = '';
      selSekolah.innerHTML = '<option value="">Memuat...</option>';
      cachedSekolah(selProvinsi.value, selKabkota.value).then(function (list) {
        let opts = '<option value="">-- Pilih sekolah --</option>';
        opts += list.map(function (s, i) {
          return '<option value="idx:' + i + '">' + escapeHtml(s.nama) + ' (NPSN ' + escapeHtml(s.npsn) + ')</option>';
        }).join('');
        opts += '<option value="manual">Sekolah lain (isi manual)</option>';
        selSekolah.innerHTML = opts;
        selSekolah.dataset.list = JSON.stringify(list);
      }).catch(function (e) {
        console.error('loadSekolah gagal:', e);
        selSekolah.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
      });
    };

    selSekolah.onchange = function () {
      if (selSekolah.value === 'manual') {
        fieldSekolahManual.style.display = '';
      } else {
        fieldSekolahManual.style.display = 'none';
      }
      renderTombolLanjut();
    };

    function renderTombolLanjut() {
      if (!selSekolah.value) { btnArea.innerHTML = ''; return; }
      btnArea.innerHTML = '<div class="btn-row"><button class="btn btn-primary" id="btn-mulai" type="button">Lanjut Isi Form</button></div>';
      wrap.querySelector('#btn-mulai').onclick = function () {
        let sekolahNama, sekolahNpsn;
        if (selSekolah.value === 'manual') {
          sekolahNama = wrap.querySelector('#inp-nama-sekolah-manual').value.trim();
          sekolahNpsn = wrap.querySelector('#inp-npsn-manual').value.trim();
          if (!sekolahNama) { alert('Nama sekolah manual wajib diisi.'); return; }
        } else {
          const list = JSON.parse(selSekolah.dataset.list || '[]');
          const idx = parseInt(selSekolah.value.replace('idx:', ''), 10);
          sekolahNama = list[idx].nama;
          sekolahNpsn = list[idx].npsn;
        }
        App.session = {
          jenis: 'observasi',
          instrumen: instrumenTerpilih,
          lokus: {
            provinsi: selProvinsi.value,
            kabKota: selKabkota.value,
            sekolah: { nama: sekolahNama, npsn: sekolahNpsn }
          },
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
    }
  }

  function renderFgdAwal() {
    areaFgd.innerHTML =
      '<div class="field">' +
        '<label>Provinsi</label>' +
        '<select id="sel-provinsi-fgd"><option value="">Memuat...</option></select>' +
      '</div>' +
      '<div class="field" id="field-opd" style="display:none;">' +
        '<label>Kategori OPD</label>' +
        '<select id="sel-opd"><option value="">-- Pilih provinsi dulu --</option></select>' +
      '</div>' +
      '<div class="field" id="field-opd-manual" style="display:none;">' +
        '<label>Nama OPD (manual)</label>' +
        '<input type="text" id="inp-nama-opd-manual">' +
        '<label style="margin-top:12px;">Alamat OPD (manual)</label>' +
        '<input type="text" id="inp-alamat-opd-manual">' +
      '</div>' +
      '<div class="field" id="field-pengisi" style="display:none;">' +
        '<label>Nama Peserta yang Mengisi</label>' +
        '<input type="text" id="inp-nama-pengisi">' +
        '<label style="margin-top:12px;">Jabatan Peserta</label>' +
        '<input type="text" id="inp-jabatan-pengisi">' +
      '</div>';

    const selProvinsi = areaFgd.querySelector('#sel-provinsi-fgd');
    const fieldOpd = areaFgd.querySelector('#field-opd');
    const selOpd = areaFgd.querySelector('#sel-opd');
    const fieldOpdManual = areaFgd.querySelector('#field-opd-manual');
    const fieldPengisi = areaFgd.querySelector('#field-pengisi');

    cachedProvinsi().then(function (list) {
      selProvinsi.innerHTML = '<option value="">-- Pilih provinsi --</option>' +
        list.map(function (p) { return '<option value="' + escapeAttr(p) + '">' + escapeHtml(p) + '</option>'; }).join('');
    }).catch(function (e) {
      console.error('loadProvinsi (fgd) gagal:', e);
      selProvinsi.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
    });

    selProvinsi.onchange = function () {
      fieldOpdManual.style.display = 'none';
      fieldPengisi.style.display = 'none';
      btnArea.innerHTML = '';
      if (!selProvinsi.value) {
        fieldOpd.style.display = 'none';
        return;
      }
      fieldOpd.style.display = '';
      selOpd.innerHTML = '<option value="">Memuat...</option>';
      cachedOPD(selProvinsi.value).then(function (list) {
        let opts = '<option value="">-- Pilih kategori OPD --</option>';
        opts += list.map(function (o, i) {
          return '<option value="idx:' + i + '">' + escapeHtml(o.nama) + '</option>';
        }).join('');
        opts += '<option value="manual">OPD lain (isi manual)</option>';
        selOpd.innerHTML = opts;
        selOpd.dataset.list = JSON.stringify(list);
      }).catch(function (e) {
        console.error('loadOpd gagal:', e);
        selOpd.innerHTML = '<option value="">Gagal memuat: ' + escapeHtml(e.message || e) + '</option>';
      });
    };

    selOpd.onchange = function () {
      if (selOpd.value === 'manual') {
        fieldOpdManual.style.display = '';
      } else {
        fieldOpdManual.style.display = 'none';
      }
      fieldPengisi.style.display = selOpd.value ? '' : 'none';
      renderTombolLanjutFgd();
    };

    const inpNamaPengisi = () => areaFgd.querySelector('#inp-nama-pengisi');
    const inpJabatanPengisi = () => areaFgd.querySelector('#inp-jabatan-pengisi');

    fieldPengisi.addEventListener('input', renderTombolLanjutFgd);

    function renderTombolLanjutFgd() {
      if (!selOpd.value) { btnArea.innerHTML = ''; return; }
      btnArea.innerHTML = '<div class="btn-row"><button class="btn btn-primary" id="btn-mulai-fgd" type="button">Lanjut ke Daftar Kegiatan</button></div>';
      wrap.querySelector('#btn-mulai-fgd').onclick = function () {
        let opdNama, opdAlamat;
        if (selOpd.value === 'manual') {
          opdNama = wrap.querySelector('#inp-nama-opd-manual').value.trim();
          opdAlamat = wrap.querySelector('#inp-alamat-opd-manual').value.trim();
          if (!opdNama) { alert('Nama OPD manual wajib diisi.'); return; }
        } else {
          const list = JSON.parse(selOpd.dataset.list || '[]');
          const idx = parseInt(selOpd.value.replace('idx:', ''), 10);
          opdNama = list[idx].nama;
          opdAlamat = list[idx].alamat;
        }
        const namaPengisi = inpNamaPengisi().value.trim();
        const jabatanPengisi = inpJabatanPengisi().value.trim();
        App.session = {
          jenis: 'fgd',
          lokus: { provinsi: selProvinsi.value, namaOPD: opdNama, alamatOPD: opdAlamat },
          pengisi: { nama: namaPengisi, jabatan: jabatanPengisi },
          kegiatan: [],
          hasil: null
        };
        saveDraft(App.session);
        goTo('#/daftar-kegiatan');
      };
    }
  }
};
