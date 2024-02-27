let currentInfowindow = null;
let map, directionsService, directionsRenderer;
let markers = [];
let kmlLayers = [null, null, null],
    kmlUrls = [
       'https://raw.githubusercontent.com/mapabuena/BA/main/Safest%20and%20most%20walkable.kml',
        'https://raw.githubusercontent.com/mapabuena/BA/main/Safe%20but%20less%20walkable.kml',
        'https://raw.githubusercontent.com/mapabuena/BA/main/Feels%20sketchy%20at%20night.kml'
    ];
let activeFilters = {
    category: [],
    category2: []
};

// Function to update active filters based on button clicks
function updateFilters() {
    document.querySelectorAll('.button-container .filter-button').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const value = this.getAttribute('data-value');

            // Toggle active state for button
            this.classList.toggle('active');

            // Update filter arrays based on button state
            if (this.classList.contains('active')) {
                if (!activeFilters[category].includes(value)) {
                    activeFilters[category].push(value);
                }
            } else {
                activeFilters[category] = activeFilters[category].filter(item => item !== value);
            }

            // Apply filters to markers
            applyFilters();
        });
    });
}
function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCAK_oC-2iPESygmTO20tMTBJ5Eyu5_3Rw&callback=initMap&v=3.56&libraries=marker,places';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function onGoogleMapsScriptLoad() {
    initMap();
    initKMLLayers();
}

loadGoogleMapsScript();

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), { center: { lat: -34.58, lng: -58.42 }, zoom: 13, mapId: "befcb04c6fcb9633", mapTypeControl: false });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    new google.maps.places.Autocomplete(document.getElementById('startLocation'));

     fetchMarkersData();
     updateFilters();
     initKMLLayers(); // Ensure KML layers are initialized after the map is ready
}

function fetchMarkersData() {
    fetch('https://raw.githubusercontent.com/mapabuena/BA/main/BsAsPinsGroups.csv')
        .then(response => response.text())
        .then(processCSVData)
        .catch(error => console.error('Error fetching or parsing CSV data:', error));
}

function processCSVData(csvData) {
    csvData.split('\n').slice(1).forEach(line => {
        const columns = line.split(',');

        // Assuming columns order: name, latitude, longitude, popup_header, popupimage_url, description, icon_url, category, category2, category3
        let data = {
            name: columns[0],
            lat: parseFloat(columns[1]), 
            lng: parseFloat(columns[2]),
            popup_header: columns[3],
            popupimage_url: columns[4],
            description: columns[5],
            icon_url: columns[6],
            // Splitting categories by '|' if they exist
            category: columns[7] ? columns[7].split('|') : [], 
            category2: columns[8] ? columns[8].split('|') : [],
            category3: columns[9] ? columns[9].split('|') : []
        };

        if (!isNaN(data.lat) && !isNaN(data.lng)) {
            createMarker(data);
        }
    });
}


function handleCategoryButtonClick(button) {
    let categoryType = button.getAttribute('data-category');
    if (!categoryType) {
        console.error('Button does not have a data-category attribute', button);
        return; // Exit the function if categoryType is null or undefined.
    }

    let categoryValues;
    if (button.hasAttribute('data-values')) {
        categoryValues = button.getAttribute('data-values').split(',');
    } else if (button.hasAttribute('data-value')) {
        categoryValues = [button.getAttribute('data-value')];
    } else {
        console.error('Button does not have data-values or data-value attributes', button);
        return; // Exit the function if neither attribute is present.
    }

    button.classList.toggle('active');

    if (button.classList.contains('active')) {
        activeFilters[categoryType] = [...new Set([...activeFilters[categoryType], ...categoryValues])];
    } else {
        activeFilters[categoryType] = activeFilters[categoryType].filter(val => !categoryValues.includes(val));
    }

    applyFilters();
}

function initKMLLayers() {
    kmlUrls.forEach((url, index) => {
        // Initialize each KML layer and store it in the kmlLayers array
        kmlLayers[index] = new google.maps.KmlLayer({
            url: url,
            map: null // Start with the layer not displayed
        });
    });
}

function applyFilters() {
    console.log("Active filters:", activeFilters);

    markers.forEach(marker => {
        const matchesCategory = activeFilters.category.length === 0 || marker.category.some(cat => activeFilters.category.includes(cat));
        const matchesCategory2 = activeFilters.category2.length === 0 || marker.category2.some(cat2 => activeFilters.category2.includes(cat2));

        // A marker should be shown only if it matches both category and category2 filters
        // or if there are no filters selected for that category.
        let shouldBeShown = matchesCategory && matchesCategory2;

        console.log(`Marker categories: ${marker.category}, matchesCategory: ${matchesCategory}, matchesCategory2: ${matchesCategory2}, shouldBeShown: ${shouldBeShown}`);

        if (shouldBeShown) {
           marker.position = marker.originalPosition; 
        } else {
            // Directly setting the marker's position to null to hide it
            marker.position = null; // Confirm this is correct for AdvancedMarkerElement
        }
    });
}


// Make sure to replace 'map' with your actual map instance variable



function toggleKMLLayer(index) {
    if (kmlLayers[index]) {
        var layer = kmlLayers[index];
        layer.setMap(layer.getMap() ? null : map); // Toggle the layer
    } else {
        console.error('KML Layer at index', index, 'is not initialized.');
    }
}

function createMarker(data) {
    // Create an <img> element for the marker icon if the icon URL is provided and starts with 'http'
    let contentElement;
    if (data.icon_url && data.icon_url.startsWith('http')) {
        contentElement = document.createElement("img");
        contentElement.src = data.icon_url; // URL to the custom icon
        contentElement.style.width = "32px"; // Adjust size as needed
        contentElement.style.height = "32px"; // Adjust size as needed
    } else {
        // If no icon_url or it doesn't start with 'http', you can default to an SVG or any placeholder element
        // Here's a simple placeholder approach, adjust as per your requirements
        contentElement = document.createElement("div");
        contentElement.innerHTML = '<svg width="32" height="32" ...></svg>'; // Placeholder SVG or HTML content
    }

    // Create the advanced marker with the custom icon or SVG
    const marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: { lat: data.lat, lng: data.lng },
        content: contentElement, // Use the created element as content
        title: data.name,
    });
      // Store the original position on the marker for later reference
    marker.originalPosition = { lat: data.lat, lng: data.lng };
  // Store the original content on the marker for later reference
    marker._originalContent = contentElement.cloneNode(true); // Use cloneNode to ensure a separate instance
  
    // Store additional data directly on the marker if needed for filtering or reference
    marker.category = data.category;
    marker.category2 = data.category2;
    marker.category3 = data.category3;

    // Store the marker for potential filtering or other operations
    markers.push(marker);
    let infowindowContent = `
<div style="width:250px; word-wrap:break-word;">
    <div style="font-size:20px; font-weight:bold; color:black; font-family:'Gill Sans MT', Arial; margin-bottom:8px;">
        ${escapeHTML(data.popup_header)}
        <a href="#" class="copy-address-link" style="font-size:14px; font-family:'Gill Sans MT', Arial; margin-left:16px;">COPY ADDRESS</a>
    </div>
    <img src="${escapeHTML(data.popupimage_url)}" style="width:100%; height:auto; margin-bottom:8px;">
    <div style="font-size:16px; color:black; font-family:'Gill Sans MT', Arial;">${escapeHTML(data.description)}</div>
    <a href="#" onclick="onGetDirectionsClick({lat:${data.lat},lng:${data.lng}},'${escapeHTML(data.popup_header)}')">Get Directions</a>
</div>
`;

    let infowindow = new google.maps.InfoWindow({ content: infowindowContent });
    marker.addListener('click', () => {
        if (currentInfowindow) currentInfowindow.close();
        currentInfowindow = infowindow;
        infowindow.open(map, marker);

        google.maps.event.addListenerOnce(infowindow, 'domready', () => {
            document.querySelector('.copy-address-link').addEventListener('click', function(event) {
                event.preventDefault();
                copyToClipboard(data.name);
            });
        });
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

function calculateAndDisplayRoute() {
    let start = document.getElementById('startLocation').value;
    let end = document.getElementById('endLocation').value;
    let travelMode = document.getElementById('travelMode').value;
    if (!start || !end) {
        alert('Please enter both start and end locations.');
        return;
    }
    directionsService.route({
        origin: start,
        destination: end,
        travelMode: travelMode
    }, function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            displayRouteDetails(response);
            if (currentInfowindow) currentInfowindow.close();
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function displayRouteDetails(response) {
    const route = response.routes[0];
    let duration = route.legs[0].duration.text;
    let distance = route.legs[0].distance.text;
    document.getElementById('routeDetails').innerHTML = `Distance: ${distance}, Duration: ${duration}`;
}

function onGetDirectionsClick(endLocation, endLocationName) {
    document.getElementById('endLocation').value = `${endLocation.lat}, ${endLocation.lng}`;
    document.getElementById('endLocationName').textContent = endLocationName;
    document.getElementById('directionsPanel').style.display = 'block';
}

function copyAddress() {
    let endLocation = document.getElementById('endLocation').value;
    navigator.clipboard.writeText(endLocation).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        alert('Error in copying text: ', err);
    });
}
