mapboxgl.accessToken = 'pk.eyJ1IjoibjMxbGQiLCJhIjoiY2x0NHc5NjVpMDdzaDJscGE5Y2gyYnQ5MyJ9.zfzXUlLbNlVbr9pt4naycw'; // Replace with your actual access token
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/n31ld/clwocpejw03s201ql6pto7fh9',
    center: [-73.985428, 40.748817],
    zoom: 11
});

let markers = [];
let activeFilters = {
    category: [],
};

const nightStyle = 'mapbox://styles/n31ld/clwo829pt03rh01ql4z379sp2';
const originalStyle = 'mapbox://styles/n31ld/clwocpejw03s201ql6pto7fh9';

let isNightMode = false;
let currentCSV = 'https://raw.githubusercontent.com/mapabuena/BA/main/NewYorkPinsGroups.csv'; // Default CSV file
let isDataLoading = false;
let selectedMarkerIndex = null; // Variable to keep track of the selected marker index

let directions; // Declare the directions variable here
let directionsInitialized = false;

function initializeDirectionsControl() {
    if (!directions) {
        directions = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: 'metric',
            profile: 'mapbox/driving',
            controls: {
                inputs: true,
                instructions: true,
            }
        });

        const directionsControlElement = document.getElementById('directions-control');
        if (directionsControlElement) {
            directionsControlElement.appendChild(directions.onAdd(map));

            // Modify the start and end markers after they are added to the map
            directions.on('origin', () => {
                const originMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="A"]');
                if (originMarker) {
                    originMarker.style.backgroundColor = '#c62026'; // Change this to your desired color
                }
            });

            directions.on('destination', () => {
                const destinationMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="B"]');
                if (destinationMarker) {
                    destinationMarker.style.backgroundColor = '#26617f'; // Change this to your desired color
                }
            });

            // Listen for route updates and check for layer existence
            directions.on('route', () => {
                const layerId = 'directions-route-line-alt';
                if (map.getLayer(layerId)) {
                    console.log(`Layer ${layerId} exists and ready to be used.`);
                } else {
                    console.warn(`Layer ${layerId} does not exist.`);
                }
            });
        } else {
            console.error("Element with ID 'directions-control' not found.");
        }

        directionsInitialized = true; // Mark as initialized
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setupDatePickers();
    setupCityButtons();
    setupFormHandlers();
    setupMapEvents();
    setupInfoItemHoverEffects();
    setupDirectionsButton();
    // Removed automatic initialization of directions control

   // Initially add daymode-text class to h4 elements
    document.querySelectorAll('.info-item h4').forEach(h4 => {
        h4.classList.add('daymode-text');
    });

    const closeDirectionsButton = document.getElementById('close-directions');
    if (closeDirectionsButton) {
        closeDirectionsButton.addEventListener('click', function() {
            document.getElementById('directions-container').style.display = 'none';
            if (directions) {
                directions.removeRoutes(); // Clear routes
                directions.setOrigin(''); // Clear the origin
                directions.setDestination(''); // Clear the destination
                map.removeControl(directions); // Remove the directions control from the map
                directionsInitialized = false; // Mark as not initialized
                directions = null; // Reset the directions object
            }
        });
    } else {
        console.error("Element with ID 'close-directions' not found.");
    }

    // Call this function to set up the directions button event
    const directionsButton = document.getElementById('get-directions');
    if (directionsButton) {
        setupDirectionsButton();
    } else {
        console.error("Element with ID 'get-directions' not found.");
    }
});
// Add this function to set up the directions button event listener
function setupDirectionsButton() {
    const directionsButton = document.getElementById('get-directions');
    if (directionsButton) {
        directionsButton.addEventListener('click', function() {
            const selectedMarker = markers.find(marker => 
                marker.marker.getElement().getAttribute('data-is-selected') === 'true'
            );

            if (selectedMarker) {
                const { lat, lng, sidebarheader } = selectedMarker.data;
                if (!directionsInitialized) {
                    initializeDirectionsControl();
                }
                directions.removeRoutes(); // Clear any existing routes
                directions.setOrigin([lng, lat]); // Set coordinates directly
                directions.setDestination(''); // Clear the destination
                document.getElementById('directions-container').style.display = 'block';

                // Wait a moment to allow the origin to be set, then manually update the input field
                setTimeout(() => {
                    const originInput = document.querySelector('.mapbox-directions-origin input.mapboxgl-ctrl-geocoder--input');
                    if (originInput) {
                        originInput.value = sidebarheader || `${lat}, ${lng}`; // Use sidebarheader if available
                        originInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
                    }
                }, 500);
            } else {
                alert('Please select a marker first.');
            }
        });
    } else {
        console.error("Element with ID 'get-directions' not found.");
    }
}


document.getElementById('nightmode').addEventListener('click', () => {
    isNightMode = !isNightMode;
    map.setStyle(isNightMode ? nightStyle : originalStyle);

    map.once('styledata', function() {
        initializeDirectionsControl();
    });

     const h4Elements = document.querySelectorAll('.info-item h4');
    h4Elements.forEach(h4 => {
        if (isNightMode) {
            h4.classList.remove('daymode-text');
            h4.classList.add('nightmode-text');
        } else {
            h4.classList.remove('nightmode-text');
            h4.classList.add('daymode-text');
        }
    });
  
    document.querySelectorAll('.some-div').forEach(div => {
        div.style.backgroundColor = isNightMode ? 'darkgray' : 'white';
    });

 const nightModeButton = document.getElementById('nightmode');
    if (isNightMode) {
        nightModeButton.classList.add('nightmode-active');
    } else {
        nightModeButton.classList.remove('nightmode-active');
    }
});

// Call this function to set up the button event
setupDirectionsButton();

// Function to set directions in Mapbox Directions API
function setDirections(lat, lng) {
    directions.setOrigin([lng, lat]);
    directions.setDestination([lng, lat]);
    directions.setProfile('mapbox/driving'); // Default to driving, can be changed later
}

function setupInfoItemHoverEffects() {
    document.querySelectorAll('.info-item').forEach(item => {
        item.addEventListener('mouseover', () => {
            const markerIndex = item.getAttribute('data-marker-index');
            const globalIndex = parseInt(markerIndex);
            console.log('Mouseover globalIndex:', globalIndex); // Debug log
            if (globalIndex !== -1 && markers[globalIndex]) {
                const marker = markers[globalIndex].marker;
                const markerData = markers[globalIndex].data;
                const markerElement = marker.getElement();
                if (markerElement.getAttribute('data-is-selected') !== 'true') {
                    console.log('Changing marker background to:', markerData.icon3_url); // Debug log
                    markerElement.style.backgroundImage = `url(${markerData.icon3_url})`; // Change marker's background image
                    markerElement.style.width = `${markerData.icon3width}px`; // Set marker's width
                    markerElement.style.height = `${markerData.icon3height}px`; // Set marker's height
                }
            }
            item.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.3)'; // Add box shadow to info-item
        });

        item.addEventListener('mouseout', () => {
            const markerIndex = item.getAttribute('data-marker-index');
            const globalIndex = parseInt(markerIndex);
            console.log('Mouseout globalIndex:', globalIndex); // Debug log
            if (globalIndex !== -1 && markers[globalIndex] && globalIndex !== selectedMarkerIndex) {
                const marker = markers[globalIndex].marker;
                const markerData = markers[globalIndex].data;
                const markerElement = marker.getElement();
                if (markerElement.getAttribute('data-is-selected') !== 'true') {
                    console.log('Reverting marker background to:', markerData.icon_url); // Debug log
                    markerElement.style.backgroundImage = `url(${markerData.icon_url})`; // Revert marker's background image
                    markerElement.style.width = `${markerData.iconwidth}px`; // Revert marker's width
                    markerElement.style.height = `${markerData.iconheight}px`; // Revert marker's height
                }
            }
            item.style.boxShadow = 'none'; // Remove box shadow from info-item
        });

        item.addEventListener('click', () => {
            const markerIndex = item.getAttribute('data-marker-index');
            const globalIndex = parseInt(markerIndex);
            selectedMarkerIndex = globalIndex; // Update the selected marker index
            if (globalIndex !== -1 && markers[globalIndex]) {
                const marker = markers[globalIndex].marker;
                const markerData = markers[globalIndex].data;
                console.log('Clicking marker background to:', markerData.icon2_url); // Debug log
                const markerElement = marker.getElement();
                resetMarkerStates(); // Reset all marker states
                markerElement.setAttribute('data-is-selected', 'true');
                markerElement.style.backgroundImage = `url(${markerData.icon2_url})`; // Change marker's background image
                markerElement.style.width = `${markerData.icon2width}px`; // Set marker's width
                markerElement.style.height = `${markerData.icon2height}px`; // Set marker's height

                console.log(`Calling recenterMap for marker at lng=${markerData.lng}, lat=${markerData.lat}`); // Log before calling recenterMap
                // Recenter map with offset
                recenterMap(markerData.lng, markerData.lat);
            }
        });
    });
}

// Function to reset all marker states
function resetMarkerStates() {
    markers.forEach(({ marker }) => {
        const markerElement = marker.getElement();
        markerElement.setAttribute('data-is-selected', 'false');
    });
}
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
}

document.getElementById('searchButton').addEventListener('click', function() {
    applyFilters();
});

function setupCityButtons() {
    document.querySelectorAll('.citybutton').forEach(button => {
        button.addEventListener('click', function() {
            const csvUrl = this.getAttribute('data-csv');
            const lat = parseFloat(this.getAttribute('data-lat')) || 0; // Default to 0 if not specified
            const lng = parseFloat(this.getAttribute('data-lng')) || 0; // Default to 0 if not specified
            const zoom = parseFloat(this.getAttribute('data-zoom')) || 11; // Default to 11 if not specified
            const speed = parseFloat(this.getAttribute('data-speed')) || 1.2; // Default to 1.2 if not specified
            const curve = parseFloat(this.getAttribute('data-curve')) || 1.42; // Default curve
            const easingFunction = easingFunctions[this.getAttribute('data-easing')] || easingFunctions.easeInOutQuad; // Default to easeInOutQuad if not specified

            // Delay the CSV load until after the zoom animation
            map.flyTo({
                center: [lng, lat],
                zoom: zoom,
                speed: speed,
                curve: curve,
                easing: easingFunction, // Use the specified easing function or the default
                essential: true
            });

            // Load the CSV after the animation completes
            setTimeout(() => {
                loadCSV(csvUrl, lat, lng, zoom, speed, curve, easingFunction);

                // Update the current city display
                const cityNameDisplay = document.getElementById('currentcity');
                if (cityNameDisplay) {
                    cityNameDisplay.textContent = this.textContent.trim();
                }
            }, speed * 130); // Adjust the multiplier if needed
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
            fetchMarkersData(currentCSV);
        }, 250);

        let updateTimeout;
        map.on('moveend', function() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                updateInfoWindowContent();
            
           
            }, 100);
        });

        map.on('zoom', adjustMarkerSizes);
    });

    map.on('styledata', function() {
        // Reapply any markers, layers, and sources when the style changes
        fetchMarkersData(currentCSV);
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
        el.style.height = `${height}px`;
        el.style.width = `${width}px`;
    });
}

// Function to apply date filter based on selected range
function applyFilters() {
    var startDateTimeInput = document.getElementById('startDateTime')._flatpickr.selectedDates[0];
    var endDateTimeInput = document.getElementById('endDateTime')._flatpickr.selectedDates[0];
    
    if (!startDateTimeInput || !endDateTimeInput) {
        alert("Please select both start and end dates.");
        return;
    }

    var startDateTime = new Date(startDateTimeInput);
    var endDateTime = new Date(endDateTimeInput);

    console.log("Applying Filters...");
    console.log("Filter range:", startDateTime, "to", endDateTime);

    markers.forEach(({ marker, data }) => {
        console.log(`Checking visibility for ${data.address}`);

        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.categories.some(cat => activeFilters.category.includes(cat));
        console.log(`Category Visibility for ${data.address}: ${isVisibleByCategory}`);

        const isVisibleByDate = Array.isArray(data.dateRanges) && data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const isInDateRange = rangeStart <= endDateTime && rangeEnd >= startDateTime;
            console.log(`Checking date range ${range.start} to ${range.end} for ${data.address}: ${isInDateRange}`);
            return isInDateRange;
        });

        const specificDates = convertRecurringToSpecificDates(data.recurring_schedule, startDateTime, endDateTime);
        const isVisibleByRecurring = specificDates.some(range => {
            const isInRecurringDateRange = range.start <= endDateTime && range.end >= startDateTime;
            console.log(`Checking recurring date range ${range.start} to ${range.end} for ${data.address}: ${isInRecurringDateRange}`);
            return isInRecurringDateRange;
        });

        console.log(`Date Visibility for ${data.address}: ${isVisibleByDate || isVisibleByRecurring}`);

        // Update marker display based on combined visibility results
        marker.getElement().style.display = (isVisibleByCategory && (isVisibleByDate || isVisibleByRecurring)) ? '' : 'none';
    });

    updateInfoWindowContent(); // Make sure this function is defined and functioning
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
    
    const distance = R * c;

    // Calculate distance considering the x-axis offset
    const centerOffsetLng = center.lng + 0.25 * (data.lng - center.lng);
    const dOffsetLon = toRadians(centerOffsetLng - data.lng);
    const aOffset = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(dOffsetLon / 2) * Math.sin(dOffsetLon / 2);
    const cOffset = 2 * Math.atan2(Math.sqrt(aOffset), Math.sqrt(1 - aOffset));
    
    return R * cOffset;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function updateInfoWindowContent() {
    const center = map.getCenter();
    const bounds = map.getBounds();
    console.log("Updating info window. Map Center:", center);
    console.log("Map Bounds:", JSON.stringify(bounds));

    // Sort all markers by their distance to the center of the map
    markers.sort((a, b) => calculateDistance(center, a.data) - calculateDistance(center, b.data));

    const infoWindow = document.getElementById('infowindowbar');
    infoWindow.innerHTML = '';
    markers.forEach(({ marker, data }, index) => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.setAttribute('data-marker-index', markers.indexOf(markers.find(m => m.marker === marker))); // Ensure correct index
        item.innerHTML = `<h4 class="daymode-text">${data.sidebarheader}</h4><img src="${data.sidebarimage}" alt="${data.address}" style="width:100%;">`;
        infoWindow.appendChild(item);

        item.addEventListener('click', () => {
            const globalIndex = markers.indexOf(markers.find(m => m.marker === marker));
            selectedMarkerIndex = globalIndex; // Update the selected marker index
            simulateMarkerClick(globalIndex);
        });

        if (isNightMode) {
            item.querySelector('h4').classList.remove('daymode-text');
            item.querySelector('h4').classList.add('nightmode-text');
        }
    });

    setupInfoItemHoverEffects(); // Ensure hover effects are set up

    // Reset the scrollbar to the left
    infoWindow.scrollLeft = 0;
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
    
    const distance = R * c;

    return distance;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function recenterMap(lng, lat) {
    console.log(`recenterMap function called with lng=${lng}, lat=${lat}`); // Basic log to ensure function is called
    const mapContainer = map.getContainer();
    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    console.log(`Map dimensions: width=${mapWidth}, height=${mapHeight}`); // Log map dimensions

   let offsetX, offsetY;

   if (window.innerWidth <= 479) { // Extra small devices (e.g., phones in portrait mode)
        offsetX = (mapWidth * .3);
        offsetY = -(mapHeight * .15);
    } else if (window.innerWidth > 479 && window.innerWidth < 769) { // Small devices (e.g., phones in landscape mode)
        offsetX = (mapWidth * .15);
        offsetY = -(mapHeight * .1);
    } else if (window.innerWidth >= 769 && window.innerWidth < 1280) { // Medium devices (e.g., tablets)
        offsetX = (mapWidth * .05);
        offsetY = -(mapHeight * .1);
    } else { // Large devices (e.g., desktops)
          offsetX = (mapWidth * .05);
        offsetY = -(mapHeight * .05);
    }

     console.log(`Calculated offsets: offsetX=${offsetX}, offsetY=${offsetY}`); // Add detailed log for offsets

    // Get the current zoom level
    const currentZoom = map.getZoom();
    console.log(`Current zoom level: ${currentZoom}`);

    // Define speed based on zoom level ranges
    let speed;
    if (currentZoom >= 0 && currentZoom < 5) {
        speed = 0.2; // Slow speed for very low zoom levels
    } else if (currentZoom >= 5 && currentZoom < 10) {
        speed = 0.5; // Moderate speed for low to mid zoom levels
    } else if (currentZoom >= 10 && currentZoom < 15) {
        speed = 1.0; // Default speed for mid zoom levels
    } else if (currentZoom >= 15 && currentZoom < 18) {
        speed = 1.5; // Faster speed for high zoom levels
    } else if (currentZoom >= 18 && currentZoom <= 22) {
        speed = 2.0; // Fastest speed for very high zoom levels
    } else {
        speed = 1.2; // Default speed for any other cases
    }
    console.log(`Calculated flyTo speed: ${speed}`);

    map.flyTo({
        center: [lng, lat],
        offset: [offsetX, offsetY],
        speed: speed,
        essential: true
    });

    console.log(`FlyTo called with center: [${lng}, ${lat}], offset: [${offsetX}, ${offsetY}], speed: ${speed}`);
}
async function fetchMarkersData(csvFile) {
    try {
        const response = await fetch(csvFile);
        const csvData = await response.text();
        clearMarkers();
        await processCSVData(csvData); // Ensure processCSVData is adjusted to be async or returns a Promise
        updateInfoWindowContent(); // Update info window content after all markers are added
    } catch (error) {
        console.error('Error fetching or parsing CSV data:', error);
    }
}

function processCSVData(csvData) {
    return new Promise((resolve, reject) => {
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

                    // Transform the dateRanges string to JSON
                    let dateRanges = [];
                    if (data.dateRanges) {
                        console.log("Original dateRanges string:", data.dateRanges);
                        dateRanges = data.dateRanges.split('|').map(range => {
                            const [start, end] = range.split(';');
                            console.log(`Parsed dateRange - start: ${start.trim()}, end: ${end ? end.trim() : ''}`);
                            return { start: new Date(start.trim()), end: end ? new Date(end.trim()) : undefined };
                        });
                    }

                    // Ensure dateRanges is an array
                    if (!Array.isArray(dateRanges)) {
                        console.error(`Invalid dateRanges format at row ${rowIndex + 1}:`, dateRanges);
                        dateRanges = [];
                    }
                    console.log("Parsed dateRanges:", dateRanges);

                    // Parse the recurring_schedule JSON format
                    let recurringSchedule = [];
                    if (data.recurring_schedule) {
                        try {
                            const rawSchedule = data.recurring_schedule.trim().replace(/'/g, '"');
                            console.log("Original recurring_schedule string:", data.recurring_schedule);
                            console.log("Processed recurring_schedule string:", rawSchedule);
                            let parsedSchedule = JSON.parse(rawSchedule);
                            console.log("Parsed recurring_schedule (first pass):", parsedSchedule);

                            // If parsedSchedule is a string, parse it again
                            if (typeof parsedSchedule === 'string') {
                                parsedSchedule = JSON.parse(parsedSchedule);
                                console.log("Parsed recurring_schedule (second pass):", parsedSchedule);
                            }

                            recurringSchedule = parsedSchedule;

                            // Check if parsed recurringSchedule is an array
                            if (Array.isArray(recurringSchedule)) {
                                console.log("recurring_schedule is a valid array:", recurringSchedule);
                            } else {
                                console.error("Parsed recurring_schedule is not an array:", recurringSchedule);
                                recurringSchedule = [];
                            }
                        } catch (error) {
                            console.error(`Error parsing recurring_schedule at row ${rowIndex + 1}:`, error);
                            recurringSchedule = [];
                        }
                    }

                    // Parse GeoJSON string
                    let geojson = null;
                    if (data.GeoJSON && data.GeoJSON.trim() !== '') {
                        try {
                            const geojsonString = data.GeoJSON.replace(/""/g, '"').replace(/\\\\"/g, '"').replace(/^"|"$/g, '');
                            geojson = JSON.parse(geojsonString);
                        } catch (error) {
                            console.error(`Error parsing GeoJSON at row ${rowIndex + 1}:`, error, data.GeoJSON);
                        }
                    }

                    const markerData = {
                        address: data.address,
                        lat: lat,
                        lng: lng,
                        sidebarheader: data.sidebarheader,
                        sidebarheader2: data.sidebarheader2,
                        sidebarimage: data.sidebarimage,
                        description: data.description,
                        description2: data.description2,
                        icon_url: data.icon_url,
                        iconwidth: parseInt(data.iconwidth, 10) || 20,
                        iconheight: parseInt(data.iconheight, 10) || 31,
                        icon2_url: data.icon2_url,
                        icon2width: parseInt(data.icon2width, 10),
                        icon2height: parseInt(data.icon2height, 10),
                        icon3_url: data.icon3_url,
                        icon3width: parseInt(data.icon3width, 10),
                        icon3height: parseInt(data.icon3height, 10),
                        categories: [data.category, data.category2, data.category3, data.category4].filter(Boolean),
                        dateRanges: dateRanges,
                        recurring_schedule: recurringSchedule,
                        geojson: geojson,
                        cost: data.cost,
                        tags: data.tags,
                        favorite: data.favorite
                    };

                    console.log(`Marker Data for ${data.address}:`, markerData);
                    createMarker(markerData);
                });

                updateInfoWindowContent();
                resolve(); // Resolve the promise when processing is done
            },
            error: function(error) {
                console.error('Error parsing CSV data:', error);
                reject(error); // Reject the promise if an error occurs
            }
        });
    });
}
function convertRecurringToSpecificDates(schedule, startDate, endDate) {
    const dayMap = {
        "Sunday": 0,
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
        "Saturday": 6
    };

    if (!Array.isArray(schedule)) {
        console.error("Invalid schedule format (not an array):", schedule);
        return [];
    }

    let specificDates = [];
    schedule.forEach(event => {
        console.log("Processing event:", event); // Log each event
        if (typeof event !== 'object' || !event.day || !event.start_time || !event.end_time) {
            console.error("Invalid event format:", event);
            return;
        }
        const dayOfWeek = dayMap[event.day];
        specificDates = specificDates.concat(
            getNextOccurrences(dayOfWeek, event.start_time, event.end_time, startDate, endDate)
        );
    });
    return specificDates;
}


function getNextOccurrences(dayOfWeek, startTime, endTime, startDate, endDate) {
    let occurrences = [];
    let current = new Date(startDate);

    while (current <= endDate) {
        if (current.getDay() === dayOfWeek) {
            let startDateTime = new Date(current);
            startDateTime.setHours(startTime.split(":")[0], startTime.split(":")[1]);

            let endDateTime = new Date(current);
            endDateTime.setHours(endTime.split(":")[0], endTime.split(":")[1]);

            occurrences.push({ start: startDateTime, end: endDateTime });
        }
        current.setDate(current.getDate() + 1);
    }
    return occurrences;
}



// Function to create markers


function resetMarkerStyles() {
    markers.forEach(({ marker, data }) => {
        const el = marker.getElement();
        el.style.backgroundImage = `url(${data.icon_url})`;
    });
}

function createMarker(data) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${data.icon_url})`;
    el.style.height = `${data.iconheight}px`;
    el.style.width = `${data.iconwidth}px`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.setAttribute('data-is-selected', 'false'); // Initialize state

    const lat = data.lat;
    const lng = data.lng;

    if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates for marker:', data);
        return;
    }

    const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);

    marker.getElement().addEventListener('click', () => {
        resetMarkerStyles(); // Reset all marker styles

        selectedMarker = marker; // Track the selected marker

          el.style.backgroundImage = `url(${data.icon2_url})`;
    el.setAttribute('data-is-selected', 'true'); // Mark as selected

    document.getElementById('sidebarimage').innerHTML = `<img src="${data.sidebarimage}" alt="Sidebar Image" style="width: 100%;">`;
    document.getElementById('sidebarheader').innerText = data.sidebarheader;
    document.getElementById('sidebardescription').innerText = data.description;
    document.getElementById('sidebarheader2').innerText = data.sidebarheader2 || '';

    document.getElementById('sidebaropener').click();

    recenterMap(lng, lat); // Recenter map with offset
    });

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

function simulateMarkerClick(markerId) {
    const { marker, data } = markers[markerId];
    // Simulate marker click
    marker.getElement().dispatchEvent(new Event('click'));
}


function toggleSpecificRoute(markerData) {
    const layerId = 'route-layer';
    const currentVisibility = map.getLayer(layerId) ? map.getLayoutProperty(layerId, 'visibility') : 'none';
    const newVisibility = currentVisibility === 'visible' ? 'none' : 'visible';
    toggleGeoJSONRoute(markerData.geojson, newVisibility === 'visible');
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
    var startDateTimeInput = document.getElementById('startDateTime')._flatpickr.selectedDates[0];
    var endDateTimeInput = document.getElementById('endDateTime')._flatpickr.selectedDates[0];
    
    if (!startDateTimeInput || !endDateTimeInput) {
        alert("Please select both start and end dates.");
        return;
    }

    var startDateTime = new Date(startDateTimeInput);
    var endDateTime = new Date(endDateTimeInput);

    console.log("Applying Filters...");
    console.log("Filter range:", startDateTime, "to", endDateTime);

    markers.forEach(({ marker, data }) => {
        console.log(`Checking visibility for ${data.address}`);

        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.categories.some(cat => activeFilters.category.includes(cat));
        console.log(`Category Visibility for ${data.address}: ${isVisibleByCategory}`);

        const isVisibleByDate = Array.isArray(data.dateRanges) && data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const isInDateRange = rangeStart <= endDateTime && rangeEnd >= startDateTime;
            console.log(`Checking date range ${range.start} to ${range.end} for ${data.address}: ${isInDateRange}`);
            return isInDateRange;
        });

        const specificDates = convertRecurringToSpecificDates(data.recurring_schedule, startDateTime, endDateTime);
        const isVisibleByRecurring = specificDates.some(range => {
            const isInRecurringDateRange = range.start <= endDateTime && range.end >= startDateTime;
            console.log(`Checking recurring date range ${range.start} to ${range.end} for ${data.address}: ${isInRecurringDateRange}`);
            return isInRecurringDateRange;
        });

        console.log(`Date Visibility for ${data.address}: ${isVisibleByDate || isVisibleByRecurring}`);

        // Update marker display based on combined visibility results
        marker.getElement().style.display = (isVisibleByCategory && (isVisibleByDate || isVisibleByRecurring)) ? '' : 'none';
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
    if (isDataLoading) {
        console.log('Data is already loading, please wait.');
        return;
    }

    isDataLoading = true;

    fetch(csvFile)
        .then(response => response.text())
        .then(csvData => {
            clearMarkers();
            processCSVData(csvData).then(() => {
                currentCSV = csvFile; // Update the currentCSV variable with the new file
                isDataLoading = false;
                updateInfoWindowContent(); // Call this after processing is complete
            });
        })
        .catch(error => {
            console.error('Error fetching or processing CSV data:', error);
            isDataLoading = false;
        });
}
function clearMarkers() {
    markers.forEach(marker => marker.marker.remove());
    markers = [];
}

// Function to load CSV data and parse it into a JavaScript object
async function loadCSVData(url) {
    const response = await fetch(url);
    const csvData = await response.text();
    return new Promise((resolve, reject) => {
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                resolve(results.data);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

// Function to filter data based on search query
function filterData(data, query) {
    const lowerCaseQuery = query.toLowerCase();
    return data.filter(item => {
        return Object.keys(item).some(key => 
            item[key].toLowerCase().includes(lowerCaseQuery)
        );
    });
}

function displaySuggestions(suggestions) {
    const autoCompleteResults = document.getElementById('auto-complete-results');
    autoCompleteResults.innerHTML = '';
    suggestions.forEach((item, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = item.address;
        suggestionItem.addEventListener('click', () => {
            const markerIndex = markers.findIndex(m => m.data.address === item.address);
            if (markerIndex !== -1) {
                simulateMarkerClick(markerIndex);
            }
        });
        autoCompleteResults.appendChild(suggestionItem);
    });
}

// Function to add markers to the map from search results
function addMarkerToMap(data) {
    const lat = parseFloat(data.latitude);
    const lng = parseFloat(data.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
        data.lat = lat;
        data.lng = lng;

        let dateRanges = [];
        if (data.dateRanges) {
            dateRanges = data.dateRanges.split('|').map(range => {
                const [start, end] = range.split(';');
                return { start: new Date(start.trim()), end: end ? new Date(end.trim()) : undefined };
            });
        }

        let recurringSchedule = [];
        if (data.recurring_schedule) {
            try {
                const rawSchedule = data.recurring_schedule.trim().replace(/'/g, '"');
                let parsedSchedule = JSON.parse(rawSchedule);
                if (typeof parsedSchedule === 'string') {
                    parsedSchedule = JSON.parse(parsedSchedule);
                }
                recurringSchedule = parsedSchedule;
            } catch (error) {
                console.error(`Error parsing recurring_schedule for ${data.address}:`, error);
            }
        }

        const markerData = {
            address: data.address,
            lat: lat,
            lng: lng,
            sidebarheader: data.sidebarheader,
            sidebarheader2: data.sidebarheader2,
            sidebarimage: data.sidebarimage,
            description: data.description,
            description2: data.description2,
            icon_url: data.icon_url,
            iconwidth: parseInt(data.iconwidth, 10) || 20,
            iconheight: parseInt(data.iconheight, 10) || 31,
            icon2_url: data.icon2_url,
            icon2width: parseInt(data.icon2width, 10),
            icon2height: parseInt(data.icon2height, 10),
            icon3_url: data.icon3_url,
            icon3width: parseInt(data.icon3width, 10),
            icon3height: parseInt(data.icon3height, 10),
            categories: [data.category, data.category2, data.category3, data.category4].filter(Boolean),
            dateRanges: dateRanges,
            recurring_schedule: recurringSchedule,
            geojson: data.GeoJSON,
            cost: data.cost,
            tags: data.tags,
            favorite: data.favorite
        };

        createMarker(markerData);
          updateInfoWindowContent(); // Update the info window content as necessary
    } else {
        console.error('Invalid coordinates for:', data);
    }
}
// Event listener for search input
// Event listener for search input
document.getElementById('mapsearchbox').addEventListener('input', async function() {
    const query = this.value;
    if (query.length > 0) {
        const data = await loadCSVData(currentCSV);
        const suggestions = filterData(data, query);
        displaySuggestions(suggestions);
    } else {
        document.getElementById('auto-complete-results').innerHTML = '';
    }
});


// Event listener for "Add All to Map" button
document.getElementById('add-all-to-map').addEventListener('click', async function() {
    const query = document.getElementById('mapsearchbox').value;
    if (query.length > 0) {
        const data = await loadCSVData(currentCSV);
        const suggestions = filterData(data, query);
        clearMarkers();
        applyDateFilter(); // Reset any date filters
        suggestions.forEach(item => addMarkerToMap(item));
    }
});

// Function to clear markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.marker.remove());
    markers = [];
}
// Function to reset date filters
function applyDateFilter() {
    // Reset the date inputs
    document.getElementById('startDateTime').value = '';
    document.getElementById('endDateTime').value = '';

    // Ensure all markers are displayed (or you can implement additional logic as needed)
    markers.forEach(({ marker }) => {
        marker.getElement().style.display = '';
    });

    updateInfoWindowContent(); // Update the info window content as necessary
}

document.getElementById('mapsearchbox').addEventListener('input', async function() {
    const query = this.value;
    if (query.length >= 3) {
        const data = await loadCSVData(currentCSV);
        const suggestions = filterData(data, query);
        clearMarkers();
        suggestions.forEach(item => addMarkerToMap(item));
        displaySuggestions(suggestions);
        updateInfoWindowContent(); // Update the info window content as necessary
    } else {
        document.getElementById('auto-complete-results').innerHTML = '';
        clearMarkers(); // Clear markers if query length is less than 3
    }
});
