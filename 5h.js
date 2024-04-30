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

// Function to toggle group visibility based on checkboxes
function toggleGroup(group) {
    const index = activeFilters.category.indexOf(group);
    if (index > -1) {
        activeFilters.category.splice(index, 1);  // Remove filter if it exists
    } else {
        activeFilters.category.push(group);  // Add filter if it does not exist
    }
    applyFilters();  // Apply all filters again
}

// Utility functions for date handling
function formatDateForFilter(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [day, month, year.toString().slice(-2)].join('');
}

function generateDateRange(startDate, endDate) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    var loop = new Date(start);
    var dateList = [];

    while (loop <= end) {
        dateList.push(formatDateForFilter(loop));
        var newDate = loop.setDate(loop.getDate() + 1);
        loop = new Date(newDate);
    }

    return dateList;
}

// Function to apply date filter based on selected range
function applyDateFilter() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
    }

    activeFilters.category2 = generateDateRange(startDate, endDate); // Update active filters for category2
    applyFilters(); // Apply all filters again
}
// Ensure the end date cannot be before the start date
document.addEventListener('DOMContentLoaded', function() {
    // Existing date input listener
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    startDateInput.addEventListener('change', function() {
        endDateInput.min = startDateInput.value;
    });

    // Dropdown functionality
    const dropbtn = document.querySelector('.dropdown-menu .dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');

    // Toggle dropdown visibility
    dropbtn.onclick = function() {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    };

    // Click outside to close
    window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {
            if (dropdownContent.style.display === 'block') {
                dropdownContent.style.display = 'none';
            }
        }
    };

    // Initialize all checkboxes to be checked
    const checkboxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true; // Set them to be checked
        toggleGroup(checkbox.getAttribute('onclick').match(/'([^']+)'/)[1]); // Trigger filter toggle for initialization
    });
});

// Example for async fetchMarkersData, modify according to your data fetching logic
async function fetchMarkersData() {
    const response = await fetch('https://raw.githubusercontent.com/mapabuena/BA/main/BsAsPinsGroups.csv');
    const csvData = await response.text();
    processCSVData(csvData);
}

map.on('load', function() {
    setTimeout(function() {
        map.resize();
        fetchMarkersData().then(() => {
            updateFilters();

            // List of group values to activate
            const groupValues = ['group1', 'group2', 'group3', 'group4', 'group5', 'group6'];

            // Simulate clicks for specified groups
            groupValues.forEach(value => {
                let button = document.querySelector(`.filter-button[data-category="category"][data-value="${value}"]`);
                if (button) {
                    button.click(); // Simulate click
                }
            });

            // Update the info window initially after data is fetched and processed
            updateInfoWindowContent();
        }).catch(error => {
            console.error("Error fetching marker data: ", error);
        });
    }, 250);

    // Throttle 'moveend' event to update info window with some delay after map movements
    let updateTimeout;
    map.on('moveend', function() {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateInfoWindowContent, 100); // Only update after 100 ms of inactivity
    });
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
  // Adjust the check according to the initial off-screen position
  if (infoWindow.style.top === '-30%' || infoWindow.style.top === '') {
    infoWindow.style.top = '0'; // Slide into view
  } else {
    infoWindow.style.top = '-30%'; // Slide out of view
  }
}

function calculateDistance(center, data) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(data.lat - center.lat);
    const dLon = toRadians(data.lng - center.lng);
    const lat1 = toRadians(center.lat);
    const lat2 = toRadians(data.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}
function updateInfoWindowContent() {
    const center = map.getCenter();
    const bounds = map.getBounds();
    console.log("Updating info window. Map Center:", center);
    console.log("Map Bounds:", JSON.stringify(bounds));

    // Filter markers that are both visible and within the current map bounds
    const visibleMarkers = markers.filter(({ marker }) => {
        const position = marker.getLngLat();
        const isInBounds = bounds.contains(position);
        const isVisible = marker.getElement().style.display !== 'none';
        console.log(`Marker at ${position.lng}, ${position.lat}: isInBounds=${isInBounds}, isVisible=${isVisible}`);
        return isInBounds && isVisible;
    });

    console.log(`Visible markers count: ${visibleMarkers.length}`);
    if (visibleMarkers.length === 0) {
        document.getElementById('info-window').innerHTML = 'No visible markers within bounds.';
        return;
    }

    // Sort markers by distance from the map center
    visibleMarkers.sort((a, b) => calculateDistance(center, a.data) - calculateDistance(center, b.data));

    const infoWindow = document.getElementById('info-window');
    infoWindow.innerHTML = '';  // Clear current content
    visibleMarkers.forEach(({ marker, data }) => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `<h4>${data.popup_header}</h4><img src="${data.popupimage_url}" alt="${data.name}" style="width:100%;">`;
        infoWindow.appendChild(item);

        item.addEventListener('click', () => {
            // Close all other open popups
            markers.forEach(({ marker: otherMarker }) => otherMarker.getPopup().remove());
            // Open the selected marker's popup and recenter map
            marker.getPopup().addTo(map);
            recenterMap(data.lng, data.lat);
        });
    });
}

function recenterMap(lng, lat) {
    map.flyTo({
        center: [lng, lat],
        essential: true
    });
}


           

function simulateMarkerClick(markerId) {
    // Assuming markerId is the index in the markers array
    const { marker } = markers[markerId];

    // Directly open the popup if it's not already open
    if (!marker.getPopup().isOpen()) {
        marker.togglePopup();
    }
}

async function fetchMarkersData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/mapabuena/BA/main/BsAsPinsGroups.csv');
        const csvData = await response.text();
        await processCSVData(csvData); // Ensure processCSVData is adjusted to be async or returns a Promise
        updateInfoWindowContent(); // Update info window content after all markers are added
    } catch (error) {
        console.error('Error fetching or parsing CSV data:', error);
    }
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
      updateInfoWindowContent();
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
    <div style="font-size:15px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:8px;">
        ${data.popup_header}
        <a href="#" class="copy-address-link" style="font-size:10px; font-family:'Gill Sans MT', Arial; margin-left:16px;">COPY ADDRESS</a>
    </div>
    <img src="${data.popupimage_url}" alt="Popup Image" style="max-width:100%; height:auto; margin-bottom:8px;">
    <div style="font-size:16px; color:black; font-family:'Gill Sans MT', Arial;">${data.description}</div>
</div>
`;

    // Create a popup and set its HTML content
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML);

    // Attach an event listener to the popup after it opens
    popup.on('open', () => {
        const copyLink = document.querySelector('.mapboxgl-popup .copy-address-link');
        if (copyLink) {
            copyLink.onclick = (event) => {
                event.preventDefault();
                navigator.clipboard.writeText(data.name).then(() => {
                    alert('Address copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy text:', err);
                });
            };
        }
    });

    // Create the marker and add it to the map
    const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
        .setLngLat([data.lng, data.lat])
        .setPopup(popup)
        .addTo(map);

    // Add click event listener to marker for recentering
    marker.getElement().addEventListener('click', () => {
        recenterMap(data.lng, data.lat);
    });

    // Store the marker for later use
    markers.push({
        marker: marker,
        data: data
    });
}

// Function to recenter map on marker click
function recenterMap(lng, lat) {
    const mapContainer = map.getContainer();
    const mapHeight = mapContainer.offsetHeight;

    // Offset to position the marker at the bottom 10% of the map
    const offsetY = (mapHeight * 0.43);

    map.flyTo({
        center: [lng, lat],
        offset: [0, offsetY],
        essential: true
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

// Function to apply filters based on the activeFilters state
function applyFilters() {
    markers.forEach(({ marker, data }) => {
        const isVisible = activeFilters.category.length === 0 || activeFilters.category.some(category => data.category.includes(category));
        marker.getElement().style.display = isVisible ? '' : 'none';
    });

    updateInfoWindowContent(); // Refresh the info window content after applying filters
}
