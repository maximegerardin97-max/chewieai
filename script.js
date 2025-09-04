class ImageCanvas {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.uploadInput = document.getElementById('imageUpload');
        this.clearBtn = document.getElementById('clearBtn');
        this.imageCount = document.getElementById('imageCount');
        this.magneticZone = document.querySelector('.magnetic-zone');
        this.images = [];
        this.draggedElement = null;
        this.resizingElement = null;
        this.offset = { x: 0, y: 0 };
        this.resizeData = { startWidth: 0, startHeight: 0, startX: 0, startY: 0 };
        this.mode = 'move'; // 'move' or 'resize'
        
        // Magnetic zone properties
        this.magneticRadius = 600; // Distance for magnetic attraction (doubled from 150)
        this.snapThreshold = 200; // Distance for snapping (increased from 50)
        this.isMagneticActive = false;
        this.zoneOccupant = null; // Track which image is currently in the zone
        this.isProcessing = false; // Track if image is being processed
        this.zoneOccupant = null; // Track which image is currently in the zone
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateImageCount();
        this.hidePlaceholder();
    }
    
    setupEventListeners() {
        this.uploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.clearBtn.addEventListener('click', () => this.clearAll());
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.startDrag(e));
        this.canvas.addEventListener('touchmove', (e) => this.drag(e));
        this.canvas.addEventListener('touchend', () => this.endDrag());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    handleKeyboard(event) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (this.draggedElement) {
                this.removeImage(this.draggedElement);
            }
        }
    }
    
    handleImageUpload(event) {
        const files = event.target.files;
        let uploadedCount = 0;
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.addImageToCanvas(e.target.result, file.name);
                    uploadedCount++;
                    if (uploadedCount === files.length) {
                        this.showUploadSuccess(uploadedCount);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
        
        // Reset input
        event.target.value = '';
    }
    
    showUploadSuccess(count) {
        // Create a temporary success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        successMsg.innerHTML = `✅ ${count} image${count > 1 ? 's' : ''} uploaded successfully!`;
        
        document.body.appendChild(successMsg);
        
        // Animate in
        setTimeout(() => successMsg.classList.remove('translate-x-full'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successMsg.classList.add('translate-x-full');
            setTimeout(() => successMsg.remove(), 300);
        }, 3000);
    }
    
    addImageToCanvas(src, filename = 'Image') {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container group';
        
        const img = document.createElement('img');
        img.src = src;
        img.className = 'draggable-image';
        img.draggable = false;
        img.alt = filename;
        
        // Wait for image to load to get proper dimensions
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            let containerWidth, containerHeight;
            
            // Set initial size based on aspect ratio
            if (aspectRatio > 1) {
                // Landscape image
                containerWidth = Math.min(300, window.innerWidth * 0.3);
                containerHeight = containerWidth / aspectRatio;
            } else {
                // Portrait image
                containerHeight = Math.min(300, window.innerHeight * 0.3);
                containerWidth = containerHeight * aspectRatio;
            }
            
            // Ensure minimum size
            containerWidth = Math.max(100, containerWidth);
            containerHeight = Math.max(100, containerHeight);
            
            imageContainer.style.width = containerWidth + 'px';
            imageContainer.style.height = containerHeight + 'px';
            
            // Store aspect ratio for future reference
            imageContainer.setAttribute('data-aspect-ratio', aspectRatio);
        };
        
        // Add image info tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute -top-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-40';
        tooltip.textContent = filename;
        
        // Add resize handles
        const resizeHandles = this.createResizeHandles();
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.setAttribute('aria-label', 'Delete image');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.removeImage(imageContainer);
        };
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(tooltip);
        imageContainer.appendChild(deleteBtn);
        resizeHandles.forEach(handle => imageContainer.appendChild(handle));
        
        // Position randomly on canvas with better distribution
        const canvasRect = this.canvas.getBoundingClientRect();
        const padding = 100; // Increased padding for full-screen
        const x = padding + Math.random() * (canvasRect.width - 400);
        const y = padding + Math.random() * (canvasRect.height - 400);
        
        imageContainer.style.left = x + 'px';
        imageContainer.style.top = y + 'px';
        
        this.canvas.appendChild(imageContainer);
        this.images.push(imageContainer);
        
        this.hidePlaceholder();
        this.updateImageCount();
        
        // Add entrance animation
        imageContainer.style.opacity = '0';
        imageContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            imageContainer.style.transition = 'all 0.3s ease-out';
            imageContainer.style.opacity = '1';
            imageContainer.style.transform = 'scale(1)';
        }, 10);
    }
    
    createResizeHandles() {
        const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        return positions.map(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.setAttribute('data-position', pos);
            return handle;
        });
    }
    
    startDrag(event) {
        event.preventDefault();
        
        const target = event.target;
        
        // Check if clicking on a resize handle
        if (target.classList.contains('resize-handle')) {
            this.startResize(event, target);
            return;
        }
        
        // Check if clicking on image container
        const imageContainer = target.closest('.image-container');
        if (!imageContainer) return;
        
        this.startMove(event, imageContainer);
    }
    
    startMove(event, imageContainer) {
        this.mode = 'move';
        this.draggedElement = imageContainer;
        this.draggedElement.classList.add('dragging');
        
        const rect = this.draggedElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        if (event.type === 'mousedown') {
            this.offset.x = event.clientX - rect.left;
            this.offset.y = event.clientY - rect.top;
        } else if (event.type === 'touchstart') {
            this.offset.x = event.touches[0].clientX - rect.left;
            this.offset.y = event.touches[0].clientY - rect.top;
        }
    }
    
    startResize(event, handle) {
        this.mode = 'resize';
        this.resizingElement = handle.closest('.image-container');
        this.resizingElement.classList.add('resizing');
        
        const rect = this.resizingElement.getBoundingClientRect();
        const position = handle.getAttribute('data-position');
        
        this.resizeData.startWidth = rect.width;
        this.resizeData.startHeight = rect.height;
        this.resizeData.startX = event.clientX || event.touches[0].clientX;
        this.resizeData.startY = event.clientY || event.touches[0].clientY;
        this.resizeData.position = position;
    }
    
    drag(event) {
        if (this.mode === 'move' && this.draggedElement) {
            this.handleMove(event);
        } else if (this.mode === 'resize' && this.resizingElement) {
            this.handleResize(event);
        }
    }
    
    handleMove(event) {
        event.preventDefault();
        
        let clientX, clientY;
        if (event.type === 'mousemove') {
            clientX = event.clientX;
            clientY = event.clientY;
        } else if (event.type === 'touchmove') {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const x = clientX - canvasRect.left - this.offset.x;
        const y = clientY - canvasRect.top - this.offset.y;
        
        // Keep image within canvas bounds
        const maxX = canvasRect.width - this.draggedElement.offsetWidth;
        const maxY = canvasRect.height - this.draggedElement.offsetHeight;
        
        let clampedX = Math.max(0, Math.min(x, maxX));
        let clampedY = Math.max(0, Math.min(y, maxY));
        
        // Check magnetic attraction
        const magneticResult = this.checkMagneticAttraction(clampedX, clampedY);
        if (magneticResult.isAttracted) {
            clampedX = magneticResult.x;
            clampedY = magneticResult.y;
            this.draggedElement.classList.add('snapping');
            this.activateMagneticZone();
        } else {
            this.draggedElement.classList.remove('snapping');
            this.deactivateMagneticZone();
        }
        
        this.draggedElement.style.left = clampedX + 'px';
        this.draggedElement.style.top = clampedY + 'px';
    }
    
    checkMagneticAttraction(x, y) {
        if (!this.magneticZone) return { isAttracted: false, x, y };
        
        const zoneRect = this.magneticZone.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate zone center relative to canvas
        const zoneCenterX = zoneRect.left - canvasRect.left + zoneRect.width / 2;
        const zoneCenterY = zoneRect.top - canvasRect.top + zoneRect.height / 2;
        
        // Calculate image center
        const imageCenterX = x + this.draggedElement.offsetWidth / 2;
        const imageCenterY = y + this.draggedElement.offsetHeight / 2;
        
        // Calculate distance between centers
        const distance = Math.sqrt(
            Math.pow(imageCenterX - zoneCenterX, 2) + 
            Math.pow(imageCenterY - zoneCenterY, 2)
        );
        
        if (distance <= this.magneticRadius) {
            // Calculate attraction strength (0 to 1)
            const attractionStrength = 1 - (distance / this.magneticRadius);
            
            if (distance <= this.snapThreshold) {
                // Snap to zone center
                const snappedX = zoneCenterX - this.draggedElement.offsetWidth / 2;
                const snappedY = zoneCenterY - this.draggedElement.offsetHeight / 2;
                
                // Keep within canvas bounds
                const maxX = canvasRect.width - this.draggedElement.offsetWidth;
                const maxY = canvasRect.height - this.draggedElement.offsetHeight;
                
                return {
                    isAttracted: true,
                    x: Math.max(0, Math.min(snappedX, maxX)),
                    y: Math.max(0, Math.min(snappedY, maxY))
                };
            } else {
                // Magnetic attraction (gradual pull)
                const pullX = (zoneCenterX - imageCenterX) * attractionStrength * 0.3;
                const pullY = (zoneCenterY - imageCenterY) * attractionStrength * 0.3;
                
                return {
                    isAttracted: true,
                    x: x + pullX,
                    y: y + pullY
                };
            }
        }
        
        return { isAttracted: false, x, y };
    }
    
    activateMagneticZone() {
        if (!this.isMagneticActive) {
            this.isMagneticActive = true;
            this.magneticZone.querySelector('.magnetic-zone-border').classList.add('magnetic-active');
        }
    }
    
    deactivateMagneticZone() {
        if (this.isMagneticActive) {
            this.isMagneticActive = false;
            this.magneticZone.querySelector('.magnetic-zone-border').classList.remove('magnetic-active');
        }
    }
    
    startProcessing(imageContainer) {
        this.isProcessing = true;
        
        // Enlarge the magnetic zone
        this.magneticZone.classList.add('processing');
        
        // Update zone title to "Rating..."
        const zoneTitle = this.magneticZone.querySelector('.magnetic-zone-content p');
        if (zoneTitle) {
            zoneTitle.textContent = 'Rating...';
        }
        
        // Add loading state to the image
        imageContainer.classList.add('processing');
        
        // Simulate processing time (you can replace this with actual processing logic)
        setTimeout(() => {
            this.completeProcessing(imageContainer);
        }, 10000); // 10 seconds processing time
    }
    
    completeProcessing(imageContainer) {
        this.isProcessing = false;
        
        // Remove processing state from zone
        this.magneticZone.classList.remove('processing');
        
        // Restore zone title to "Rate my designs"
        const zoneTitle = this.magneticZone.querySelector('.magnetic-zone-content p');
        if (zoneTitle) {
            zoneTitle.textContent = 'Rate my designs';
        }
        
        // Remove processing state from image
        imageContainer.classList.remove('processing');
        
        // Add completion state
        imageContainer.classList.add('processed');
        
        // Show completion message briefly
        const completionMsg = document.createElement('div');
        completionMsg.className = 'completion-message';
        completionMsg.innerHTML = '✅ Processing complete!';
        imageContainer.appendChild(completionMsg);
        
        setTimeout(() => {
            completionMsg.remove();
        }, 2000);
    }
    
    ejectImageFromZone(imageContainer) {
        if (!imageContainer) return;
        
        // Remove all zone-related states
        imageContainer.classList.remove('snapped', 'processing', 'processed');
        
        // Remove processing indicator if present
        const indicator = imageContainer.querySelector('.processing-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Remove completion message if present
        const completionMsg = imageContainer.querySelector('.completion-message');
        if (completionMsg) {
            completionMsg.remove();
        }
        
        // Calculate a good position outside the zone
        const canvasRect = this.canvas.getBoundingClientRect();
        const zoneRect = this.magneticZone.getBoundingClientRect();
        
        // Find available space around the zone
        let newX, newY;
        const attempts = [
            // Try positions around the zone
            { x: zoneRect.right - canvasRect.left + 50, y: zoneRect.top - canvasRect.top },
            { x: zoneRect.left - canvasRect.left - imageContainer.offsetWidth - 50, y: zoneRect.top - canvasRect.top },
            { x: zoneRect.left - canvasRect.left, y: zoneRect.bottom - canvasRect.top + 50 },
            { x: zoneRect.left - canvasRect.left, y: zoneRect.top - canvasRect.top - imageContainer.offsetHeight - 50 }
        ];
        
        // Find the first available position
        for (let attempt of attempts) {
            if (attempt.x >= 0 && attempt.x + imageContainer.offsetWidth <= canvasRect.width &&
                attempt.y >= 0 && attempt.y + imageContainer.offsetHeight <= canvasRect.height) {
                newX = attempt.x;
                newY = attempt.y;
                break;
            }
        }
        
        // If no good position found, use random positioning
        if (newX === undefined || newY === undefined) {
            const padding = 100;
            newX = padding + Math.random() * (canvasRect.width - imageContainer.offsetWidth - 200);
            newY = padding + Math.random() * (canvasRect.height - imageContainer.offsetHeight - 200);
        }
        
        // Reset to original size
        const aspectRatio = parseFloat(imageContainer.getAttribute('data-aspect-ratio')) || 1;
        let containerWidth, containerHeight;
        
        if (aspectRatio > 1) {
            containerWidth = Math.min(300, window.innerWidth * 0.3);
            containerHeight = containerWidth / aspectRatio;
        } else {
            containerHeight = Math.min(300, window.innerHeight * 0.3);
            containerWidth = containerHeight * aspectRatio;
        }
        
        containerWidth = Math.max(100, containerWidth);
        containerHeight = Math.max(100, containerHeight);
        
        // Animate the ejection
        imageContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        imageContainer.style.width = containerWidth + 'px';
        imageContainer.style.height = containerHeight + 'px';
        imageContainer.style.left = newX + 'px';
        imageContainer.style.top = newY + 'px';
        
        // Remove transition after animation
        setTimeout(() => {
            imageContainer.style.transition = '';
        }, 400);
        
        // Clear zone occupant reference
        if (this.zoneOccupant === imageContainer) {
            this.zoneOccupant = null;
        }
    }
    
    snapImageToZone(imageContainer) {
        if (!this.magneticZone) return;
        
        // If there's already an image in the zone, eject it first
        if (this.zoneOccupant && this.zoneOccupant !== imageContainer) {
            this.ejectImageFromZone(this.zoneOccupant);
        }
        
        const zoneRect = this.magneticZone.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate zone center relative to canvas
        const zoneCenterX = zoneRect.left - canvasRect.left + zoneRect.width / 2;
        const zoneCenterY = zoneRect.top - canvasRect.top + zoneRect.height / 2;
        
        // Calculate zone dimensions
        const zoneWidth = zoneRect.width;
        const zoneHeight = zoneRect.height;
        
        // Get image aspect ratio
        const aspectRatio = parseFloat(imageContainer.getAttribute('data-aspect-ratio')) || 1;
        
        // Calculate new dimensions to fit inside zone while maintaining aspect ratio
        let newWidth, newHeight;
        
        if (aspectRatio > 1) {
            // Landscape image
            newWidth = Math.min(zoneWidth * 0.9, zoneHeight * 0.9 * aspectRatio);
            newHeight = newWidth / aspectRatio;
        } else {
            // Portrait image
            newHeight = Math.min(zoneHeight * 0.9, zoneWidth * 0.9 / aspectRatio);
            newWidth = newHeight * aspectRatio;
        }
        
        // Ensure minimum size
        newWidth = Math.max(100, newWidth);
        newHeight = Math.max(100, newHeight);
        
        // Calculate position to center in zone
        const newX = zoneCenterX - newWidth / 2;
        const newY = zoneCenterY - newHeight / 2;
        
        // Keep within canvas bounds
        const maxX = canvasRect.width - newWidth;
        const maxY = canvasRect.height - newHeight;
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        // Apply new dimensions and position with smooth animation
        imageContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        imageContainer.style.width = newWidth + 'px';
        imageContainer.style.height = newHeight + 'px';
        imageContainer.style.left = clampedX + 'px';
        imageContainer.style.top = clampedY + 'px';
        
        // Add snapped state and set as zone occupant
        imageContainer.classList.add('snapped');
        this.zoneOccupant = imageContainer;
        
        // Remove transition after animation completes
        setTimeout(() => {
            imageContainer.style.transition = '';
            
            // Start processing the image
            this.startProcessing(imageContainer);
        }, 400);
    }
    
    handleResize(event) {
        event.preventDefault();
        
        let clientX, clientY;
        if (event.type === 'mousemove') {
            clientX = event.clientX;
            clientY = event.clientY;
        } else if (event.type === 'touchmove') {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        
        const deltaX = clientX - this.resizeData.startX;
        const deltaY = clientY - this.resizeData.startY;
        const position = this.resizeData.position;
        
        let newWidth = this.resizeData.startWidth;
        let newHeight = this.resizeData.startHeight;
        let newLeft = parseFloat(this.resizingElement.style.left) || 0;
        let newTop = parseFloat(this.resizingElement.style.top) || 0;
        
        // Get aspect ratio constraint
        const aspectRatio = parseFloat(this.resizingElement.getAttribute('data-aspect-ratio')) || 1;
        const maintainAspectRatio = event.shiftKey; // Hold Shift to maintain aspect ratio
        
        // Calculate new dimensions based on resize handle position
        switch (position) {
            case 'se':
                newWidth = Math.max(50, this.resizeData.startWidth + deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = Math.max(50, this.resizeData.startHeight + deltaY);
                }
                break;
            case 'sw':
                newWidth = Math.max(50, this.resizeData.startWidth - deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = Math.max(50, this.resizeData.startHeight + deltaY);
                }
                newLeft = parseFloat(this.resizingElement.style.left) + this.resizeData.startWidth - newWidth;
                break;
            case 'ne':
                newWidth = Math.max(50, this.resizeData.startWidth + deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = Math.max(50, this.resizeData.startHeight - deltaY);
                }
                newTop = parseFloat(this.resizingElement.style.top) + this.resizeData.startHeight - newHeight;
                break;
            case 'nw':
                newWidth = Math.max(50, this.resizeData.startWidth - deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = Math.max(50, this.resizeData.startHeight - deltaY);
                }
                newLeft = parseFloat(this.resizingElement.style.left) + this.resizeData.startWidth - newWidth;
                newTop = parseFloat(this.resizingElement.style.top) + this.resizeData.startHeight - newHeight;
                break;
            case 'n':
                newHeight = Math.max(50, this.resizeData.startHeight - deltaY);
                if (maintainAspectRatio) {
                    newWidth = newHeight * aspectRatio;
                    newLeft = parseFloat(this.resizingElement.style.left) + this.resizeData.startWidth - newWidth;
                }
                newTop = parseFloat(this.resizingElement.style.top) + this.resizeData.startHeight - newHeight;
                break;
            case 's':
                newHeight = Math.max(50, this.resizeData.startHeight + deltaY);
                if (maintainAspectRatio) {
                    newWidth = newHeight * aspectRatio;
                }
                break;
            case 'w':
                newWidth = Math.max(50, this.resizeData.startWidth - deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                    newTop = parseFloat(this.resizingElement.style.top) + this.resizeData.startHeight - newHeight;
                }
                newLeft = parseFloat(this.resizingElement.style.left) + this.resizeData.startWidth - newWidth;
                break;
            case 'e':
                newWidth = Math.max(50, this.resizeData.startWidth + deltaX);
                if (maintainAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                }
                break;
        }
        
        // Apply new dimensions
        this.resizingElement.style.width = newWidth + 'px';
        this.resizingElement.style.height = newHeight + 'px';
        this.resizingElement.style.left = newLeft + 'px';
        this.resizingElement.style.top = newTop + 'px';
    }
    
    endDrag() {
        if (this.mode === 'move' && this.draggedElement) {
            // Check if image should snap to zone
            const zoneRect = this.magneticZone.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            const imageRect = this.draggedElement.getBoundingClientRect();
            
            // Calculate zone center relative to canvas
            const zoneCenterX = zoneRect.left - canvasRect.left + zoneRect.width / 2;
            const zoneCenterY = zoneRect.top - canvasRect.top + zoneRect.height / 2;
            
            // Calculate image center
            const imageCenterX = imageRect.left - canvasRect.left + imageRect.width / 2;
            const imageCenterY = imageRect.top - canvasRect.top + imageRect.height / 2;
            
            // Calculate distance between centers
            const distance = Math.sqrt(
                Math.pow(imageCenterX - zoneCenterX, 2) + 
                Math.pow(imageCenterY - zoneCenterY, 2)
            );
            
            // If image is close enough to zone, snap it
            if (distance <= this.snapThreshold) {
                this.snapImageToZone(this.draggedElement);
            }
            
            this.draggedElement.classList.remove('dragging', 'snapping');
            this.draggedElement = null;
            this.deactivateMagneticZone();
        } else if (this.mode === 'resize' && this.resizingElement) {
            this.resizingElement.classList.remove('resizing');
            this.resizingElement = null;
        }
        
        this.mode = 'move';
    }
    
    removeImage(container) {
        // If this image is in the zone, clear the occupant reference
        if (this.zoneOccupant === container) {
            this.zoneOccupant = null;
        }
        
        // Add removal animation
        container.style.transition = 'all 0.3s ease-in';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            const index = this.images.indexOf(container);
            if (index > -1) {
                this.images.splice(index, 1);
            }
            container.remove();
            this.updateImageCount();
            
            if (this.images.length === 0) {
                this.showPlaceholder();
            }
        }, 300);
    }
    
    clearAll() {
        if (this.images.length === 0) return;
        
        // Add confirmation for clear all
        if (!confirm(`Are you sure you want to remove all ${this.images.length} images?`)) {
            return;
        }
        
        // Clear zone occupant reference
        this.zoneOccupant = null;
        
        this.images.forEach(container => {
            container.style.transition = 'all 0.2s ease-in';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.8)';
        });
        
        setTimeout(() => {
            this.images.forEach(container => container.remove());
            this.images = [];
            this.updateImageCount();
            this.showPlaceholder();
        }, 200);
    }
    
    updateImageCount() {
        const count = this.images.length;
        this.imageCount.textContent = `${count} image${count !== 1 ? 's' : ''}`;
        
        // Update clear button state
        this.clearBtn.disabled = count === 0;
        if (count === 0) {
            this.clearBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            this.clearBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    hidePlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }
    
    showPlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
}

// Initialize the canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageCanvas();
});
