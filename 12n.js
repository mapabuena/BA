mapboxgl.accessToken = 'pk.eyJ1IjoibjMxbGQiLCJhIjoiY2x0NHc5NjVpMDdzaDJscGE5Y2gyYnQ5MyJ9.zfzXUlLbNlVbr9pt4naycw'; // Replace with your actual access token
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/n31ld/clt4onrza001401pcc1j9he1u',
    center: [-58.42, -34.58],
    zoom: 11
});

let markers = [];
let activeFilters = {
    category: [],
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

document.addEventListener('DOMContentLoaded', function() {
    setupDatePickers();
    setupCityButtons();
    setupFormHandlers();
    setupDropdownMenu();
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
function setupDropdownMenu() {
    const dropbtn = document.querySelector('.dropdown-menu .dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const closeButton = document.querySelector('.dropdown-content .close-btn');
    const checkboxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]');

    dropbtn.addEventListener('click', function(event) {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        event.stopPropagation();
    });

    closeButton.addEventListener('click', function(event) {
        dropdownContent.style.display = 'none';
        event.stopPropagation();
    });

    document.addEventListener('click', function(event) {
        if (!dropdownContent.contains(event.target) && !dropbtn.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            toggleGroup(this.getAttribute('data-category'));
        });
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
  const infoWindow = document.getElementById('infowindowbar');
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
        document.getElementById('infowindowbar').innerHTML = 'No visible markers within bounds.';
        return;
    }

    // Sort markers by distance from the map center
    visibleMarkers.sort((a, b) => calculateDistance(center, a.data) - calculateDistance(center, b.data));

    const infoWindow = document.getElementById('infowindowbar');
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
                const lat = parseFloat(data.Latitude);
                const lng = parseFloat(data.Longitude);
                if (isNaN(lat) || isNaN(lng)) {
                    console.error(`Invalid coordinates at row ${rowIndex + 1}: lat=${data.Latitude}, lng=${data.Longitude}`);
                    return; // Skip this row if coordinates are invalid
                }

                // Split categories, starts, and ends into arrays
                const category = data.category ? data.category.split('|') : [];
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

                // Store other relevant data fields
                const markerData = {
                    name: data.Name,
                    lat: lat,
                    lng: lng,
                    popup_header: data.popup_header,
                    popupimage_url: data.popupimage_url,
                    description: data.Description,
                    icon_url: data.icon_url,
                    category: category,
                    dateRanges: dateRanges
                };

                console.log(`Marker Data for ${data.Name}:`, markerData);
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
    el.style.width = '20px';
    el.style.height = '31px';
    el.style.backgroundSize = '100%';

// Define the popup HTML with the "popup-content" class wrapping your content
const popupHTML = `
<div class="popup-content" style="max-height: 100px; max-width: 200px; border-radius: 10px; overflow-y: auto; overflow-x: hidden;">
    <div style="font-size:15px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:2px;">
        <img src="${data.icon_url}" class="copy-icon" alt="Popup Image" style="max-width:25px; height:37px; margin-bottom:2px;">
        <img src="https://raw.githubusercontent.com/mapabuena/BA/main/copyaddress.svg" class="copy-icon" alt="Popup Image" style="max-width:20px; height:27px; margin-bottom:2px;">
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
        navigator.clipboard.writeText(data.name).then(() => {
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
        console.log(`Checking visibility for ${data.name}`);
        
        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.category.some(cat => activeFilters.category.includes(cat));
        console.log(`Category Visibility for ${data.name}: ${isVisibleByCategory}`);

        const isVisibleByDate = data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const isInDateRange = rangeStart <= endDateTime && rangeEnd >= startDateTime;
            console.log(`Checking date range ${range.start} to ${range.end} for ${data.name}: ${isInDateRange}`);
            return isInDateRange;
        });

        console.log(`Date Visibility for ${data.name}: ${isVisibleByDate}`);

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
