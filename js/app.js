window.App = window.App || {};
App.session = null;
App.activeKegiatanIndex = null;
App.lastKonfirmasi = null;

function initApp() {
  const existing = loadDraft();
  if (existing) App.session = existing;
  window.addEventListener('hashchange', renderRoute);
  prefetchAwal();
  if (existing && !location.hash) {
    // Draf belum selesai ditemukan, langsung balik ke layar terakhir alih-alih Pilih Lokus.
    location.hash = existing.jenis === 'fgd' ? '#/daftar-kegiatan' : '#/form';
  } else {
    renderRoute();
  }
}

function renderRoute() {
  const hash = location.hash || '#/pilih-lokus';
  const root = document.getElementById('app-content');
  root.innerHTML = '';

  if (hash.startsWith('#/cari-edit')) {
    Views.renderCariEdit(root);
  } else if (hash.startsWith('#/konfirmasi') && App.lastKonfirmasi) {
    Views.renderKonfirmasi(root);
  } else if (App.session && App.session.jenis === 'fgd' && hash.startsWith('#/daftar-kegiatan')) {
    Views.renderDaftarKegiatan(root);
  } else if (App.session && hash.startsWith('#/form')) {
    Views.renderForm(root);
  } else {
    Views.renderPilihLokus(root);
  }
}

function goTo(hash) {
  location.hash = hash;
}

document.addEventListener('DOMContentLoaded', initApp);
