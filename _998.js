mapboxgl.accessToken = 'pk.eyJ1IjoibjMxbGQiLCJhIjoiY2x0NHc5NjVpMDdzaDJscGE5Y2gyYnQ5MyJ9.zfzXUlLbNlVbr9pt4naycw'; // Replace with your actual access token

let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/n31ld/clwocpejw03s201ql6pto7fh9',
    center: [-73.985428, 40.748817],
    zoom: 11
});

let markers = [];
let selectedMarker = null; // Define this globally

let activeFilters = {
    category: [],
};

const nightStyle = 'mapbox://styles/n31ld/clwo829pt03rh01ql4z379sp2';
const originalStyle = 'mapbox://styles/n31ld/clwocpejw03s201ql6pto7fh9';

let isNightMode = false;
let currentCSV = 'https://raw.githubusercontent.com/mapabuena/BA/main/NewYorkPinsGroups.csv'; // Default CSV file
let isDataLoading = false;
let selectedMarkerIndex = null; // Variable to keep track of the selected marker index
let originCoordinates = null;
let destinationCoordinates = null;

let directionsInitialized = false;
let directions; // Define the directions variable here
// Define customStyles globally if not already defined

const customStyles = [{
    'id': 'directions-origin-point',
    'type': 'circle',
    'source': 'directions',
    'paint': {
        'circle-radius': 18,
        'circle-color': '#c62026'
    },
    'filter': [
        'all',
        ['in', '$type', 'Point'],
        ['in', 'marker-symbol', 'A']
    ]
}, {
    'id': 'directions-destination-point',
    'type': 'circle',
    'source': 'directions',
    'paint': {
        'circle-radius': 18,
        'circle-color': '#000000'
    },
    'filter': [
        'all',
        ['in', '$type', 'Point'],
        ['in', 'marker-symbol', 'B']
    ]
}];

if (typeof polyline === 'undefined') {
    console.error("Polyline library is not loaded!");
} else {
    console.log("Polyline library loaded successfully.");
}
function applyRouteInfoStyles() {
    const routeInfo = document.querySelector('.route-info');
    if (routeInfo) {
        if (window.innerWidth <= 479) {
            routeInfo.style.maxHeight = '15vh';
        } else if (window.innerWidth > 479 && window.innerWidth < 769) {
            routeInfo.style.maxHeight = '20vh';
        } else if (window.innerWidth >= 769 && window.innerWidth < 1280) {
            routeInfo.style.maxHeight = '30vh';
        } else {
            routeInfo.style.maxHeight = '40vh';
        }
    }
}
window.addEventListener('resize', applyRouteInfoStyles);
document.addEventListener('DOMContentLoaded', applyRouteInfoStyles);

// Function to save coordinates to localStorage
function saveCoordinatesToLocalStorage(origin, destination) {
    if (origin) {
        localStorage.setItem('originCoordinates', JSON.stringify(origin));
    }
    if (destination) {
        localStorage.setItem('destinationCoordinates', JSON.stringify(destination));
    }
}

// Function to get coordinates from localStorage
function getCoordinatesFromLocalStorage() {
    const origin = JSON.parse(localStorage.getItem('originCoordinates'));
    const destination = JSON.parse(localStorage.getItem('destinationCoordinates'));
    return { origin, destination };
}
function monitorDestinationInput() {
    const destinationInput = document.querySelector('.mapbox-directions-destination input');
    if (destinationInput) {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    const storedDestinationTitle = getDestinationTitleFromLocalStorage();
                    if (destinationInput.value !== storedDestinationTitle) {
                        destinationInput.value = storedDestinationTitle;
                        console.log("Reapplied stored destination title:", storedDestinationTitle);
                    }
                }
            });
        });

        observer.observe(destinationInput, {
            attributes: true,
            attributeFilter: ['value'],
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}

function initializeDirectionsControl() {
    if (!directionsInitialized) {
        directions = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: 'metric',
            profile: 'mapbox/driving-traffic',
            alternatives: true,
            controls: {
                inputs: true,
                instructions: true,
            },
            styles: customStyles
        });

        const directionsContainer = document.getElementById('directions-control');
        if (directionsContainer) {
            directionsContainer.innerHTML = '';
            const directionsControlContainer = directions.onAdd(map);
            if (directionsControlContainer) {
                directionsContainer.appendChild(directionsControlContainer);
            } else {
                console.error('Directions control container not found.');
            }
        } else {
            console.error('Element with ID "directions-control" not found.');
        }

        directions.on('route', (event) => {
            const routes = event.route;
            const profile = directions.options.profile;
            if (routes && routes.length > 0) {
                onRoutesReceived(routes, profile);
            } else {
                console.error("No routes received from Directions API.");
            }
        });

        directions.on('origin', (event) => {
            originCoordinates = event.feature.geometry.coordinates;
            const originProperties = event.feature.properties || {};

            // Check if the originProperties has a title, otherwise use previously set originSidebarHeader or coordinates
            const originTitle = (originProperties.title && originProperties.title.trim() !== '') 
                ? originProperties.title 
                : (originSidebarHeader && originSidebarHeader.trim() !== '') 
                ? originSidebarHeader 
                : `${originCoordinates[1]}, ${originCoordinates[0]}`;

            console.log("Initial origin properties:", originProperties);

            const originInput = document.querySelector('.mapbox-directions-origin input');
            if (originInput && originInput.value !== originTitle) {
                originInput.value = originTitle;
                console.log("Origin title set:", originTitle);
            }

            const originMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="A"]');
            if (originMarker) {
                originMarker.style.backgroundColor = '#c62026';
            }
        });

        directions.on('destination', (event) => {
            destinationCoordinates = event.feature.geometry.coordinates;
            const destinationProperties = event.feature.properties || {};

            // Check if the destinationProperties has a title, otherwise use previously set selectedMarker data or coordinates
            const destinationTitle = (destinationProperties.title && destinationProperties.title.trim() !== '') 
                ? destinationProperties.title 
                : (selectedMarker && selectedMarker.data.sidebarheader && selectedMarker.data.sidebarheader.trim() !== '') 
                ? selectedMarker.data.sidebarheader 
                : `${destinationCoordinates[1]}, ${destinationCoordinates[0]}`;

            console.log("Initial destination properties:", destinationProperties);

            const destinationInput = document.querySelector('.mapbox-directions-destination input');
            if (destinationInput && destinationInput.value !== destinationTitle) {
                destinationInput.value = destinationTitle;
                console.log("Destination title set:", destinationTitle);
            }

            const destinationMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="B"]');
            if (destinationMarker) {
                destinationMarker.style.backgroundColor = '#26617f';
            }
        });

        directionsInitialized = true;
    }
}


// Function to save origin title to localStorage
function saveOriginTitleToLocalStorage(originTitle) {
    if (originTitle && originTitle.trim() !== '') {
        localStorage.setItem('originTitle', originTitle);
        console.log("Saved origin title to localStorage:", originTitle);
    } else {
        console.log("Origin title is empty or invalid, not saving to localStorage.");
    }
}

function setDirectionsInputFields(originTitle, destinationTitle) {
    const originInput = document.querySelector('.mapbox-directions-origin input');
    const destinationInput = document.querySelector('.mapbox-directions-destination input');

    console.log("Updating input fields with:", { originTitle, destinationTitle });

    if (originTitle && originInput) {
        originInput.value = originTitle;
        console.log("Origin input field set to:", originTitle);
        localStorage.setItem('originTitle', originTitle); // Save to local storage
        console.log("Saved origin title to localStorage:", originTitle);
    } else {
        console.log("Origin title or input is missing.");
    }

    if (destinationTitle && destinationInput) {
        destinationInput.value = destinationTitle;
        console.log("Destination input field set to:", destinationTitle);
        localStorage.setItem('destinationTitle', destinationTitle); // Save to local storage
        console.log("Saved destination title to localStorage:", destinationTitle);
    } else {
        console.log("Destination title or input is missing.");
    }
}

function deactivateDirections() {
    clearAllPopups();
    if (directions) {
        directions.removeRoutes(); // Clear routes
        directions.setOrigin(''); // Clear the origin
        directions.setDestination(''); // Clear the destination
        try {
            if (directions._map) { // Check if directions is still added to the map
                map.removeControl(directions); // Remove the directions control from the map
            }
        } catch (error) {
            console.error("Error removing directions control:", error);
        }
        directionsInitialized = false; // Mark as not initialized
        directions = null; // Reset the directions object
    }
    map.off('click', setDestinationOnClick); // Remove map click event listener for setting destination
}

function clearAllPopups() {
    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }
    if (secondPopup) {
        secondPopup.remove();
        secondPopup = null;
    }
}

// Ensure event listeners are added after initializing directions
function initializeDirectionsControl() {
    if (!directionsInitialized) {
        directions = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: 'metric',
            profile: 'mapbox/driving-traffic',
            alternatives: true,
            controls: {
                inputs: true,
                instructions: true,
            },
            styles: customStyles
        });

        const directionsContainer = document.getElementById('directions-control');
        if (directionsContainer) {
            directionsContainer.innerHTML = '';
            const directionsControlContainer = directions.onAdd(map);
            if (directionsControlContainer) {
                directionsContainer.appendChild(directionsControlContainer);
            } else {
                console.error('Directions control container not found.');
            }
        } else {
            console.error('Element with ID "directions-control" not found.');
        }

        directions.on('route', (event) => {
            const routes = event.route;
            const profile = directions.options.profile;
            if (routes && routes.length > 0) {
                onRoutesReceived(routes, profile);
            } else {
                console.error("No routes received from Directions API.");
            }
        });

        directions.on('origin', (event) => {
            originCoordinates = event.feature.geometry.coordinates;
            const originProperties = event.feature.properties || {};
            const originTitle = originProperties.title || '';

            console.log("Initial origin properties:", originProperties);


            const originInput = document.querySelector('.mapbox-directions-origin input');
            if (originInput && originInput.value !== originTitle) {
                originInput.value = originTitle;
                console.log("Origin title set:", originTitle);
            }

            const originMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="A"]');
            if (originMarker) {
                originMarker.style.backgroundColor = '#c62026';
            }
        });

        directions.on('destination', (event) => {
            destinationCoordinates = event.feature.geometry.coordinates;
            const destinationProperties = event.feature.properties || {};
            const destinationTitle = destinationProperties.title || '';

            console.log("Initial destination properties:", destinationProperties);



            const destinationInput = document.querySelector('.mapbox-directions-destination input');
            if (destinationInput && destinationInput.value !== destinationTitle) {
                destinationInput.value = destinationTitle;
                console.log("Destination title set:", destinationTitle);
            }

            const destinationMarker = document.querySelector('.mapboxgl-marker.mapboxgl-marker-anchor-center[style*="B"]');
            if (destinationMarker) {
                destinationMarker.style.backgroundColor = '#26617f';
            }


        });

        directionsInitialized = true;
    }
}

// Function to save destination title to localStorage
function saveDestinationTitleToLocalStorage(destinationTitle) {
    if (destinationTitle) {
        localStorage.setItem('destinationTitle', destinationTitle);
        console.log("Saved destination title to localStorage:", destinationTitle);
    } else {
        console.log("Destination title is empty, not saving to localStorage.");
    }
}

// Function to get destination title from localStorage
function getDestinationTitleFromLocalStorage() {
    const destinationTitle = localStorage.getItem('destinationTitle');
    console.log("Retrieved destination title from localStorage:", destinationTitle);
    return destinationTitle;
}
// Function to get origin title from localStorage
function getOriginTitleFromLocalStorage() {
    const originTitle = localStorage.getItem('originTitle');
    console.log("Retrieved origin title from localStorage:", originTitle);
    return originTitle;
}
function addRouteLabels(route, profile) {
    if (route.geometry) {
        const coordinates = polyline.decode(route.geometry); // Decode the polyline string
        const routeCenter = getRouteCenter(coordinates);

        console.log("Decoded coordinates:", coordinates); // Debug log for decoded coordinates
        console.log("Route center:", routeCenter); // Debug log for route center

        // Show the popup with route details
        showRoutePopup(route, routeCenter, profile);
    }
}

function getRouteCenter(coordinates) {
    if (coordinates && coordinates.length > 0) {
        const midIndex = Math.floor(coordinates.length / 2);
        return coordinates[midIndex]; // Coordinates are already [lng, lat]
    } else {
        console.error("Coordinates are undefined or empty.");
        return null; // Return null to handle appropriately
    }
}
let currentPopup = null;
let secondPopup = null;

// Add CSS styles dynamically
const style = document.createElement('style');
style.innerHTML = `
    .best-route-popup {
        z-index: 9999 !important;
    }

    .second-route-popup {
        z-index: 9998 !important;
    }
`;
document.head.appendChild(style);

// Function to show route popup
function showRoutePopup(route, coordinates, profile, isBestRoute = true) {
    if (!coordinates || coordinates.length !== 2 || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
        console.error("Invalid coordinates for route popup:", coordinates);
        return; // Exit if coordinates are invalid
    }
    const formattedDistance = (route.distance / 1000).toFixed(2) + ' km';
    const formattedTravelTime = Math.round(route.duration / 60) + ' min';

    let modeIcon;
    let iconSize = { width: '24px', height: '24px' }; // Default icon size
    let popupSize = { width: '120px', height: '32px' }; // Default popup size
    let iconPaddingBottom = '0px'; // Default padding

    switch (profile) {
        case 'mapbox/driving':
        case 'mapbox/driving-traffic':
            modeIcon = 'https://raw.githubusercontent.com/mapabuena/BA/main/car.svg';
            iconSize = { width: '22px', height: '22px' };
            popupSize = { width: '100px', height: '30px' };
            iconPaddingBottom = '27px';
            break;
        case 'mapbox/walking':
            modeIcon = 'https://raw.githubusercontent.com/mapabuena/BA/main/walking.svg';
            iconSize = { width: '32px', height: '45px' };
            popupSize = { width: '95px', height: '38px' };
            iconPaddingBottom = '14px';
            break;
        case 'mapbox/cycling':
            modeIcon = 'https://raw.githubusercontent.com/mapabuena/BA/main/cycling.svg';
            iconSize = { width: '32px', height: '32px' };
            popupSize = { width: '86px', height: '38px' };
            iconPaddingBottom = '25px';
            break;
        default:
            modeIcon = 'https://raw.githubusercontent.com/mapabuena/BA/main/default.svg';
            iconSize = { width: '22px', height: '22px' };
            popupSize = { width: '95px', height: '30px' };
            iconPaddingBottom = '15px';
    }

    const backgroundColor = isBestRoute ? 'rgba(255, 255, 255, 0.75)' : 'rgba(169, 169, 169, 0.75)';
    const popupClass = isBestRoute ? 'best-route-popup' : 'second-route-popup';

    const popupContent = `
        <div class="${popupClass}" style="display: flex; align-items: center; padding: 5px; background: ${backgroundColor}; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); font-family: Arial, sans-serif; width: ${popupSize.width}; height: ${popupSize.height}; overflow: hidden;">
            <div style="width: 30%; display: flex; justify-content: center; align-items: center; padding-bottom: ${iconPaddingBottom};">
                <img src="${modeIcon}" alt="Mode" style="width: ${iconSize.width}; height: ${iconSize.height};">
            </div>
            <div style="width: 70%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding-left: 5px;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: green; line-height: 1;">${formattedTravelTime}</p>
                <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333; line-height: 1;">${formattedDistance}</p>
            </div>
        </div>
    `;

    const popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);

    setTimeout(() => {
        const popupElement = popup.getElement();
        if (popupElement) {
            popupElement.style.zIndex = isBestRoute ? '9999' : '9998';
        } else {
            console.error('Popup element not found for setting zIndex');
        }
    }, 100); // Delay to ensure the popup is added to the map

    if (isBestRoute) {
        if (currentPopup) {
            currentPopup.remove(); // Close the previous popup if it exists
        }
        currentPopup = popup;
    } else {
        if (secondPopup) {
            secondPopup.remove(); // Close the previous popup if it exists
        }
        secondPopup = popup;
    }
}

// Function to display route alternatives
function displayRouteAlternatives(routes, profile) {

    if (routes && routes.length > 1) {
        const bestRoute = routes[0];
        const secondBestRoute = routes[1];

        let bestRouteCoordinates = [];
        let secondBestRouteCoordinates = [];

        try {
            bestRouteCoordinates = polyline.decode(bestRoute.geometry); // Decode the polyline string
            secondBestRouteCoordinates = polyline.decode(secondBestRoute.geometry); // Decode the polyline string
        } catch (error) {
            console.error("Error decoding polyline:", error);
        }

        if (bestRouteCoordinates.length > 0 && secondBestRouteCoordinates.length > 0) {
    
            const bestRouteCenter = getRouteCenter(bestRouteCoordinates);
            const secondBestRouteCenter = getRouteCenter(secondBestRouteCoordinates);

            if (bestRouteCenter && secondBestRouteCenter) {
                showRoutePopup(bestRoute, bestRouteCenter, profile, true);
                showRoutePopup(secondBestRoute, secondBestRouteCenter, profile, false);
            } else {
                console.error("Invalid route center coordinates.");
            }
        } else {
            console.error("Decoded coordinates are empty or invalid.");
        }
    } else if (routes && routes.length > 0) {
        const bestRoute = routes[0];
        let bestRouteCoordinates = [];

        try {
            bestRouteCoordinates = polyline.decode(bestRoute.geometry); // Decode the polyline string
        } catch (error) {
            console.error("Error decoding polyline:", error);
        }

        if (bestRouteCoordinates.length > 0) {
            console.log("Best route coordinates:", bestRouteCoordinates); // Debug log

            const bestRouteCenter = getRouteCenter(bestRouteCoordinates);

            if (bestRouteCenter) {
                showRoutePopup(bestRoute, bestRouteCenter, profile, true);
            } else {
                console.error("Invalid route center coordinates.");
            }
        } else {
            console.error("Decoded coordinates are empty or invalid.");
        }
    } else {
        console.warn("No routes available to display"); // Warn if no routes are available
    }
}

function validateCoordinates(coords) {
    if (!Array.isArray(coords) || coords.length !== 2) {
        console.error('Invalid coordinates format:', coords);
        return false;
    }
    const [lng, lat] = coords;
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        console.error('Invalid coordinate values:', coords);
        return false;
    }
    return true;
}

function onRoutesReceived(routes, profile) {
    displayRouteAlternatives(routes, profile);
}
document.addEventListener('DOMContentLoaded', function() {
    setupDatePickers();
    setupCityButtons();
    setupFormHandlers();
    setupMapEvents();
    setupInfoItemHoverEffects();
    setupDirectionsButton();

    const closeDirectionsButton = document.getElementById('close-directions');
    if (closeDirectionsButton) {
        closeDirectionsButton.addEventListener('click', function() {
            document.getElementById('directions-container').style.display = 'none';
            deactivateDirections();
        });
    } else {
        console.error("Element with ID 'close-directions' not found.");
    }

    const originInput = document.querySelector('.mapbox-directions-origin input');
    const destinationInput = document.querySelector('.mapbox-directions-destination input');
    const originClearButton = document.querySelector('.mapbox-directions-origin .geocoder-icon-close');
    const destinationClearButton = document.querySelector('.mapbox-directions-destination .geocoder-icon-close');

    function updateInputFields() {
        if (originInput) {
            originInput.placeholder = originSidebarHeader || 'Choose a starting place';
        }
        if (destinationInput) {
            destinationInput.placeholder = destinationSidebarHeader || 'Choose destination';
        }
    }

    // Event listener for clearing origin input
    if (originClearButton) {
        originClearButton.addEventListener('click', function() {
            if (originInput) {
                originInput.value = '';
            }
            originCoordinates = null;
            originSidebarHeader = null;
            localStorage.removeItem('originCoordinates');
            localStorage.removeItem('originSidebarHeader');
            updateInputFields();
        });
    } else {
        console.error("Element with class '.mapbox-directions-origin .geocoder-icon-close' not found.");
    }

    // Event listener for clearing destination input
    if (destinationClearButton) {
        destinationClearButton.addEventListener('click', function() {
            if (destinationInput) {
                destinationInput.value = '';
            }
            destinationCoordinates = null;
            destinationSidebarHeader = null;
            localStorage.removeItem('destinationCoordinates');
            localStorage.removeItem('destinationSidebarHeader');
            updateInputFields();
        });
    } else {
        console.error("Element with class '.mapbox-directions-destination .geocoder-icon-close' not found.");
    }

    // Event listener for manually entering origin address
    if (originInput) {
        originInput.addEventListener('input', function() {
            if (originInput.value) {
                originSidebarHeader = originInput.value;
                localStorage.setItem('originSidebarHeader', originSidebarHeader);
            } else {
                originCoordinates = null;
                originSidebarHeader = null;
                localStorage.removeItem('originCoordinates');
                localStorage.removeItem('originSidebarHeader');
            }
            updateInputFields();
        });
    }

    // Event listener for manually entering destination address
    if (destinationInput) {
        destinationInput.addEventListener('input', function() {
            if (destinationInput.value) {
                destinationSidebarHeader = destinationInput.value;
                localStorage.setItem('destinationSidebarHeader', destinationSidebarHeader);
            } else {
                destinationCoordinates = null;
                destinationSidebarHeader = null;
                localStorage.removeItem('destinationCoordinates');
                localStorage.removeItem('destinationSidebarHeader');
            }
            updateInputFields();
        });
    }

    // Call monitorDestinationInput() to ensure it's monitoring the field
    monitorDestinationInput();

    // Map click event to set origin or destination
    if (originInput && destinationInput) {
        map.on('click', function(e) {
            const { lng, lat } = e.lngLat;
            const activeInput = document.activeElement;

            if (activeInput === originInput) {
                originCoordinates = [lng, lat];
                originSidebarHeader = `${lat}, ${lng}`;
                setDirectionsInputFields(originSidebarHeader, destinationInput.value);
              
            } else if (activeInput === destinationInput) {
                destinationCoordinates = [lng, lat];
                destinationSidebarHeader = `${lat}, ${lng}`;
                setDirectionsInputFields(originInput.value, destinationSidebarHeader);
              
            }
            updateInputFields();
        });
    } else {
        console.error("Elements with class '.mapbox-directions-origin input' or '.mapbox-directions-destination input' not found.");
    }
});

function clearAllPopups() {
    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }
    if (secondPopup) {
        secondPopup.remove();
        secondPopup = null;
    }
}
function setDirectionsInputFields(originTitle, destinationTitle) {
    const originInput = document.querySelector('.mapbox-directions-origin input');
    const destinationInput = document.querySelector('.mapbox-directions-destination input');

    console.log("Updating input fields with:", { originTitle, destinationTitle });

    if (originTitle && originInput) {
        originInput.value = originTitle;
        console.log("Origin input field set to:", originTitle);
    } else {
        console.log("Origin title or input is missing.");
    }

    if (destinationTitle && destinationInput) {
        destinationInput.value = destinationTitle;
        console.log("Destination input field set to:", destinationTitle);
    } else {
        console.log("Destination title or input is missing.");
    }
}

document.getElementById('custom-traffic').addEventListener('click', () => updateProfile('mapbox/driving-traffic'));
document.getElementById('custom-cycling').addEventListener('click', () => updateProfile('mapbox/cycling'));
document.getElementById('custom-walking').addEventListener('click', () => updateProfile('mapbox/walking'));

// Function to update the profile and retrieve origin and destination titles from localStorage
function updateProfile(profile) {
    // Save current origin and destination data to localStorage
    const originInput = document.querySelector('.mapbox-directions-origin input');
    const destinationInput = document.querySelector('.mapbox-directions-destination input');

    if (originInput) {
        const originTitle = originInput.value;
        saveOriginTitleToLocalStorage(originTitle);
    }

    if (destinationInput) {
        const destinationTitle = destinationInput.value;
        saveDestinationTitleToLocalStorage(destinationTitle);
    }

    if (originCoordinates) {
        saveCoordinatesToLocalStorage(originCoordinates, destinationCoordinates);
    }

    // Retrieve saved data from localStorage
    const { origin, destination } = getCoordinatesFromLocalStorage();
    const originTitle = getOriginTitleFromLocalStorage();
    const destinationTitle = getDestinationTitleFromLocalStorage();

    let originCoords = origin ? `${origin[0]},${origin[1]}` : null;
    let destinationCoords = destination ? `${destination[0]},${destination[1]}` : null;

    // Initialize directions control with the new profile
    if (directions) {
        directions.removeRoutes();
        directions.setOrigin('');
        directions.setDestination('');
    }

    directions = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: profile,
        alternatives: true,
        controls: { inputs: true, instructions: true },
        styles: customStyles
    });

    const directionsContainer = document.getElementById('directions-control');
    if (directionsContainer) {
        directionsContainer.innerHTML = '';
        const directionsControlContainer = directions.onAdd(map);
        if (directionsControlContainer) {
            directionsContainer.appendChild(directionsControlContainer);
        } else {
            console.error('Directions control container not found.');
        }
    }

    if (origin) {
        directions.setOrigin(origin);
    }
    if (destination) {
        directions.setDestination(destination);
    }

    setDirectionsInputFields(originTitle, destinationTitle);

    directions.on('route', (event) => {
        const routes = event.route;
        const profile = directions.options.profile;
        if (routes && routes.length > 0) {
            onRoutesReceived(routes, profile);
        } else {
            console.error("No routes received from Directions API.");
        }
    });

    // If both origin and destination are missing, just initialize the directions control
    if (!originCoords && !destinationCoords) {
        console.warn('Both origin and destination are missing. Initializing directions control with no origin or destination.');
        return;
    }

    // Request directions if both coordinates are available
    if (originCoords && destinationCoords) {
        const requestUrl = `https://api.mapbox.com/directions/v5/${profile}/${originCoords};${destinationCoords}?geometries=polyline&alternatives=true&steps=true&overview=full&access_token=${mapboxgl.accessToken}`;
        
        fetch(requestUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                onRoutesReceived(data.routes, profile);
            } else {
                console.error('No routes found');
            }
        })
        .catch(error => console.error('Error fetching directions:', error));
    }
}
// Add this function to set up the directions button event listener
function setupDirectionsButton() {
    const directionsButton = document.getElementById('get-directions');
    if (directionsButton) {
        directionsButton.addEventListener('click', function() {
            const selectedMarkerData = markers.find(marker => 
                marker.marker.getElement().getAttribute('data-is-selected') === 'true'
            );

            if (selectedMarkerData) {
                const { lat, lng, sidebarheader } = selectedMarkerData.data;

                originCoordinates = [lng, lat];
                originSidebarHeader = sidebarheader || `${lat}, ${lng}`;

                if (!directionsInitialized) {
                    initializeDirectionsControl();
                }

                directions.removeRoutes();

                const origin = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": originCoordinates
                    },
                    "properties": {
                        "title": originSidebarHeader
                    }
                };

                try {
                    directions.setOrigin(originCoordinates);
                    setDirectionsInputFields(origin.properties.title, '');

                    console.log("Origin set successfully.");
                } catch (error) {
                    console.error("Error setting origin:", error);
                    alert('Error setting origin.');
                }

                document.getElementById('directions-container').style.display = 'block';

                map.on('click', setDestinationOnClick);
            } else {
                console.error('No marker selected.');
                alert('Please select a marker first.');
            }
        });
    } else {
        console.error("Element with ID 'get-directions' not found.");
    }
}


// Function to save destination title to localStorage
function saveDestinationTitleToLocalStorage(destinationTitle) {
    if (destinationTitle) {
        localStorage.setItem('destinationTitle', destinationTitle);
        console.log("Saved destination title to localStorage:", destinationTitle);
    } else {
        console.log("Destination title is empty, not saving to localStorage.");
    }
}

function setDestinationOnClick(e) {
    console.log("setDestinationOnClick invoked");

    if (selectedMarker && selectedMarker.data) {
        const { lng, lat, sidebarheader, address, description, cost } = selectedMarker.data;
        console.log("Selected marker data:", selectedMarker.data);

        if (!lng || !lat) {
            console.error("Selected marker data is missing required properties:", selectedMarker.data);
            return;
        }

        destinationCoordinates = [lng, lat];
        destinationSidebarHeader = sidebarheader || `${lat}, ${lng}`;
        console.log("Setting destination with sidebarheader:", sidebarheader);

        const destination = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": destinationCoordinates
            },
            "properties": {
                "title": destinationSidebarHeader,
                "address": address,
                "description": description,
                "cost": cost
            }
        };

        try {
            directions.setDestination(destination);

            // Directly set the input value to ensure it is not reverted
            const destinationInput = document.querySelector('.mapbox-directions-destination input');
            destinationInput.value = destinationSidebarHeader;
            console.log("Directly setting destination input value:", destinationSidebarHeader);

            // Update the input fields to reflect the new destination
            setDirectionsInputFields('', destination.properties.title);

            // Log current destination input value
            console.log("Destination input field value after setting:", destinationInput.value);

            // Use MutationObserver to ensure the input value stays correct
            const observer = new MutationObserver(() => {
                if (destinationInput.value !== destinationSidebarHeader) {
                    destinationInput.value = destinationSidebarHeader;
                    console.log("Reapplied destination sidebarheader:", destinationSidebarHeader);
                }
            });

            observer.observe(destinationInput, {
                attributes: true,
                attributeFilter: ['value'],
                childList: true,
                subtree: true,
                characterData: true
            });

            console.log("Destination set successfully with properties:", destination.properties);
        } catch (error) {
            console.error("Error setting destination:", error);
            alert('Error setting destination.');
        }
    } else {
        console.error("No marker is selected or selected marker data is undefined.");
        alert('Please select a marker first.');
    }

    setTimeout(() => {
        const directionsContainer = document.getElementById('directions-container');
        if (directionsContainer) {
            directionsContainer.scrollIntoView({ behavior: 'smooth' });
            console.log("Scrolled to directions container.");
        } else {
            console.error('Directions container not found.');
        }
    }, 500);
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
            if (globalIndex !== -1 && markers[globalIndex]) {
                const marker = markers[globalIndex].marker;
                const markerData = markers[globalIndex].data;
                const markerElement = marker.getElement();
                if (markerElement.getAttribute('data-is-selected') !== 'true') {
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
            if (globalIndex !== -1 && markers[globalIndex] && globalIndex !== selectedMarkerIndex) {
                const marker = markers[globalIndex].marker;
                const markerData = markers[globalIndex].data;
                const markerElement = marker.getElement();
                if (markerElement.getAttribute('data-is-selected') !== 'true') {
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
                const markerElement = marker.getElement();
                resetMarkerStates(); // Reset all marker states
                markerElement.setAttribute('data-is-selected', 'true');
                markerElement.style.backgroundImage = `url(${markerData.icon2_url})`; // Change marker's background image
                markerElement.style.width = `${markerData.icon2width}px`; // Set marker's width
                markerElement.style.height = `${markerData.icon2height}px`; // Set marker's height
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

    markers.forEach(({ marker, data }) => {
        

        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.categories.some(cat => activeFilters.category.includes(cat));
        

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
            return isInRecurringDateRange;
        });
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
    const mapContainer = map.getContainer();
    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

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

    // Get the current zoom level
    const currentZoom = map.getZoom();
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
    
    map.flyTo({
        center: [lng, lat],
        offset: [offsetX, offsetY],
        speed: speed,
        essential: true
    });

    
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
       

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                results.data.forEach((data, rowIndex) => {
                    

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
                        dateRanges = data.dateRanges.split('|').map(range => {
                            const [start, end] = range.split(';');
                            return { start: new Date(start.trim()), end: end ? new Date(end.trim()) : undefined };
                        });
                    }

                    // Ensure dateRanges is an array
                    if (!Array.isArray(dateRanges)) {
                        console.error(`Invalid dateRanges format at row ${rowIndex + 1}:`, dateRanges);
                        dateRanges = [];
                    }

                    // Parse the recurring_schedule JSON format
                    let recurringSchedule = [];
                    if (data.recurring_schedule) {
                        try {
                            const rawSchedule = data.recurring_schedule.trim().replace(/'/g, '"');
                            let parsedSchedule = JSON.parse(rawSchedule);
                          
                            // If parsedSchedule is a string, parse it again
                            if (typeof parsedSchedule === 'string') {
                                parsedSchedule = JSON.parse(parsedSchedule);
                               
                            }

                            recurringSchedule = parsedSchedule;

                            // Check if parsed recurringSchedule is an array
                            if (Array.isArray(recurringSchedule)) {
                    
                            } else {
                        
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

// Ensure selectedMarker is properly set when a marker is clicked
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

        selectedMarker = { marker, data }; // Track the selected marker

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
function resetMarkerStyles() {
    markers.forEach(({ marker, data }) => {
        const el = marker.getElement();
        el.style.backgroundImage = `url(${data.icon_url})`;
        el.setAttribute('data-is-selected', 'false'); // Reset the selected state
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
    markers.forEach(({ marker, data }) => {
        
        const isVisibleByCategory = activeFilters.category.length === 0 || 
                                    data.categories.some(cat => activeFilters.category.includes(cat));
        const isVisibleByDate = Array.isArray(data.dateRanges) && data.dateRanges.some(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const isInDateRange = rangeStart <= endDateTime && rangeEnd >= startDateTime;
            return isInDateRange;
        });

        const specificDates = convertRecurringToSpecificDates(data.recurring_schedule, startDateTime, endDateTime);
        const isVisibleByRecurring = specificDates.some(range => {
            const isInRecurringDateRange = range.start <= endDateTime && range.end >= startDateTime;
            return isInRecurringDateRange;
        });
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
