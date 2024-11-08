Vue.createApp({
    data() {
        return {
            images: [],
            zoomLevel: 100,
            mergedPreview: null,
            isVertical: true,
        };
    },
    computed: {
        imageWidth() {
            const baseWidth = this.isVertical ? 1000 : 300;
            return `${baseWidth * (this.zoomLevel / 100)}px`;
        },
        imageHeight() {
            return `${640 * (this.zoomLevel / 100)}px`;
        },
        containerStyle() {
            if (this.isVertical) {
                return {
                    display: 'block',
                    width: this.imageWidth,
                    overflowX: 'hidden',
                    overflowY: 'hidden'
                };
            } else {
                return {
                    display: 'block',
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden'
                };
            }
        }
    },
    methods: {
        handleUpload(event) {
            const files = Array.from(event.target.files);
            files.sort((a, b) => a.name.localeCompare(b.name));
            
            const loadImage = (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({
                            src: e.target.result,
                            showLine: false,
                            lineY: 0,
                            name: file.name
                        });
                    };
                    reader.readAsDataURL(file);
                });
            };

            Promise.all(files.map(file => loadImage(file)))
                .then(sortedImages => {
                    this.images = sortedImages;
                });
        },
        showCutLine(event, index) {
            const rect = event.target.getBoundingClientRect();
            this.images[index].showLine = true;
            if (this.isVertical) {
                const offsetY = event.clientY - rect.top;
                this.images[index].lineY = offsetY;
                this.images[index].lineX = null;
            } else {
                const offsetX = event.clientX - rect.left;
                this.images[index].lineX = offsetX;
                this.images[index].lineY = null;
            }
        },
        hideCutLine(index) {
            setTimeout(() => {
                this.images[index].showLine = false;
            }, 50);
        },
        splitImage(index, event) {
            const imgToSplit = this.images[index];
            const imageElement = new Image();
            imageElement.src = imgToSplit.src;

            imageElement.onload = () => {
                const rect = event.target.getBoundingClientRect();
                let splitPosition;
                
                if (this.isVertical) {
                    const clickY = event.clientY - rect.top;
                    const actualClickY = (clickY / rect.height) * imageElement.height;
                    splitPosition = actualClickY / imageElement.height;
                } else {
                    const clickX = event.clientX - rect.left;
                    const actualClickX = (clickX / rect.width) * imageElement.width;
                    splitPosition = actualClickX / imageElement.width;
                }

                const canvas1 = document.createElement('canvas');
                const canvas2 = document.createElement('canvas');
                const context1 = canvas1.getContext('2d');
                const context2 = canvas2.getContext('2d');

                const width = imageElement.width;
                const height = imageElement.height;

                if (this.isVertical) {
                    const splitHeight = Math.floor(height * splitPosition);
                    canvas1.width = width;
                    canvas1.height = splitHeight;
                    canvas2.width = width;
                    canvas2.height = height - splitHeight;

                    context1.drawImage(imageElement, 0, 0, width, splitHeight, 0, 0, width, splitHeight);
                    context2.drawImage(imageElement, 0, splitHeight, width, height - splitHeight, 0, 0, width, height - splitHeight);
                } else {
                    const splitWidth = Math.floor(width * splitPosition);
                    canvas1.width = splitWidth;
                    canvas1.height = height;
                    canvas2.width = width - splitWidth;
                    canvas2.height = height;

                    context1.drawImage(imageElement, 0, 0, splitWidth, height, 0, 0, splitWidth, height);
                    context2.drawImage(imageElement, splitWidth, 0, width - splitWidth, height, 0, 0, width - splitWidth, height);
                }

                this.images.splice(index, 1,
                    { 
                        src: canvas1.toDataURL('image/png'), 
                        showLine: false, 
                        lineY: 0,
                        lineX: 0 
                    },
                    { 
                        src: canvas2.toDataURL('image/png'), 
                        showLine: false, 
                        lineY: 0,
                        lineX: 0 
                    }
                );
            };
        },
        deleteImage(index) {
            this.images.splice(index, 1);
        },
        moveUp(index) {
            if (index > 0) {
                const temp = this.images[index];
                this.images.splice(index, 1);
                this.images.splice(index - 1, 0, temp);
            }
        },
        moveDown(index) {
            if (index < this.images.length - 1) {
                const temp = this.images[index];
                this.images.splice(index, 1);
                this.images.splice(index + 1, 0, temp);
            }
        },
        exportMergedImage() {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const imagePromises = this.images.map(img => new Promise(resolve => {
                const image = new Image();
                image.src = img.src;
                image.onload = () => resolve(image);
            }));

            Promise.all(imagePromises).then(loadedImages => {
                if (this.isVertical) {
                    const maxWidth = Math.max(...loadedImages.map(img => img.width));
                    const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0);
                    canvas.width = maxWidth;
                    canvas.height = totalHeight;

                    let currentHeight = 0;
                    loadedImages.forEach(img => {
                        context.drawImage(img, 0, currentHeight, img.width, img.height);
                        currentHeight += img.height;
                    });
                } else {
                    const maxHeight = Math.max(...loadedImages.map(img => img.height));
                    const totalWidth = loadedImages.reduce((sum, img) => sum + img.width, 0);
                    canvas.width = totalWidth;
                    canvas.height = maxHeight;

                    let currentWidth = 0;
                    loadedImages.forEach(img => {
                        context.drawImage(img, currentWidth, 0, img.width, img.height);
                        currentWidth += img.width;
                    });
                }

                canvas.toBlob(blob => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'merged_image.png';
                    link.click();
                });
            });
        },
        exportSeparateImages() {
            this.images.forEach((img, index) => {
                const link = document.createElement('a');
                link.href = img.src;
                link.download = `image_${index + 1}.png`;
                link.click();
            });
        },
        decreaseZoom() {
            if (this.zoomLevel > 10) {
                this.zoomLevel -= 10;
                this.$forceUpdate();
            }
        },
        increaseZoom() {
            if (this.zoomLevel < 200) {
                this.zoomLevel += 10;
                this.$forceUpdate();
            }
        },
        mergeImages() {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const imagePromises = this.images.map(img => new Promise(resolve => {
                const image = new Image();
                image.src = img.src;
                image.onload = () => resolve(image);
            }));

            Promise.all(imagePromises).then(loadedImages => {
                if (this.isVertical) {
                    const maxWidth = Math.max(...loadedImages.map(img => img.width));
                    const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0);
                    canvas.width = maxWidth;
                    canvas.height = totalHeight;

                    let currentHeight = 0;
                    loadedImages.forEach(img => {
                        context.drawImage(img, 0, currentHeight, img.width, img.height);
                        currentHeight += img.height;
                    });
                } else {
                    const maxHeight = Math.max(...loadedImages.map(img => img.height));
                    const totalWidth = loadedImages.reduce((sum, img) => sum + img.width, 0);
                    canvas.width = totalWidth;
                    canvas.height = maxHeight;

                    let currentWidth = 0;
                    loadedImages.forEach(img => {
                        context.drawImage(img, currentWidth, 0, img.width, img.height);
                        currentWidth += img.width;
                    });
                }

                this.images = [{
                    src: canvas.toDataURL('image/png'),
                    showLine: false,
                    lineY: 0
                }];
            });
        },
        toggleDirection() {
            this.isVertical = !this.isVertical;
        },
    }
}).mount('#app');