window.Views = window.Views || {};

Views.renderForm = function (root) {
  const s = App.session;
  if (s.jenis === 'fgd') {
    renderFormRTL(root, s);
  } else {
    renderFormObservasi(root, s);
  }
};

function renderFormObservasi(root, s) {
  const wrap = document.createElement('div');
  wrap.className = 'screen accent-observasi';

  const info = INSTRUMEN_INFO[s.instrumen];

  wrap.innerHTML =
    '<div class="eyebrow">Langkah 2 &middot; Instrumen ' + escapeHtml(s.instrumen) + '</div>' +
    '<h2 class="section-title">' + escapeHtml(s.lokus.sekolah.nama) + '</h2>' +
    '<div class="hint" style="margin-bottom:16px;">' + escapeHtml(s.lokus.kabKota) + ' &middot; ' + escapeHtml(s.lokus.provinsi) + ' &middot; NPSN ' + escapeHtml(s.lokus.sekolah.npsn || '-') + '</div>' +
    '<div class="instrumen-info">' +
      info.deskripsi.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('') +
    '</div>' +
    '<div class="progress-wrap">' +
      '<div class="progress-track"><div class="progress-fill" id="progress-fill" style="width:0%;"></div></div>' +
      '<div class="progress-label" id="progress-label">0 dari 0 pertanyaan terjawab</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="section-title" style="font-size:15px;">Narasumber</div>' +
      '<div id="rows-narasumber"></div>' +
      '<button class="btn btn-ghost" id="btn-tambah-narasumber" type="button">+ Tambah Narasumber</button>' +
    '</div>' +
    '<div class="card">' +
      '<div class="field"><label>Jumlah Siswa (opsional)</label><input type="number" id="inp-jumlah-siswa"></div>' +
      '<div class="section-title" style="font-size:15px;">Petugas Pewawancara</div>' +
      '<div id="rows-petugas"></div>' +
      '<button class="btn btn-ghost" id="btn-tambah-petugas" type="button">+ Tambah Petugas</button>' +
    '</div>' +
    '<div class="card" id="card-pertanyaan">' +
      '<div class="loading-wrap"><div class="spinner"></div> Memuat pertanyaan...</div>' +
    '</div>' +
    '<div id="status-kirim"></div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-outline" id="btn-batal" type="button">Batal / Mulai Ulang</button>' +
      '<button class="btn btn-primary" id="btn-submit" type="button">' + (s.editMode ? 'Simpan Perubahan' : 'Submit Isian') + '</button>' +
    '</div>';

  root.appendChild(wrap);

  wrap.querySelector('#inp-jumlah-siswa').value = s.identity.jumlahSiswa || '';
  wrap.querySelector('#inp-jumlah-siswa').oninput = function (e) {
    s.identity.jumlahSiswa = e.target.value;
    saveDraft(s);
  };

  function renderPersonRows(containerSel, arr, fields, roleOptions) {
    const container = wrap.querySelector(containerSel);
    container.innerHTML = arr.map(function (item, i) {
      return (
        '<div class="person-row" data-idx="' + i + '">' +
          fields.map(function (f) {
            const datalistAttr = f.datalist ? ' list="dl-' + containerSel.replace('#rows-', '') + '-' + f.key + '"' : '';
            return (
              '<div class="field">' +
                '<label>' + escapeHtml(f.label) + '</label>' +
                '<input type="text" data-field="' + f.key + '" value="' + escapeAttr(item[f.key] || '') + '"' + datalistAttr + '>' +
              '</div>'
            );
          }).join('') +
          (arr.length > 1 ? '<button class="btn-hapus-row" type="button" data-remove="' + i + '">Hapus</button>' : '') +
        '</div>'
      );
    }).join('') + (roleOptions ? fields.filter(function (f) { return f.datalist; }).map(function (f) {
      return '<datalist id="dl-' + containerSel.replace('#rows-', '') + '-' + f.key + '">' +
        roleOptions.map(function (r) { return '<option value="' + escapeAttr(r) + '">'; }).join('') +
        '</datalist>';
    }).join('') : '');

    container.querySelectorAll('input[data-field]').forEach(function (inp) {
      inp.oninput = function () {
        const idx = parseInt(inp.closest('.person-row').dataset.idx, 10);
        arr[idx][inp.dataset.field] = inp.value;
        saveDraft(s);
      };
    });
    container.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.onclick = function () {
        arr.splice(parseInt(btn.dataset.remove, 10), 1);
        saveDraft(s);
        renderPersonRows(containerSel, arr, fields, roleOptions);
      };
    });
  }

  renderPersonRows('#rows-narasumber', s.identity.narasumber, [
    { key: 'nama', label: 'Nama' },
    { key: 'jabatan', label: 'Jabatan', datalist: true }
  ], info.roleOptions);

  renderPersonRows('#rows-petugas', s.identity.petugas, [
    { key: 'nama', label: 'Nama' },
    { key: 'instansi', label: 'Instansi' }
  ], null);

  wrap.querySelector('#btn-tambah-narasumber').onclick = function () {
    s.identity.narasumber.push({ nama: '', jabatan: '' });
    saveDraft(s);
    renderPersonRows('#rows-narasumber', s.identity.narasumber, [
      { key: 'nama', label: 'Nama' },
      { key: 'jabatan', label: 'Jabatan', datalist: true }
    ], info.roleOptions);
  };

  wrap.querySelector('#btn-tambah-petugas').onclick = function () {
    s.identity.petugas.push({ nama: '', instansi: '' });
    saveDraft(s);
    renderPersonRows('#rows-petugas', s.identity.petugas, [
      { key: 'nama', label: 'Nama' },
      { key: 'instansi', label: 'Instansi' }
    ], null);
  };

  wrap.querySelector('#btn-batal').onclick = function () {
    if (!confirm('Batalkan pengisian dan hapus draf ini?')) return;
    clearDraft();
    App.session = null;
    goTo('#/pilih-lokus');
  };

  const cardPertanyaan = wrap.querySelector('#card-pertanyaan');
  let pertanyaanList = [];

  function updateProgress() {
    const pct = hitungPersen(s.jawaban, pertanyaanList);
    wrap.querySelector('#progress-fill').style.width = pct + '%';
    wrap.querySelector('#progress-label').textContent =
      countAnswered(s.jawaban, pertanyaanList) + ' dari ' + pertanyaanList.length + ' pertanyaan terjawab (' + pct + '%)';
  }

  cachedPertanyaan(s.instrumen).then(function (list) {
    pertanyaanList = list;
    cardPertanyaan.innerHTML =
      '<div class="section-title" style="font-size:15px;">Pertanyaan</div>' +
      list.map(function (q, i) { return renderQuestionField(q, i, s.jawaban[q.idButir]); }).join('');
    cardPertanyaan.querySelectorAll('[data-id-butir]').forEach(function (inp) {
      inp.oninput = function () {
        s.jawaban[inp.dataset.idButir] = inp.value;
        saveDraft(s);
        updateProgress();
      };
    });
    updateProgress();
  }).catch(function (e) {
    console.error('loadPertanyaan gagal:', e);
    cardPertanyaan.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal memuat pertanyaan: ' + escapeHtml(e.message || e) + '</div>';
  });

  wrap.querySelector('#btn-submit').onclick = function () {
    const statusEl = wrap.querySelector('#status-kirim');
    const btn = wrap.querySelector('#btn-submit');

    const narasumberNama = s.identity.narasumber.map(function (n) { return n.nama; }).filter(Boolean).join('; ');
    const narasumberJabatan = s.identity.narasumber.map(function (n) { return n.jabatan; }).filter(Boolean).join('; ');
    const petugasNama = s.identity.petugas.map(function (p) { return p.nama; }).filter(Boolean).join('; ');
    const petugasInstansi = s.identity.petugas.map(function (p) { return p.instansi; }).filter(Boolean).join('; ');

    if (!narasumberNama) { alert('Isi minimal satu nama narasumber.'); return; }
    if (!petugasNama) { alert('Isi minimal satu nama petugas.'); return; }

    const identity = {
      'Provinsi': s.lokus.provinsi,
      'Kab/Kota': s.lokus.kabKota,
      'Nama Sekolah': s.lokus.sekolah.nama,
      'NPSN': s.lokus.sekolah.npsn,
      'Jumlah Siswa': s.identity.jumlahSiswa ? Number(s.identity.jumlahSiswa) : '',
      'Nama Responden': narasumberNama,
      'Jabatan Responden': narasumberJabatan,
      'Nama Petugas Pewawancara': petugasNama,
      'Instansi Petugas': petugasInstansi
    };

    btn.disabled = true;
    statusEl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div> Mengirim...</div>';

    let call;
    if (s.editMode) {
      call = s.instrumen === 'B1' ? apiUpdateB1(s.idIsian, identity, s.jawaban) : apiUpdateB2(s.idIsian, identity, s.jawaban);
    } else {
      call = s.instrumen === 'B1' ? apiSubmitB1(identity, s.jawaban) : apiSubmitB2(identity, s.jawaban);
    }

    call.then(function (data) {
      App.lastKonfirmasi = { jenis: 'observasi', mode: s.editMode ? 'edit' : 'baru', data: data };
      clearDraft();
      App.session = null;
      goTo('#/konfirmasi');
    }).catch(function (e) {
      console.error('submit observasi gagal:', e);
      statusEl.innerHTML = '<div class="hint" style="color:var(--color-jingga);">Gagal mengirim: ' + escapeHtml(e.message || e) + '</div>';
      btn.disabled = false;
    });
  };
}

function renderFormRTL(root, s) {
  const wrap = document.createElement('div');
  wrap.className = 'screen accent-fgd';

  const idx = App.activeKegiatanIndex;
  const kegiatan = s.kegiatan[idx];

  const RTL_FIELDS = [
    { id: 'RTL-02', label: 'Uraian Kegiatan', tipe: 'textarea' },
    { id: 'RTL-03', label: 'Tujuan', tipe: 'textarea' },
    { id: 'RTL-04', label: 'Sasaran', tipe: 'text' },
    { id: 'RTL-05', label: 'Waktu Pelaksanaan', tipe: 'text' },
    { id: 'RTL-06', label: 'Penanggung Jawab (PIC)', tipe: 'text' },
    { id: 'RTL-07', label: 'Mitra Kerja', tipe: 'text' },
    { id: 'RTL-08', label: 'Output', tipe: 'textarea' }
  ];

  wrap.innerHTML =
    '<div class="eyebrow">Isi Kegiatan #' + (idx + 1) + '</div>' +
    '<h2 class="section-title">' + escapeHtml(s.lokus.namaOPD) + '</h2>' +
    '<div class="card" id="card-rtl-fields">' +
      RTL_FIELDS.map(function (f) {
        const val = kegiatan.jawaban[f.id] || '';
        const inputHtml = f.tipe === 'textarea'
          ? '<textarea data-rtl-id="' + f.id + '">' + escapeHtml(val) + '</textarea>'
          : '<input type="text" data-rtl-id="' + f.id + '" value="' + escapeAttr(val) + '">';
        return '<div class="field"><label>' + escapeHtml(f.label) + '</label>' + inputHtml + '</div>';
      }).join('') +
    '</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-outline" id="btn-kembali" type="button">Kembali ke Daftar Kegiatan</button>' +
    '</div>';

  root.appendChild(wrap);

  wrap.querySelectorAll('[data-rtl-id]').forEach(function (inp) {
    inp.oninput = function () {
      kegiatan.jawaban[inp.dataset.rtlId] = inp.value;
      saveDraft(s);
    };
  });

  wrap.querySelector('#btn-kembali').onclick = function () {
    goTo('#/daftar-kegiatan');
  };
}
