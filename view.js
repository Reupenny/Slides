document.addEventListener('DOMContentLoaded', function () {
    const gallery = document.querySelector('.gallery');

    fetch('/images')
        .then(response => response.json())
        .then(images => {
            images.forEach(image => {
                const img = document.createElement('img');
                img.src = image;
                img.alt = image;

                const filename = document.createElement('div');
                filename.textContent = image.split('/').pop();
                filename.style.textAlign = 'center';

                const container = document.createElement('div');
                container.appendChild(img);
                container.appendChild(filename);

                gallery.appendChild(container);
            });
        });
});
