// ============= Photos Module =============
// Handles photo storage and image compression

const Photos = {
    getAll() {
        return Storage.get(Storage.KEYS.PHOTOS);
    },

    getByType(type) {
        if (!type || type === 'all') return this.getAll();
        return this.getAll().filter(p => p.type === type);
    },

    add(photo) {
        const photos = this.getAll();
        photo.id = 'ph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        photo.createdAt = new Date().toISOString();
        photos.push(photo);
        Storage.set(Storage.KEYS.PHOTOS, photos);
        return photo;
    },

    delete(id) {
        const photos = this.getAll().filter(p => p.id !== id);
        Storage.set(Storage.KEYS.PHOTOS, photos);
    },

    async compressImage(file, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};

// Export global
window.Photos = Photos;
