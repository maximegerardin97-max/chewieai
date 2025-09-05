class DesignCanvas {
    constructor() {
        console.log('DesignCanvas constructor called');
        
        this.canvas = document.getElementById('canvas');
        this.uploadBox = document.getElementById('uploadBox');
        this.fileInput = document.getElementById('fileInput');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        
        console.log('Elements found:', {
            canvas: !!this.canvas,
            uploadBox: !!this.uploadBox,
            fileInput: !!this.fileInput,
            textInput: !!this.textInput,
            sendButton: !!this.sendButton
        });
        
        // Canvas state
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.canvasOffset = { x: 0, y: 0 };
        this.canvasScale = 1;
        
        this.init();
    }
    
    init() {
        console.log('DesignCanvas init called');
        this.setupEventListeners();
        console.log('Event listeners setup complete');
    }
    
    setupEventListeners() {
        // File upload
        this.uploadBox.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        this.uploadBox.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadBox.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadBox.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Canvas dragging
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Canvas zoom
        this.canvas.addEventListener('wheel', (e) => this.handleZoom(e));
        
        // Text input
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Paste functionality
        document.addEventListener('paste', (e) => this.handlePaste(e));
    }
    
    // File handling
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.displayImage(file);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadBox.style.background = '#f0f4ff';
        this.uploadBox.style.border = '2px dashed #007AFF';
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadBox.style.background = 'white';
        this.uploadBox.style.border = 'none';
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadBox.style.background = 'white';
        this.uploadBox.style.border = 'none';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            this.displayImage(file);
        }
    }
    
    displayImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Replace upload box content with image
            this.uploadBox.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" />
            `;
            this.uploadBox.style.cursor = 'default';
        };
        reader.readAsDataURL(file);
    }
    
    // Canvas dragging
    startDrag(e) {
        if (e.target === this.uploadBox || e.target.closest('.upload-box')) {
            return; // Don't drag if clicking on upload box
        }
        
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        
        this.canvasOffset.x += deltaX;
        this.canvasOffset.y += deltaY;
        
        this.updateCanvasTransform();
        
        this.dragStart = { x: e.clientX, y: e.clientY };
    }
    
    endDrag() {
        this.isDragging = false;
        document.body.style.cursor = 'grab';
    }
    
    // Canvas zoom
    handleZoom(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.canvasScale *= delta;
        this.canvasScale = Math.max(0.1, Math.min(3, this.canvasScale));
        
        this.updateCanvasTransform();
    }
    
    updateCanvasTransform() {
        this.canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.canvasScale})`;
    }
    
    // Paste functionality
    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    this.displayImage(file);
                }
                break;
            }
        }
    }
    
    // Message handling
    sendMessage() {
        const message = this.textInput.value.trim();
        if (!message) return;
        
        console.log('Sending message:', message);
        this.textInput.value = '';
        
        // TODO: Implement actual message sending to AI
    }
}

// Initialize the canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    new DesignCanvas();
});
