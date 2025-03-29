let timeout;

function hideCursor() {
    document.body.style.cursor = 'none';
}

function showCursor() {
    document.body.style.cursor = 'default';
}

document.addEventListener('mousemove', function () {
    const header = document.getElementById('slideshow-header');
    const map = document.getElementById('map');
    header.classList.remove('hidden');
    map.classList.remove('hidden');
    showCursor();
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        header.classList.add('hidden');
        map.classList.add('hidden');
        hideCursor();
    }, 2000);
});

document.addEventListener('DOMContentLoaded', function () {
    hideCursor();
});

// JavaScript code for slideshow
const slideshowImage1 = document.getElementById('slideshow-image-1');
const slideshowImage2 = document.getElementById('slideshow-image-2');
const dateTakenSpan = document.getElementById('date-taken');
const locationSpan = document.getElementById('location');
const mapDiv = document.getElementById('map');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const progressBar = document.getElementById('progress-bar');
const photoProgressBar = document.getElementById('photo-progress-bar');
const slideshowContainer = document.getElementById('slideshow-container');
if (slideshowContainer) {
    slideshowContainer.appendChild(progressBar);
    slideshowContainer.appendChild(photoProgressBar);
} else {
    console.error("slideshowContainer is null");
}
let imagePaths = [];
let currentImageIndex = 0;
let slideshowInterval;
let map;
let activeImage = 1;
let caffeinateProcess;
let photoProgress = 0;
let isPaused = false;
const filenameSpan = document.getElementById('filename');
const pauseButton = document.getElementById('pause-button');

prevButton.addEventListener('click', () => {
    currentImageIndex = (currentImageIndex - 1 + imagePaths.length) % imagePaths.length;
    updateSlideshow(); // No argument needed now, currentImageIndex is correctly updated
    photoProgress = 0;
});

nextButton.addEventListener('click', () => {
    currentImageIndex = (currentImageIndex + 1) % imagePaths.length;
    updateSlideshow(); // No argument needed now, currentImageIndex is correctly updated
    photoProgress = 0;
});

fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
});

async function fetchImagePaths() {
    try {
        const response = await fetch('/images');
        imagePaths = await response.json();
        if (imagePaths.length > 0) { // Ensure there are images to display
            startSlideshow();
        } else {
            console.warn("No images found.");
            // Optionally, display a message to the user
            slideshowImage1.src = '';
            slideshowImage2.src = '';
            dateTakenSpan.textContent = 'No images to display';
            locationSpan.textContent = '';
            mapDiv.textContent = '';
            progressBar.style.width = '0%';
            photoProgressBar.style.width = '0%';
            filenameSpan.textContent = '';
        }
    } catch (error) {
        console.error('Error fetching image paths:', error);
        // Handle error gracefully (e.g., display an error message)
        slideshowImage1.src = '';
        slideshowImage2.src = '';
        dateTakenSpan.textContent = 'Error loading images';
        locationSpan.textContent = '';
        mapDiv.textContent = '';
        progressBar.style.width = '0%';
        photoProgressBar.style.width = '0%';
        filenameSpan.textContent = '';
    }
}

function updateSlideshow() {
    if (imagePaths.length === 0) {
        slideshowImage1.src = '';
        slideshowImage2.src = '';
        dateTakenSpan.textContent = 'Date Taken: Unknown';
        locationSpan.textContent = 'Location: Unknown';
        mapDiv.textContent = 'Map Placeholder';
        progressBar.style.width = '0%';
        photoProgressBar.style.width = '0%';
        filenameSpan.textContent = '';
        return;
    }

    const nextImageIndex = currentImageIndex; // Use currentImageIndex directly
    const nextImage = (activeImage === 1) ? slideshowImage2 : slideshowImage1;
    const currentImage = (activeImage === 1) ? slideshowImage1 : slideshowImage2;

    filenameSpan.textContent = imagePaths[nextImageIndex].split('/').pop();
    nextImage.src = imagePaths[nextImageIndex];
    fetchExifData(imagePaths[nextImageIndex]);
    progressBar.style.width = `${(nextImageIndex + 1) / imagePaths.length * 100}%`;
    currentImage.classList.remove('active');
    nextImage.classList.add('active');
    activeImage = (activeImage === 1) ? 2 : 1;

    // No need to update currentImageIndex here; it's already handled by button clicks and the slideshow interval
}

async function fetchExifData(imagePath) {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
        EXIF.getData(img, function () {
            const allMetaData = EXIF.getAllTags(this);
            console.log(allMetaData);
            let dateTaken = 'Unknown';
            if (allMetaData.DateTimeOriginal) {
                console.log("DateTimeOriginal:", allMetaData.DateTimeOriginal);
                try {
                    const dateTimeString = allMetaData.DateTimeOriginal.replace(":", "-").replace(":", "-");
                    const date = new Date(dateTimeString);
                    const day = date.getDate();
                    const month = date.toLocaleString('default', { month: 'long' });
                    const year = date.getFullYear();
                    dateTaken = `${day} ${month} ${year}`;
                } catch (e) {
                    console.error("Error formatting date", e);
                    dateTaken = 'Unknown';
                }
            }
            dateTakenSpan.textContent = `${dateTaken}`;
            let location = 'Unknown';
            let latitude, longitude;
            if (allMetaData.GPSLatitude && allMetaData.GPSLongitude) {
                const latitude = convertDMSToDD(allMetaData.GPSLatitudeRef, allMetaData.GPSLatitude);
                const longitude = convertDMSToDD(allMetaData.GPSLongitudeRef, allMetaData.GPSLongitude);
                location = `${latitude}, ${longitude}`;
                // Update map view
                if (map) {
                    map.setView([latitude, longitude], 13);
                    marker.setLatLng([latitude, longitude]);
                } else {
                    map = L.map(mapDiv, {
                        zoomControl: false, // Disable zoom control
                        dragging: false, // Disable dragging
                        scrollWheelZoom: false, // Disable scroll wheel zoom
                        touchZoom: false, // Disable touch zoom
                        doubleClickZoom: false, // Disable double click zoom
                    }).setView([latitude, longitude], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);
                    marker = L.marker([latitude, longitude]).addTo(map);
                }

                // Reverse geocode to get address
                reverseGeocode(latitude, longitude).then(address => {
                    marker.bindPopup(address).openPopup();
                });
            }
            locationSpan.textContent = ``;
        });
    };
    img.onerror = (error) => {
        console.error('Error loading image:', error);
        dateTakenSpan.textContent = 'Date Taken: Unknown';
        locationSpan.textContent = 'Location: Unknown';
        mapDiv.textContent = 'Map Placeholder';
    };
}

async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        if (data.address) {
            return data.address.road;
        } else {
            return 'Address not found';
        }
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return 'Address not found';
    }
}

function convertDMSToDD(ref, dms) {
    let sign = 1
    if (ref == 'S' || ref == 'W') {
        sign = -1
    }
    let degrees = dms[0]
    let minutes = dms[1] / 60
    let seconds = dms[2] / 3600
    return sign * (degrees + minutes + seconds)
}

function startSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
    }

    // Start caffeinate to prevent screen saver
    fetch('/start-caffeinate')
        .then(response => response.json())
        .then(data => {
            caffeinateProcess = data.pid;
            console.log('caffeinate started with PID:', caffeinateProcess);
        })
        .catch(error => console.error('Error starting caffeinate:', error));

    updateSlideshow();  // Start with the currentImageIndex
    slideshowInterval = setInterval(() => {
        if (!isPaused) {
            updatePhotoProgress();
            if (photoProgress >= 100) {
                currentImageIndex = (currentImageIndex + 1) % imagePaths.length; // Increment index for automatic slideshow
                updateSlideshow();
                photoProgress = 0;
            }
        }
    }, 50); // Change image every 5 seconds
}

function updatePhotoProgress() {
    photoProgress += (100 / (5000 / 50));
    photoProgressBar.style.width = `${photoProgress}%`;
}

pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.innerHTML = isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
});

document.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
        isPaused = !isPaused;
        pauseButton.innerHTML = isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    } else if (event.code === 'ArrowLeft') {
        prevButton.click();
    } else if (event.code === 'ArrowRight') {
        nextButton.click();
    } else if (event.key === 'f') {
        fullscreenButton.click();
    }
});

document.addEventListener('beforeunload', function () {
    if (caffeinateProcess) {
        fetch('/stop-caffeinate?pid=' + caffeinateProcess)
            .catch(error => console.error('Error stopping caffeinate:', error));
    }
});

fetchImagePaths();
