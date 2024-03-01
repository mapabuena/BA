mapboxgl.accessToken = 'pk.eyJ1IjoibjMxbGQiLCJhIjoiY2x0NHc5NjVpMDdzaDJscGE5Y2gyYnQ5MyJ9.zfzXUlLbNlVbr9pt4naycw'; // Replace with your actual access token
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/n31ld/clt4onrza001401pcc1j9he1u',
    center: [-58.42, -34.58],
    zoom: 13
});

let markers = [];
let activeFilters = {
    category: [],
    category2: []
};

// Example GeoJSON layer URLs
let geojsonLayers = {
    'layer1': 'https://raw.githubusercontent.com/mapabuena/BA/main/Safest%20and%20most%20walkable.geojson',
    'layer2': 'https://raw.githubusercontent.com/mapabuena/BA/main/Safe%20but%20less%20walkable.geojson',
    'layer3': https://raw.githubusercontent.com/mapabuena/BA/main/Feels%20sketchy%20at%20night.geojson',
    // Add more layers as needed
    };

map.on('load', function() {
    // Load and add GeoJSON layers to the map initially as invisible
    for (let id in geojsonLayers) {
        map.addSource(id, { type: 'geojson', data: geojsonLayers[id] });
        map.addLayer({
            'id': id,
            'type': 'fill', // Change 'fill' to 'line' or 'symbol' as per your GeoJSON data
            'source': id,
            'layout': {},
            'paint': {
                'fill-color': '#888', // Example fill color, change as needed
                'fill-opacity': 0.4 // Example fill opacity, change as needed
            }
        });
        map.setLayoutProperty(id, 'visibility', 'none'); // Start with the layer hidden
    }

    // Add other initializations such as fetching marker data
    fetchMarkersData();
    updateFilters();
});

// Function to toggle GeoJSON layer visibility
function toggleLayer(id) {
    let visibility = map.getLayoutProperty(id, 'visibility');
    if (visibility === 'visible') {
        map.setLayoutProperty(id, 'visibility', 'none');
    } else {
        map.setLayoutProperty(id, 'visibility', 'visible');
    }
}

function fetchMarkersData() {
    fetch('https://raw.githubusercontent.com/mapabuena/BA/main/BsAsPinsGroups.csv')
        .then(response => response.text())
        .then(processCSVData)
        .catch(error => console.error('Error fetching or parsing CSV data:', error));
}

function processCSVData(csvData) {
    const rows = csvData.split('\n').slice(1); // Skip header row
    rows.forEach(row => {
        if (!row) return; // Skip empty rows
        const columns = row.split(',');

        const data = {
            name: columns[0],
            lat: parseFloat(columns[1]),
            lng: parseFloat(columns[2]),
            popup_header: columns[3],
            popupimage_url: columns[4],
            description: columns[5],
            icon_url: columns[6],
            category: columns[7] ? columns[7].split('|') : [],
            category2: columns[8] ? columns[8].split('|') : [],
            category3: columns[9] ? columns[9].split('|') : []
        };

        createMarker(data);
    });
}

function createMarker(data) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${data.icon_url})`;
    el.style.width = '20px';
    el.style.height = '31px';
    el.style.backgroundSize = '100%';

    // Define the popup HTML with the "popup-content" class wrapping your content
    const popupHTML = `
<div class="popup-content">
    <div style="font-size:20px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:8px;">
        ${data.popup_header}
        <a href="#" class="copy-address-link" style="font-size:14px; font-family:'Gill Sans MT', Arial; margin-left:16px;">COPY ADDRESS</a>
    </div>
    <img src="${data.popupimage_url}" alt="Popup Image" style="max-width:100%; height:auto; margin-bottom:8px;">
    <div style="font-size:16px; color:black; font-family:'Gill Sans MT', Arial;">${data.description}</div>
</div>
`;

    // Create a popup and set its HTML content
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML);

    // Attach an event listener to the popup after it opens
    popup.on('open', () => {
        // Use a more specific selector if multiple popups can be open to target the correct link
        const copyLink = document.querySelector('.mapboxgl-popup .copy-address-link');
        if (copyLink) {
            copyLink.onclick = (event) => {
                event.preventDefault(); // Prevent the default link behavior
                navigator.clipboard.writeText(data.name).then(() => {
                    alert('Address copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy text:', err);
                });
            };
        }
    });

    // Create and add the marker to the map
    const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
        .setLngLat([data.lng, data.lat])
        .setPopup(popup)
        .addTo(map);

    // Store the marker for later use
    markers.push({
        marker: marker,
        data: data
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text:', err);
    });
}

function updateFilters() {
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const value = this.getAttribute('data-value');
            this.classList.toggle('active');

            if (this.classList.contains('active')) {
                if (!activeFilters[category].includes(value)) {
                    activeFilters[category].push(value);
                }
            } else {
                activeFilters[category] = activeFilters[category].filter(item => item !== value);
            }

            applyFilters();
        });
    });
}

function applyFilters() {
    markers.forEach(({marker, data}) => {
        const matchesCategory = activeFilters.category.length === 0 || activeFilters.category.some(cat => data.category.includes(cat));
        const matchesCategory2 = activeFilters.category2.length === 0 || activeFilters.category2.some(cat2 => data.category2.includes(cat2));

        if (matchesCategory && matchesCategory2) {
            marker.getElement().style.display = '';
        } else {
            marker.getElement().style.display = 'none';
        }
    });
}
