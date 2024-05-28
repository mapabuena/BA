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
let isDataLoading = false;

document.getElementById('nightmode').addEventListener('click', () => {
    isNightMode = !isNightMode;
    map.setStyle(isNightMode ? nightStyle : originalStyle);

    console.log('Night Mode:', isNightMode);

    const h4Elements = document.querySelectorAll('.info-item h4');
    h4Elements.forEach(h4 => {
        if (isNightMode) {
            h4.classList.remove('daymode-text'); // Remove day mode class
            h4.classList.add('nightmode-text'); // Add night mode class
        } else {
            h4.classList.remove('nightmode-text'); // Remove night mode class
            h4.classList.add('daymode-text'); // Add day mode class
        }
        console.log('h4 Classes After Change:', h4.className);
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

    console.log('Button Classes:', nightModeButton.className);
});
document.addEventListener('DOMContentLoaded', function() {
    setupDatePickers();
    setupCityButtons();
    setupFormHandlers();
    setupMapEvents();
    setupClickSimulations();
    setupInfoItemHoverEffects();
    // Initially add daymode-text class to h4 elements
    document.querySelectorAll('.info-item h4').forEach(h4 => {
        h4.classList.add('daymode-text');
    });
});

function setupInfoItemHoverEffects() {
    document.querySelectorAll('.info-item').forEach(item => {
        item.addEventListener('mouseover', () => {
            item.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.3)';
        });

        item.addEventListener('mouseout', () => {
            item.style.boxShadow = 'none';
        });
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
            applyDateFilter(); // Automatically apply filter when the date is changed
        }
    });

    let endDatePicker = flatpickr(endDateInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "F j, H:i",
        onChange: function(selectedDates, dateStr) {
            startDatePicker.set('maxDate', dateStr);
            applyDateFilter(); // Automatically apply filter when the date is changed
        }
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
            updateTimeout = setTimeout(() => {
                updateInfoWindowContent();
                markers.forEach(({ marker, data }) => {
                    const el = marker.getElement();
                    el.style.backgroundImage = `url(${data.icon_url})`;
                });
                document.getElementById('sidebarcloser').click();
            }, 100);
        });

        map.on('zoom', adjustMarkerSizes);
    });

    map.on('styledata', function() {
        // Reapply any markers, layers, and sources when the style changes
        fetchMarkersData();
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
    const startDateTime = new Date(document.getElementById('startDateTime').value);
    const endDateTime = new Date(document.getElementById('endDateTime').value);

    if (!startDateTime || !endDateTime) {
        alert("Please select both start and end dates.");
        return;
    }

    markers.forEach(({ marker, data }) => {
        const specificDates = convertRecurringToSpecificDates(data.recurring_schedule, startDateTime, endDateTime);

        const isVisibleByDateRange = data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            return rangeStart <= endDateTime && rangeEnd >= startDateTime;
        });

        const isVisibleByRecurring = specificDates.some(range => {
            return range.start <= endDateTime && range.end >= startDateTime;
        });

        marker.getElement().style.display = (isVisibleByDateRange || isVisibleByRecurring) ? '' : 'none';
    });

    updateInfoWindowContent();
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
    visibleMarkers.forEach(({ marker, data }, index) => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `<h4 class="daymode-text">${data.sidebarheader}</h4><img src="${data.sidebarimage}" alt="${data.address}" style="width:100%;">`;
        infoWindow.appendChild(item);

        item.addEventListener('click', () => {
            const globalIndex = markers.indexOf(markers.find(m => m.marker === marker));
            simulateMarkerClick(globalIndex);
        });

        if (isNightMode) {
            item.querySelector('h4').classList.remove('daymode-text');
            item.querySelector('h4').classList.add('nightmode-text');
        }
    });


setupInfoItemHoverEffects(); // Ensure hover effects are set up
}

function setupClickSimulations() {
    document.getElementById('sidebaropener').addEventListener('click', () => {
        document.getElementById('closeinfobar').click();
    });

    document.getElementById('sidebarcloser').addEventListener('click', () => {
        document.getElementById('extendinfobar').click();
    });

    document.getElementById('sidebarbutton').addEventListener('click', () => {
        document.getElementById('extendinfobar').click();
    });
}

function recenterMap(lng, lat) {
    map.flyTo({
        center: [lng, lat],
        essential: true
    });
}
         
function simulateMarkerClick(markerIndex) {
    const { marker } = markers[markerIndex];
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    marker.getElement().dispatchEvent(clickEvent);
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

                // Transform the dateRanges string to JSON
                let dateRanges = [];
                if (data.dateRanges) {
                    console.log("Original dateRanges string:", data.dateRanges);
                    dateRanges = data.dateRanges.split('|').map(range => {
                        const [start, end] = range.split(';');
                        console.log(`Parsed dateRange - start: ${start.trim()}, end: ${end.trim()}`);
                        return { start: new Date(start.trim()), end: new Date(end.trim()) };
                    });
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
                        }
                    } catch (error) {
                        console.error(`Error parsing recurring_schedule at row ${rowIndex + 1}:`, error);
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
        },
        error: function(error) {
            console.error('Error parsing CSV data:', error);
        }
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



function createMarker(data) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${data.icon_url})`;
    el.style.height = 'auto';
    el.style.minHeight = `${data.iconheight}px`; 
    el.style.width = 'auto';
    el.style.minWidth = `${data.iconwidth}px`; 
    el.style.backgroundSize = 'contain'; 
    el.style.backgroundRepeat = 'no-repeat'; 
    el.style.backgroundPosition = 'center'; 

    const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
        .setLngLat([data.lng, data.lat])
        .addTo(map);

    marker.getElement().addEventListener('click', () => {
        markers.forEach(({ marker, data }) => {
            const el = marker.getElement();
            el.style.backgroundImage = `url(${data.icon_url})`;
        });

        el.style.backgroundImage = `url(${data.icon2_url})`;

        document.getElementById('sidebarimage').innerHTML = `<img src="${data.sidebarimage}" alt="Sidebar Image" style="width: 100%;">`;
        document.getElementById('sidebarheader').innerText = data.sidebarheader;
        document.getElementById('sidebardescription').innerText = data.description;
        document.getElementById('sidebarheader2').innerText = data.sidebarheader2 || '';

        document.getElementById('sidebaropener').click();
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

// Function to recenter map on marker click
function recenterMap(lng, lat) {
    const mapContainer = map.getContainer();
    const mapHeight = mapContainer.offsetHeight;
    const mapWidth = mapContainer.offsetWidth;

    // Offset to position the marker at the bottom 10% of the map
    const offsetY = -mapHeight * 0.2;

    // Offset to position the marker at the left 20% of the map
    const offsetX = -mapWidth * 0;

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

let isDataLoading = false;

function loadCSV(csvFile, centerLat, centerLng, zoom, speed, curve, easing) {
    if (isDataLoading) {
        console.log('Data is already loading, please wait.');
        return;
    }

    isDataLoading = true; // Set the flag to true when loading starts
    fetch(csvFile)
        .then(response => response.text())
        .then(csvData => {
            clearMarkers();
            return processCSVData(csvData); // Ensure this is async
        })
        .then(() => {
            console.log('Markers loaded, now flying to new location.');
            map.flyTo({
                center: [centerLng, centerLat],
                zoom: zoom,
                speed: speed,
                curve: curve,
                easing: easingFunctions[easing] || easingFunctions.standard // Use the standard easing if not specified
            });
        })
        .catch(error => console.error('Error fetching or processing CSV data:', error))
        .finally(() => {
            isDataLoading = false; // Reset the flag when loading is done
        });
}
function clearMarkers() {
    markers.forEach(marker => marker.marker.remove());
    markers = [];
}
