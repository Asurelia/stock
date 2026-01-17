// ============= Photos UI Module =============
// Handles photo gallery and OCR

(function () {
    App.renderPhotos = function (filter = 'all') {
        const photos = Photos.getByType(filter);
        const container = document.getElementById('photoGallery');
        if (!container) return;

        if (photos.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune photo</p>';
            return;
        }

        container.innerHTML = photos.map(p => `
            <div class="photo-card" onclick="App.viewPhoto('${p.dataUrl}')">
                <img src="${p.dataUrl}" alt="${p.description || 'Photo'}">
                <div class="overlay">
                    <span>${p.description || p.type}</span>
                    <span>${new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
            </div>
        `).join('');
    };

    App.resetPhotoForm = function () {
        document.getElementById('photoForm').reset();
        const preview = document.getElementById('photoPreview');
        if (preview) preview.innerHTML = '';
        this.photoData = null;
    };

    App.handlePhotoPreview = async function (e, previewId, target) {
        const file = e.target.files[0];
        if (!file) return;

        const compressed = await Photos.compressImage(file);
        const preview = document.getElementById(previewId);
        if (preview) preview.innerHTML = `<img src="${compressed}">`;

        if (target === 'delivery') {
            this.deliveryPhotoData = compressed;
        } else {
            this.photoData = compressed;
        }
    };

    App.handlePhotoSubmit = function (e) {
        e.preventDefault();

        if (!this.photoData) {
            this.showToast('Veuillez sélectionner une photo', 'error');
            return;
        }

        const photo = {
            dataUrl: this.photoData,
            type: document.getElementById('photoType').value,
            description: document.getElementById('photoDescription').value
        };

        Photos.add(photo);
        this.closeModal('photoModal');
        this.showToast('Photo ajoutée', 'success');
        this.renderPhotos();
    };

    App.viewPhoto = function (url) {
        const img = document.getElementById('photoViewerImage');
        if (img) img.src = url;
        this.openModal('photoViewerModal');
    };

    // OCR Methods
    App.handleOCR = async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const progress = document.getElementById('ocrProgress');
        const result = document.getElementById('ocrResult');
        const progressFill = document.getElementById('ocrProgressFill');
        const statusText = document.getElementById('ocrStatus');

        if (progress) progress.style.display = 'block';
        if (result) result.style.display = 'none';

        try {
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js non chargé');
            }

            const worker = await Tesseract.createWorker('fra', 1, {
                logger: m => {
                    if (m.progress && progressFill) {
                        progressFill.style.width = (m.progress * 100) + '%';
                        if (statusText) statusText.textContent = m.status || 'Traitement...';
                    }
                }
            });

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            const ocrText = document.getElementById('ocrText');
            if (ocrText) ocrText.textContent = text;
            if (result) result.style.display = 'block';
            this.showToast('Texte extrait avec succès', 'success');

        } catch (error) {
            console.error('OCR Error:', error);
            this.showToast('Erreur OCR: ' + error.message, 'error');
        } finally {
            if (progress) progress.style.display = 'none';
        }
    };

    console.log('✅ Photos UI loaded');
})();
