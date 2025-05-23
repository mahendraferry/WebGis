// Inisialisasi peta
const map = L.map('map').setView([-7.4506, 111.4417], 13);

// Buat pane khusus untuk Valve agar selalu di atas pipa
map.createPane('valvePane');
map.getPane('valvePane').style.zIndex = 650; // lebih tinggi dari overlay default

// Basemap OSM dan Google Satellite
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains:['mt0','mt1','mt2','mt3'],
  attribution: '&copy; Google Satellite'
});

// Control Layer
const baseMaps = {
  "OpenStreetMap": osm,
  "Google Satellite": googleSat
};

const overlayMaps = {};

const layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

// Fungsi popup tabel rapi
function buatPopup(props, fields) {
  let popup = '<table>';
  fields.forEach(field => {
    if (props.hasOwnProperty(field)) {
      let label = field.replace(/_/g, ' ');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      let nilai = props[field] ?? '-';
      popup += `<tr><td><b>${label}</b></td><td>: ${nilai}</td></tr>`;
    }
  });
  popup += '</table>';
  return popup;
}

// Variabel simpan data asli
let dataPipaOriginal = null;
let dataValveOriginal = null;
let dataPelangganOriginal = null;

// Layer group
const layerPipa = L.layerGroup().addTo(map);
const layerValve = L.layerGroup().addTo(map);
let layerPelanggan = null;

// Icon valve merah
const iconValve = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25]
});

// Fungsi update control layer overlay supaya muncul filter layer
function updateOverlayControl() {
  layerControl.remove();
  overlayMaps["Jaringan Pipa"] = layerPipa;
  overlayMaps["Valve"] = layerValve;
  if (layerPelanggan) {
    overlayMaps["Pelanggan"] = layerPelanggan;
  }
  L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);
}

// --- Load dan proses data Jaringan Pipa ---
fetch('data/Jaringan_Pipa_Ngawi.geojson')
  .then(res => res.json())
  .then(data => {
    dataPipaOriginal = data;

    // Isi dropdown filter diameter pipa
    const diameterSet = new Set(data.features.map(f => f.properties.Diameter).filter(Boolean));
    const selectDiameter = document.getElementById('filterDiameterPipa');
    diameterSet.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      selectDiameter.appendChild(opt);
    });

    tampilkanLayerPipa();
    updateOverlayControl();
  })
  .catch(err => console.error("Gagal load jaringan pipa:", err));

// --- Load dan proses data Valve ---
fetch('data/Valve.geojson')
  .then(res => res.json())
  .then(data => {
    dataValveOriginal = data;

    const kondisiSet = new Set(data.features.map(f => f.properties.Kondisi).filter(Boolean));
    const selectKondisiValve = document.getElementById('filterKondisiValve');
    kondisiSet.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      selectKondisiValve.appendChild(opt);
    });

    tampilkanLayerValve();
    updateOverlayControl();
  })
  .catch(err => console.error("Gagal load valve:", err));

// --- Load dan proses data Pelanggan ---
fetch('data/Pelanggan_Ngawi.geojson')
  .then(res => res.json())
  .then(data => {
    dataPelangganOriginal = data;

    const statusSet = new Set(data.features.map(f => f.properties.Status).filter(Boolean));
    const selectStatusPelanggan = document.getElementById('filterStatusPelanggan');
    statusSet.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      selectStatusPelanggan.appendChild(opt);
    });

    tampilkanLayerPelanggan();
    updateOverlayControl();
  })
  .catch(err => console.error("Gagal load pelanggan:", err));

// Fungsi tampilkan layer pipa dengan filter
function tampilkanLayerPipa() {
  layerPipa.clearLayers();
  if (!dataPipaOriginal) return;

  const filterDiameter = document.getElementById('filterDiameterPipa').value;

  L.geoJSON(dataPipaOriginal, {
    filter: feature => {
      if (filterDiameter && feature.properties.Diameter !== filterDiameter) {
        return false;
      }
      return true;
    },
    style: { color: '#007bff', weight: 3 },
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const popup = buatPopup(props, ['No id Aset', 'Diameter', 'Panjang', 'Jenis Pipa', 'Kondisi', 'Th Pasang']);
      layer.bindPopup("<b>Jaringan Pipa</b><br>" + popup);
    }
  }).addTo(layerPipa);
}

// Fungsi tampilkan layer valve dengan filter
function tampilkanLayerValve() {
  layerValve.clearLayers();
  if (!dataValveOriginal) return;

  const filterKondisi = document.getElementById('filterKondisiValve').value;

  L.geoJSON(dataValveOriginal, {
    filter: feature => {
      if (filterKondisi && feature.properties.Kondisi !== filterKondisi) {
        return false;
      }
      return true;
    },
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: iconValve, pane: 'valvePane' }),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const popup = buatPopup(props, ['Nama', 'Diameter', 'Jenis Valv', 'Kondisi', 'Unit', 'Pendanaan', 'Alamat', 'Th Pasang', 'Tgl input']);
      layer.bindPopup("<b>Valve</b><br>" + popup);
    }
  }).addTo(layerValve);
}

// Fungsi tampilkan layer pelanggan dengan filter
function tampilkanLayerPelanggan() {
  if (layerPelanggan) {
    map.removeLayer(layerPelanggan);
  }
  if (!dataPelangganOriginal) return;

  const filterStatus = document.getElementById('filterStatusPelanggan').value;

  layerPelanggan = L.geoJSON(dataPelangganOriginal, {
    filter: feature => {
      if (filterStatus && feature.properties.Status !== filterStatus) {
        return false;
      }
      return true;
    },
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 5,
      fillColor: "#28a745",
      color: "#006400",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const popup = buatPopup(props, ['Nama', 'No Sambung', 'Alamat', 'Golongan', 'Status']);
      layer.bindPopup("<b>Pelanggan</b><br>" + popup);
    }
  }).addTo(map);
}

// Event listener untuk filter
document.getElementById('filterDiameterPipa').addEventListener('change', () => {
  tampilkanLayerPipa();
  updateOverlayControl();
});
document.getElementById('filterKondisiValve').addEventListener('change', () => {
  tampilkanLayerValve();
  updateOverlayControl();
});
document.getElementById('filterStatusPelanggan').addEventListener('change', () => {
  tampilkanLayerPelanggan();
  updateOverlayControl();
});

// Fungsi pencarian pelanggan berdasarkan Nama atau No Sambung
function cariPelanggan() {
  const searchText = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!searchText) {
    alert('Masukkan Nama atau No Sambung untuk mencari.');
    return;
  }
  if (!dataPelangganOriginal) {
    alert('Data pelanggan belum siap.');
    return;
  }

  const hasil = dataPelangganOriginal.features.filter(f => {
    const props = f.properties;
    return (
      (props.Nama && props.Nama.toLowerCase().includes(searchText)) ||
      (props['No Sambung'] && props['No Sambung'].toLowerCase().includes(searchText))
    );
  });

  if (hasil.length === 0) {
    alert('Pelanggan tidak ditemukan.');
    return;
  }

  const f = hasil[0];
  const coords = f.geometry.coordinates;
  let latlng;
  if (f.geometry.type === "Point") {
    latlng = L.latLng(coords[1], coords[0]);
  } else {
    latlng = L.latLngBounds(coords).getCenter();
  }
  map.setView(latlng, 18);

  if (layerPelanggan) {
    layerPelanggan.eachLayer(layer => {
      if (layer.feature === f) {
        layer.openPopup();
      }
    });
  }
}

// Event listener pencarian
document.getElementById('searchBtn').addEventListener('click', cariPelanggan);
document.getElementById('searchInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    cariPelanggan();
  }
});


async function loadGeoJSON(url) {
  const response = await fetch(url);
  return await response.json();
}

async function tampilkanStatistik() {
  const pelanggan = await loadGeoJSON('data/Pelanggan_Ngawi.geojson');
  const pipa = await loadGeoJSON('data/Jaringan_Pipa_Ngawi.geojson');
  const valve = await loadGeoJSON('data/Valve.geojson');
  const sumur = await loadGeoJSON('data/Sumur_Pompa.geojson');
  const reservoir = await loadGeoJSON('data/Reservoir.geojson');

  const dataChart = {
    labels: ['Pelanggan', 'Pipa', 'Valve', 'Sumur Pompa', 'Reservoir'],
    datasets: [{
      label: 'Jumlah Fitur',
      data: [
        pelanggan.features.length,
        pipa.features.length,
        valve.features.length,
        sumur.features.length,
        reservoir.features.length
      ],
      backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336']
    }]
  };

  const ctx = document.getElementById('statistikChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: dataChart,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Jumlah Fitur'
          }
        }
      }
    }
  });
}


document.getElementById('statistik-tab')?.addEventListener('click', tampilkanStatistik);