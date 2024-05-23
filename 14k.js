mapboxgl.accessToken = 'pk.eyJ1IjoibjMxbGQiLCJhIjoiY2x0NHc5NjVpMDdzaDJscGE5Y2gyYnQ5MyJ9.zfzXUlLbNlVbr9pt4naycw'; // Replace with your actual access token
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/n31ld/clt4onrza001401pcc1j9he1u',
    center: [-73.985428, 40.748817],
    zoom: 11
});

let markers = [];
let activeFilters = {
    category: [],
};


document.addEventListener('DOMContentLoaded', function() {
    setupDatePickers();
    setupCityButtons();
    setupFormHandlers();
    setupMapEvents();
});

function setupDatePickers() {
    const startDateInput = document.getElementById('startDateTime');
    const endDateInput = document.getElementById('endDateTime');
    if (!startDateInput || !endDateInput) {
        console.error("Date inputs are not found on the page.");
        return;
    }

    let startDatePicker = flatpickr(startDateInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "F j, H:i",
        onChange: function(selectedDates, dateStr) {
            endDatePicker.set('minDate', dateStr);
        }
    });

    let endDatePicker = flatpickr(endDateInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "F j, H:i",
        onChange: function(selectedDates, dateStr) {
            startDatePicker.set('maxDate', dateStr);
        }
    });

    startDateInput.addEventListener('change', function() {
        endDatePicker.set('minDate', startDateInput.value);
    });

    endDateInput.addEventListener('change', function() {
        startDatePicker.set('maxDate', endDateInput.value);
    });
}

function setupCityButtons() {
    document.querySelectorAll('.citybutton').forEach(button => {
        button.addEventListener('click', function() {
            const csvUrl = this.getAttribute('data-csv');
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lng = parseFloat(this.getAttribute('data-lng'));
            const zoom = parseFloat(this.getAttribute('data-zoom')) || 11; // Default to 11 if not specified
            const speed = parseFloat(this.getAttribute('data-speed')) || 1.2; // Default to 500ms if not specified
            const curve = parseFloat(this.getAttribute('data-curve')) || 1.42; // Default curve
            const easingFunction = this.getAttribute('data-easing'); // This would need to be translated from a string to a function if used

            loadCSV(csvUrl, lat, lng, zoom, speed, curve, easingFunction);
            const cityNameDisplay = document.getElementById('currentcity');
            if (cityNameDisplay) {
                cityNameDisplay.textContent = this.textContent.trim();
            }
        });
    });
}

function setupFormHandlers() {
    const form = document.getElementById('search-inputs');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const firstVisibleDiv = Array.from(document.getElementById('search-list').children)
                                   .find(div => div.style.display !== 'none');
        if (firstVisibleDiv) {
            const clickableElement = firstVisibleDiv.querySelector('a');
            if (clickableElement) {
                clickableElement.click();
            }
        }
    });
}

function setupMapEvents() {
    map.on('load', function() {
        setTimeout(function() {
            map.resize();
            fetchMarkersData();
        }, 250);

        let updateTimeout;
        map.on('moveend', function() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updateInfoWindowContent, 100);
        });

        // Call adjustMarkerSizes on zoom
        map.on('zoom', adjustMarkerSizes);
    });
}

function adjustMarkerSizes() {
    const zoom = map.getZoom();
    console.log(`Current zoom level: ${zoom}`); // Log the current zoom level

    const zoomThreshold = 14; // Define the zoom threshold
    const closeScaleFactor = 0.10; // Scaling sensitivity for closer zoom levels
    const farScaleFactor = 0.0005; // Scaling sensitivity for farther zoom levels

    const sizeMultiplier = zoom > zoomThreshold
        ? Math.pow(2, (zoom - 11) * closeScaleFactor)
        : Math.pow(2, (zoom - 11) * farScaleFactor);

    markers.forEach(({ marker, data }) => {
        const el = marker.getElement();
        const height = data.iconheight * sizeMultiplier;
        const width = data.iconwidth * sizeMultiplier;
        console.log(`Adjusting marker for ${data.address}: height=${height}px, width=${width}px`);
        el.style.height = `${height}px`;
        el.style.width = `${width}px`;
    });
}

// Function to apply date filter based on selected range
function applyDateFilter() {
    var startDateTime = document.getElementById('startDateTime').value;
    var endDateTime = document.getElementById('endDateTime').value;

    if (!startDateTime || !endDateTime) {
        alert("Please select both start and end dates.");
        return;
    }

    console.log("Selected Start Date: ", startDateTime);
    console.log("Selected End Date: ", endDateTime);

    applyFilters(); // Call applyFilters directly without generating a date range array
}

document.addEventListener('DOMContentLoaded', function() {
    const startDateInput = document.getElementById('startDateTime');
    const endDateInput = document.getElementById('endDateTime');

    if (!startDateInput || !endDateInput) {
        console.error("Date inputs are not found on the page.");
        return; // Exit if inputs are not found
    }

    // Function to check and apply date filters if both dates are set
    function checkAndApplyFilter() {
        if (startDateInput.value && endDateInput.value) {
            applyDateFilter(); // Automatically apply filter when both dates are valid
        }
    }

    // Adjust the minimum allowable date of the end date input
    startDateInput.addEventListener('change', function() {
        endDateInput.min = startDateInput.value;
        checkAndApplyFilter(); // Apply filter if end date is already set
        // Ensure the start date does not exceed an already set end date
        if (endDateInput.value && startDateInput.value > endDateInput.value) {
            startDateInput.value = endDateInput.value; // Correct this line to maintain logical consistency
        }
    });

    // Adjust the maximum allowable date of the start date input
    endDateInput.addEventListener('change', function() {
        startDateInput.max = endDateInput.value;
        checkAndApplyFilter(); // Apply filter if start date is already set
        // Ensure the end date is not before an already set start date
        if (startDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value; // Correct this line to maintain logical consistency
        }
     });
});


// Example for async fetchMarkersData, modify according to your data fetching logic
async function fetchMarkersData() {
    const response = await fetch('https://raw.githubusercontent.com/mapabuena/BA/main/NewYorkPinsGroups.csv');
    const csvData = await response.text();
    processCSVData(csvData);
}

map.on('load', function() {
    setTimeout(function() {
        map.resize();
        fetchMarkersData().then(() => {
            updateFilters();

            // List of group values to activate
            const groupValues = ['group1', 'group2', 'group3', 'group4', 'group5', 'group6', 'city'];

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

    const visibleMarkers = markers.filter(({ marker }) => {
        const position = marker.getLngLat();
        const isInBounds = bounds.contains(position);
        const isVisible = marker.getElement().style.display !== 'none';
        return isInBounds && isVisible;
    });

    if (visibleMarkers.length === 0) {
        document.getElementById('infowindowbar').innerHTML = 'No visible markers within bounds.';
        return;
    }

    visibleMarkers.sort((a, b) => calculateDistance(center, a.data) - calculateDistance(center, b.data));

    const infoWindow = document.getElementById('infowindowbar');
    infoWindow.innerHTML = '';
    visibleMarkers.forEach(({ marker, data }) => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `<h4>${data.popup_header}</h4><img src="${data.popupimage_url}" alt="${data.name}" style="width:100%;">`;
        infoWindow.appendChild(item);

        // Add event listener to show the route when info-item is clicked
        item.addEventListener('click', () => {
            toggleSpecificRoute(data);
            recenterMap(data.lng, data.lat);
            marker.getPopup().addTo(map); // Open the popup
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
        const response = await fetch('https://raw.githubusercontent.com/mapabuena/BA/main/NewYorkPinsGroups.csv');
        const csvData = await response.text();
        clearMarkers(); 
        await processCSVData(csvData); // Ensure processCSVData is adjusted to be async or returns a Promise
        updateInfoWindowContent(); // Update info window content after all markers are added
    } catch (error) {
        console.error('Error fetching or parsing CSV data:', error);
    }
}

function processCSVData(csvData) {
    console.log("Processing CSV Data...");

    Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach((data, rowIndex) => {
                console.log(`Processing row ${rowIndex + 1}:`, data);

                // Check if lat and lng are valid numbers
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);
                if (isNaN(lat) || isNaN(lng)) {
                    console.error(`Invalid coordinates at row ${rowIndex + 1}: lat=${data.latitude}, lng=${data.longitude}`);
                    return; // Skip this row if coordinates are invalid
                }

                // Split categories, starts, and ends into arrays
                const categories = [data.category, data.category2, data.category3, data.category4].filter(Boolean);
                const starts = data.starts ? data.starts.split('|') : [];
                const ends = data.ends ? data.ends.split('|') : [];

                // Ensure that starts and ends arrays are paired correctly
                const dateRanges = [];
                if (starts.length === ends.length) {
                    starts.forEach((start, index) => {
                        dateRanges.push({
                            start: start,
                            end: ends[index]
                        });
                    });
                } else {
                    console.error(`Mismatch in starts and ends lengths at row ${rowIndex + 1}`);
                }

                let geojson = null;
                if (data.GeoJSON && data.GeoJSON.trim() !== '') {
                    try {
                        // Log the raw GeoJSON string before parsing
                        console.log(`Raw GeoJSON at row ${rowIndex + 1}:`, data.GeoJSON);

                        // Remove outer quotes if present and replace double quotes
                        const geojsonString = data.GeoJSON.replace(/""/g, '"').replace(/\\\\"/g, '"').replace(/^"|"$/g, '');

                        // Log the processed GeoJSON string before parsing
                        console.log(`Processed GeoJSON at row ${rowIndex + 1}:`, geojsonString);

                        geojson = JSON.parse(geojsonString);

                        // Log the parsed GeoJSON object
                        console.log(`Parsed GeoJSON at row ${rowIndex + 1}:`, geojson);
                    } catch (error) {
                        console.error(`Error parsing GeoJSON at row ${rowIndex + 1}:`, error, data.GeoJSON);
                    }
                }

                const markerData = {
                    address: data.address,
                    lat: lat,
                    lng: lng,
                    popup_header: data.popup_header,
                    popupimage_url: data.popupimage_url,
                    description: data.description,
                    description2: data.description2,
                    icon_url: data.icon_url,
                    iconwidth: parseInt(data.iconwidth, 10) || 20, // Default to 20 if not specified
                    iconheight: parseInt(data.iconheight, 10) || 31, // Default to 31 if not specified
                    icon2_url: data.icon2_url,
                    icon2width: parseInt(data.icon2width, 10),
                    icon2height: parseInt(data.icon2height, 10),
                    icon3_url: data.icon3_url,
                    icon3width: parseInt(data.icon3width, 10),
                    icon3height: parseInt(data.icon3height, 10),
                    categories: categories,
                    dateRanges: dateRanges,
                    cost: data.cost,
                    tags: data.tags,
                    favorite: data.favorite,
                    geojson: geojson
                };

                console.log(`Marker Data for ${data.address}:`, markerData);
                createMarker(markerData);
            });

            updateInfoWindowContent();
        },
        error: function(error) {
            console.error('Error parsing CSV data:', error);
        }
    });
}

function createMarker(data) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${data.icon_url})`;
    el.style.height =  'auto';
    el.style.minHeight = `${data.iconheight}px`; // Set the minimum height from data.iconheight
    el.style.width = 'auto';
    el.style.minWidth = `${data.iconwidth}px`; // Set the minimum width from data.iconwidth
    el.style.backgroundSize = 'contain'; // Maintain aspect ratio
    el.style.backgroundRepeat = 'no-repeat'; // Prevent the background image from repeating
    el.style.backgroundPosition = 'center'; // Center the image within the div


// Define the popup HTML with the "popup-content" class wrapping your content
const popupHTML = `
<div class="popup-content" style="max-height: 100px; max-width: 260px; border-radius: 10px; overflow-y: auto; overflow-x: hidden;">
    <div style="font-size:15px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:2px;">
        <img src="${data.icon_url}" class="copy-icon" alt="Popup Image" style="max-width:25px; height:37px; margin-bottom:2px;">
        <img src="https://raw.githubusercontent.com/mapabuena/BA/main/copyaddress.svg" class="copy-icon" alt="Popup Image" style="max-width:13px; height:18px; margin-bottom:2px;">
        ${data.popup_header}
    </div>
    <div style="font-size:13px; color:black; font-family:'Gill Sans MT', Arial;">${data.description}</div>
</div>
`;

// Create a popup and set its HTML content
const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML);

// Attach an event listener to the popup after it opens
popup.on('open', () => {
    const copyLink = document.querySelector('.mapboxgl-popup .copy-address-link');
    const copyIcons = document.querySelectorAll('.mapboxgl-popup .copy-icon');

    const copyToClipboard = (event) => {
        event.preventDefault();
        navigator.clipboard.writeText(data.address).then(() => {
            alert('Address copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text:', err);
        });
    };

    if (copyLink) {
        copyLink.onclick = copyToClipboard;
    }

    copyIcons.forEach(icon => {
        icon.onclick = copyToClipboard;
    });
});


    // Create the marker and add it to the map
    const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
        .setLngLat([data.lng, data.lat])
        .setPopup(popup)
        .addTo(map);

    // Event listener to  the route when the marker is clicked
    marker.getElement().addEventListener('click', () => {
        if (data.geojson) {
            toggleSpecificRoute(data);
        }
        recenterMap(data.lng, data.lat);
    });
    // Store the marker for later use
    markers.push({
        marker: marker,
        data: data
    });
}

function toggleGeoJSONRoute(geojson, visibility) {
    const sourceId = 'route-source';
    const layerId = 'route-layer';

    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            'type': 'geojson',
            'data': geojson
        });

        map.addLayer({
            'id': layerId,
            'type': 'line',
            'source': sourceId,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': visibility ? 'visible' : 'none'
            },
            'paint': {
                'line-color': '#888',
                'line-width': 6
            }
        });
    } else {
        map.getSource(sourceId).setData(geojson);
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visibility ? 'visible' : 'none');
        } else {
            map.addLayer({
                'id': layerId,
                'type': 'line',
                'source': sourceId,
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round',
                    'visibility': visibility ? 'visible' : 'none'
                },
                'paint': {
                    'line-color': '#888',
                    'line-width': 6
                }
            });
        }
    }
}


function toggleSpecificRoute(markerData) {
    const layerId = 'route-layer';
    const currentVisibility = map.getLayer(layerId) ? map.getLayoutProperty(layerId, 'visibility') : 'none';
    const newVisibility = currentVisibility === 'visible' ? 'none' : 'visible';
    toggleGeoJSONRoute(markerData.geojson, newVisibility === 'visible');
}

// Function to recenter map on marker click
function recenterMap(lng, lat) {
    const mapContainer = map.getContainer();
    const mapHeight = mapContainer.offsetHeight;
    const mapWidth = mapContainer.offsetWidth;

    // Offset to position the marker at the bottom 10% of the map
    const offsetY = mapHeight * 0.1;

    // Offset to position the marker at the left 20% of the map
    const offsetX = -mapWidth * 0.2;

    map.flyTo({
        center: [lng, lat],
        offset: [offsetX, offsetY],
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

function applyFilters() {
    var startDateTimeInput = document.getElementById('startDateTime').value;
    var endDateTimeInput = document.getElementById('endDateTime').value;
    var startDateTime = new Date(startDateTimeInput);
    var endDateTime = new Date(endDateTimeInput);

    console.log("Applying Filters...");
    console.log("Filter range:", startDateTimeInput, "to", endDateTimeInput);

    markers.forEach(({ marker, data }) => {
        console.log(`Checking visibility for ${data.address}`);
        
        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.category.some(cat => activeFilters.category.includes(cat));
        console.log(`Category Visibility for ${data.address}: ${isVisibleByCategory}`);

        const isVisibleByDate = data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const isInDateRange = rangeStart <= endDateTime && rangeEnd >= startDateTime;
            console.log(`Checking date range ${range.start} to ${range.end} for ${data.address}: ${isInDateRange}`);
            return isInDateRange;
        });

        console.log(`Date Visibility for ${data.address}: ${isVisibleByDate}`);

        // Update marker display based on combined visibility results
        marker.getElement().style.display = (isVisibleByCategory && isVisibleByDate) ? '' : 'none';
    });

    updateInfoWindowContent(); // Make sure this function is defined and functioning
}

// Define easing functions
// Define easing functions including ease-out quad and ease-in-out quad
const easingFunctions = {
    // Standard exponential decay (Mapbox default)
    standard: function(t) {
        return 1 - Math.pow(2, -10 * t);
    },
    // Less aggressive exponential decay
    lessAggressive: function(t) {
        return 1 - Math.pow(2, -8 * t);
    },
    // Even less aggressive exponential decay
    lessAggressive2: function(t) {
        return 1 - Math.pow(2, -6 * t);
    },
    // Minimal exponential decay
    minimalAggressive: function(t) {
        return 1 - Math.pow(2, -4 * t);
    },
    // Near linear (very minimal exponential characteristics)
    nearLinear: function(t) {
        return 1 - Math.pow(2, -2 * t);
    },
    // Ease-Out Quad (quadratic easing out)
    easeOutQuad: function(t) {
        return (--t) * t * t + 1;
    },
    // Ease-In-Out Quad (quadratic easing in and out)
    easeInOutQuad: function(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
};
function loadCSV(csvFile, centerLat, centerLng, zoom, speed, curve, easing) {
    fetch(csvFile)
        .then(response => response.text())
        .then(csvData => {
            clearMarkers();
            processCSVData(csvData);
            map.flyTo({
                center: [centerLng, centerLat],
                zoom: zoom,
                speed: speed,
                curve: curve,
                easing: easingFunctions[easing] || easingFunctions.standard // Use the standard easing if not specified
            });
        })
        .catch(error => console.error('Error fetching or processing CSV data:', error));
}

function clearMarkers() {
    markers.forEach(marker => marker.marker.remove());
    markers = [];
}
