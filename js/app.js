window.App = window.App || {};
App.session = null;
App.activeInstrumen = null;
App.activeKegiatanIndex = null;
App.lastKonfirmasi = null;

function initApp() {
  const existing = loadDraft();
  if (existing) App.session = existing;
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

function renderRoute() {
  const hash = location.hash || '#/pilih-lokus';
  const root = document.getElementById('app-content');
  root.innerHTML = '';

  if (hash.startsWith('#/konfirmasi') && App.lastKonfirmasi) {
    Views.renderKonfirmasi(root);
  } else if (App.session && App.session.jenis === 'observasi' && hash.startsWith('#/checklist-instrumen')) {
    Views.renderChecklistInstrumen(root);
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
