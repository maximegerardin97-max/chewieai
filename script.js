// Figma-Style Design Canvas with AI Assistant
class DesignCanvasApp {
    constructor() {
        this.supabaseUrl = 'https://iiolvvdnzrfcffudwocp.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2x2dmRuenJmY2ZmdWR3b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTIxNzQsImV4cCI6MjA3MTE4ODE3NH0.zm_bLL3lu2hXKqZdIHzH-bIgVwd1cM1jb7Cju92sl6E';
        this.dustApiKey = 'sk-37ea9e8618f6b15576f39a147698277e';
        this.dustWorkspaceId = 'tcYbszCY4S';
        this.conversationId = null;
        this.designContainers = [];
        this.isProcessing = false;
        this.currentImageData = null;
        this.currentImageFilename = null;
        this.canvasOffset = { x: 0, y: 0 };
        this.canvasScale = 1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadConfiguration();
        this.addWelcomeMessage();
    }
    
    setupEventListeners() {
        // File upload
        const imageUpload = document.getElementById('imageUpload');
        const dropZone = document.getElementById('designDropZone');
        
        imageUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drop zone events
        dropZone.addEventListener('click', () => imageUpload.click());
        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Chat input
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Chat input focus to expand messages
        chatInput.addEventListener('focus', () => this.expandChatMessages());
        chatInput.addEventListener('blur', () => this.collapseChatMessages());
        
        // Canvas events - listen on document for true infinite canvas
        document.addEventListener('mousedown', (e) => this.startCanvasDrag(e));
        document.addEventListener('mousemove', (e) => this.dragCanvas(e));
        document.addEventListener('mouseup', () => this.endCanvasDrag());
        document.addEventListener('wheel', (e) => this.handleCanvasZoom(e));
        
        // Paste functionality
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Prevent context menu on canvas
        const canvasContainer = document.getElementById('canvasContainer');
        canvasContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    addWelcomeMessage() {
        // No welcome message for clean UX
    }
    
    expandChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.classList.add('expanded');
    }
    
    collapseChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.classList.remove('expanded');
    }
    
    // Canvas functionality - Figma-like interactions
    startCanvasDrag(e) {
        // Don't drag if clicking on interactive elements
        if (e.target.closest('.design-container') || 
            e.target.closest('.generated-designs-container') ||
            e.target.closest('.chat-interface') ||
            e.target.tagName === 'IMG' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'BUTTON') {
            return;
        }
        
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
        
        // Add visual feedback
        const canvasContainer = document.getElementById('canvasContainer');
        canvasContainer.style.filter = 'brightness(0.98)';
        
        e.preventDefault();
    }
    
    dragCanvas(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        
        this.canvasOffset.x += deltaX;
        this.canvasOffset.y += deltaY;
        
        this.updateCanvasTransform();
        
        this.dragStart = { x: e.clientX, y: e.clientY };
    }
    
    endCanvasDrag() {
        this.isDragging = false;
        document.body.style.cursor = 'grab';
        
        // Remove visual feedback
        const canvasContainer = document.getElementById('canvasContainer');
        canvasContainer.style.filter = 'none';
    }
    
    handleCanvasZoom(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.canvasScale *= delta;
        this.canvasScale = Math.max(0.1, Math.min(3, this.canvasScale)); // Limit zoom range
        
        this.updateCanvasTransform();
    }
    
    updateCanvasTransform() {
        const canvasContainer = document.getElementById('canvasContainer');
        // Apply transform to the canvas container itself, but exclude the chat interface
        const canvasContent = canvasContainer.querySelector('.canvas-content');
        if (canvasContent) {
            canvasContent.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.canvasScale})`;
            canvasContent.style.transition = this.isDragging ? 'none' : 'transform 0.1s ease';
        }
    }
    
    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // Get mouse position relative to canvas
                    const canvasContainer = document.getElementById('canvasContainer');
                    const rect = canvasContainer.getBoundingClientRect();
                    const x = (e.clientX - rect.left - this.canvasOffset.x) / this.canvasScale;
                    const y = (e.clientY - rect.top - this.canvasOffset.y) / this.canvasScale;
                    
                    this.createImageAtPosition(file, x, y);
                }
                break;
            }
        }
    }
    
    createImageAtPosition(file, x, y) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.position = 'absolute';
            img.style.left = x + 'px';
            img.style.top = y + 'px';
            img.style.maxWidth = '200px';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '8px';
            img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            img.style.cursor = 'move';
            img.style.zIndex = '10';
            
            // Make image draggable
            this.makeImageDraggable(img);
            
            const canvasContent = document.querySelector('.canvas-content');
            canvasContent.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
    
    makeImageDraggable(img) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let startPosition = { x: 0, y: 0 };
        
        img.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = img.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            // Store initial position
            startPosition.x = parseFloat(img.style.left) || 0;
            startPosition.y = parseFloat(img.style.top) || 0;
            
            img.style.cursor = 'grabbing';
            img.style.zIndex = '20'; // Bring to front when dragging
            e.stopPropagation();
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const canvasContainer = document.getElementById('canvasContainer');
            const rect = canvasContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.canvasOffset.x) / this.canvasScale - dragOffset.x;
            const y = (e.clientY - rect.top - this.canvasOffset.y) / this.canvasScale - dragOffset.y;
            
            img.style.left = x + 'px';
            img.style.top = y + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'move';
                img.style.zIndex = '10'; // Reset z-index
            }
        });
        
        // Add hover effect
        img.addEventListener('mouseenter', () => {
            if (!isDragging) {
                img.style.cursor = 'move';
                img.style.transform = 'scale(1.02)';
                img.style.transition = 'transform 0.2s ease';
            }
        });
        
        img.addEventListener('mouseleave', () => {
            if (!isDragging) {
                img.style.transform = 'scale(1)';
            }
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        this.processFiles(files);
    }
    
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFile(files[0]); // Only handle first file for clean UX
        }
        e.target.value = ''; // Reset input
    }
    
    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImageInContainer(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    }
    
    displayImageInContainer(imageDataUrl, filename) {
        const dropZone = document.getElementById('designDropZone');
        const dropZoneContent = dropZone.querySelector('.drop-zone-content');
        
        // Clear existing content
        dropZoneContent.innerHTML = '';
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.className = 'design-image';
        img.alt = filename;
        
        // Add to drop zone
        dropZoneContent.appendChild(img);
        dropZone.classList.add('has-image');
        
        // Store the image data for later use
        this.currentImageData = imageDataUrl;
        this.currentImageFilename = filename;
    }
    
    processFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showError('Please select image files only.');
            return;
        }
        
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addImageToCanvas(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        });
    }
    
    addImageToCanvas(imageDataUrl, filename) {
        const canvasContent = document.querySelector('.canvas-content');
        
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.style.position = 'absolute';
        img.style.left = '100px';
        img.style.top = '100px';
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        img.style.cursor = 'move';
        img.style.zIndex = '10';
        
        // Make image draggable
        this.makeImageDraggable(img);
        
        canvasContent.appendChild(img);
    }
    
    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        if (this.isProcessing) {
            return;
        }
        
        // Clear input
        chatInput.value = '';
        
        // Add user message to chat
        this.addUserMessage(message);
        
        // Expand chat messages to show conversation
        this.expandChatMessages();
        
        // Check if we have an image and the message is a trigger
        if (this.currentImageData && this.isTriggerMessage(message)) {
            // Show typing indicator
            this.showTypingIndicator();
            
            try {
                this.isProcessing = true;
                
                // Create a temporary container for the current image
                const tempContainer = {
                    id: 'temp-' + Date.now(),
                    imageDataUrl: this.currentImageData,
                    filename: this.currentImageFilename
                };
                
                // Analyze the design with the user's message
                const result = await this.analyzeDesign(tempContainer, message);
                
                // Remove typing indicator
                this.removeTypingIndicator();
                
                // Add assistant response
                this.addAssistantMessage(result.responseText);
                
                // If there's a generated image, show it
                if (result.fullResult.data && result.fullResult.data.fileId) {
                    await this.showGeneratedImage(result.fullResult.data.fileId);
                }
                
            } catch (error) {
                this.removeTypingIndicator();
                this.addAssistantMessage('Sorry, I encountered an error. Please try again.');
                console.error('Error:', error);
            } finally {
                this.isProcessing = false;
            }
        } else if (!this.currentImageData) {
            // No image uploaded
            this.addAssistantMessage('Please upload a design first, then ask me to rate it or suggest improvements.');
        } else {
            // Image uploaded but not a trigger message
            this.addAssistantMessage('Try asking me to "rate this screen" or "how can I make this screen better?"');
        }
    }
    
    isTriggerMessage(message) {
        const triggers = [
            'rate this screen',
            'rate this design',
            'how can i make this screen better',
            'how can i make this design better',
            'improve this design',
            'improve this screen',
            'what do you think',
            'analyze this design',
            'analyze this screen'
        ];
        
        const lowerMessage = message.toLowerCase();
        return triggers.some(trigger => lowerMessage.includes(trigger));
    }
    
    async showGeneratedImage(fileId) {
        try {
            // Show generated designs container
            const generatedContainer = document.getElementById('generatedDesignsContainer');
            generatedContainer.classList.remove('hidden');
            
            // Download and display the generated image
            const imageUrl = await this.downloadGeneratedImage(fileId);
            
            const generatedDesigns = document.getElementById('generatedDesigns');
            const designItem = document.createElement('div');
            designItem.className = 'generated-design-item';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'generated-design-image';
            img.alt = 'Generated Design';
            
            const actions = document.createElement('div');
            actions.className = 'generated-design-actions';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-primary';
            downloadBtn.textContent = 'Download';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = 'generated-design.png';
                a.click();
            };
            
            actions.appendChild(downloadBtn);
            designItem.appendChild(img);
            designItem.appendChild(actions);
            generatedDesigns.appendChild(designItem);
            
        } catch (error) {
            console.error('Error showing generated image:', error);
            this.addAssistantMessage('I generated an improved design, but there was an issue displaying it. Please try again.');
        }
    }
    
    async analyzeDesign(container, message) {
        console.log('🎨 Starting design analysis...');
        
        try {
            const response = await fetch(`${this.supabaseUrl}/functions/v1/design-brain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'analyze',
                    content: message,
                    imageUrl: container.imageDataUrl,
                    username: 'web-user',
                    timezone: 'UTC'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Design analysis complete:', result);
            
            if (!result.ok) {
                throw new Error(result.error?.hint || 'Analysis failed');
            }
            
            return {
                responseText: result.data?.text || 'Analysis complete',
                fullResult: result
            };
            
        } catch (error) {
            console.error('❌ Design analysis failed:', error);
            throw error;
        }
    }
    
    async downloadGeneratedImage(fileId) {
        try {
            console.log('📥 Downloading generated image:', fileId);
            
            const response = await fetch(`${this.supabaseUrl}/functions/v1/download-dust-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId: fileId
                })
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            // Your edge function returns the file directly as a blob
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            return imageUrl;
            
        } catch (error) {
            console.error('❌ Download failed:', error);
            throw error;
        }
    }
    
    createMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        return messageDiv;
    }
    
    addUserMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const message = this.createMessage('user', content);
        chatMessages.appendChild(message);
        this.scrollToBottom();
    }
    
    addAssistantMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const message = this.createMessage('assistant', content);
        chatMessages.appendChild(message);
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        // Expand chat messages when typing
        this.expandChatMessages();
        
        const chatMessages = document.getElementById('chatMessages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = 'AI is thinking...';
        
        typingDiv.appendChild(contentDiv);
        chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showError(message) {
        console.error(message);
        // You could add a toast notification here
    }
    
    loadConfiguration() {
        // Load any saved configuration
        console.log('Configuration loaded');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DesignCanvasApp();
});
