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


map.on('load', function() {
    fetchMarkersData();
    updateFilters();
});

var Tier1aIds = ['palermosoho-palermohollywood']; // Example layer IDs
var Tier1bIds = ['barrionorte-lascanitas-palermoviejo']; // Example layer IDs
var Tier2Ids = ['recoleta']; // Example layer IDs
var Tier3Ids = ['santelmo']; // Example layer IDs
var Tier4Ids = ['laboca']; // Example layer IDs

// Adjust event listeners to pass the button ID
document.getElementById('myToggleButton1a').addEventListener('click', function() {
    toggleLayers(Tier1aIds, 'myToggleButton1a');
});
document.getElementById('myToggleButton1b').addEventListener('click', function() {
    toggleLayers(Tier1bIds, 'myToggleButton1b');
});
document.getElementById('myToggleButton2').addEventListener('click', function() {
    toggleLayers(Tier2Ids, 'myToggleButton2');
});
document.getElementById('myToggleButton3').addEventListener('click', function() {
    toggleLayers(Tier3Ids, 'myToggleButton3');
});
document.getElementById('myToggleButton4').addEventListener('click', function() {
    toggleLayers(Tier4Ids, 'myToggleButton4');
});

// Simplified toggle function that also corrects button appearance
function toggleLayers(layerIds, buttonId) {
    const button = document.getElementById(buttonId);
    // Assume all layers are initially visible (Mapbox styles usually default layers to visible)
    let anyLayerWasVisible = false;

    layerIds.forEach(layerId => {
        let visibility = map.getLayoutProperty(layerId, 'visibility');
        // If any layer is currently visible, we'll turn all off, and vice versa.
        if (visibility !== 'none') {
            anyLayerWasVisible = true;
        }
    });

    layerIds.forEach(layerId => {
        map.setLayoutProperty(layerId, 'visibility', anyLayerWasVisible ? 'none' : 'visible');
    });

    // Update the button state based on the action taken
    if (anyLayerWasVisible) {
        button.classList.remove('active');
        button.style.backgroundColor = "#FFF";
        button.style.color = "#000";
    } else {
        button.classList.add('active');
        button.style.backgroundColor = "#000";
        button.style.color = "#FFF";
    }
}
function toggleInfoWindow() {
  const infoWindow = document.getElementById('info-window');
  if (infoWindow.style.right === '0px' || infoWindow.style.right === '') {
    infoWindow.style.right = '-33%'; // Hide
  } else {
    infoWindow.style.right = '0px'; // Show
    updateInfoWindowContent();
  }
}

function updateInfoWindowContent() {
  const infoContent = document.getElementById('info-content');
  infoContent.innerHTML = ''; // Clear current content

  markers.forEach(({ marker, data }) => {
    if (marker.getElement().style.display !== 'none') { // Check if marker is visible
      const markerContent = `
        <div class="marker-info">
          <h4>${data.popup_header}</h4>
          <img src="${data.popupimage_url}" alt="${data.popup_header}" style="max-width:100%; height:auto;">
          <p>${data.description}</p>
        </div>
      `;
      infoContent.innerHTML += markerContent;
    }
  });
}

// Example usage
document.getElementById('toggle-info-window').addEventListener('click', function() {
  toggleInfoWindow();
});
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

            // Ensure the category array is initialized before attempting to use it
            if (!activeFilters[category]) {
                activeFilters[category] = [];
            }

            this.classList.toggle('active');

            if (this.classList.contains('active')) {
                // Now safely add the value to the category's filter array
                if (!activeFilters[category].includes(value)) {
                    activeFilters[category].push(value);
                }
            } else {
                // Safely remove the value from the category's filter array
                activeFilters[category] = activeFilters[category].filter(item => item !== value);
            }

            // Function to reapply filters based on updated activeFilters
            applyFilters();
        });
    });
}

function applyFilters() {
    markers.forEach(({marker, data}) => {
        // Ensure categories exist in activeFilters before proceeding
        const matchesCategory = !activeFilters.category || activeFilters.category.length === 0 || activeFilters.category.some(cat => data.category && data.category.includes(cat));
        const matchesCategory2 = !activeFilters.category2 || activeFilters.category2.length === 0 || activeFilters.category2.some(cat2 => data.category2 && data.category2.includes(cat2));

        marker.getElement().style.display = (matchesCategory && matchesCategory2) ? '' : 'none';
    });
    updateInfoWindowContent(); // Refresh the info window content after applying filters
}

