// Simple Design Rating App
class DesignRatingApp {
    constructor() {
        this.supabaseUrl = 'https://iiolvvdnzrfcffudwocp.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2x2dmRuenJmY2ZmdWR3b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTIxNzQsImV4cCI6MjA3MTE4ODE3NH0.zm_bLL3lu2hXKqZdIHzH-bIgVwd1cM1jb7Cju92sl6E';
        this.uploadedImages = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // File upload
        const imageUpload = document.getElementById('imageUpload');
        const uploadZone = document.getElementById('uploadZone');
        
        imageUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Upload zone events
        uploadZone.addEventListener('click', () => imageUpload.click());
        uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        
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
        
        // Paste functionality
        document.addEventListener('paste', (e) => this.handlePaste(e));
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
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
    }
    
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
        e.target.value = ''; // Reset input
    }
    
    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    this.processFiles([file]);
                }
                break;
            }
        }
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
                this.addImage(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        });
    }
    
    addImage(imageDataUrl, filename) {
        const imageId = Date.now() + Math.random();
        const imageData = { id: imageId, url: imageDataUrl, filename };
        
        this.uploadedImages.push(imageData);
        this.updateUploadDisplay();
    }
    
    removeImage(imageId) {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        this.updateUploadDisplay();
    }
    
    updateUploadDisplay() {
        const uploadContent = document.getElementById('uploadContent');
        const imagesGrid = document.getElementById('imagesGrid');
        
        if (this.uploadedImages.length === 0) {
            // Show upload prompt
            uploadContent.classList.remove('hidden');
            imagesGrid.classList.add('hidden');
        } else {
            // Show images grid
            uploadContent.classList.add('hidden');
            imagesGrid.classList.remove('hidden');
            
            // Clear and rebuild grid
            imagesGrid.innerHTML = '';
            
            // Add existing images
            this.uploadedImages.forEach(imageData => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                
                const img = document.createElement('img');
                img.src = imageData.url;
                img.alt = imageData.filename;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => this.removeImage(imageData.id);
                
                imageItem.appendChild(img);
                imageItem.appendChild(removeBtn);
                imagesGrid.appendChild(imageItem);
            });
            
            // Add "add more" button
            const addMoreBtn = document.createElement('div');
            addMoreBtn.className = 'add-more-btn';
            addMoreBtn.innerHTML = '<div class="plus-icon">+</div><p>Add more</p>';
            addMoreBtn.onclick = () => document.getElementById('imageUpload').click();
            imagesGrid.appendChild(addMoreBtn);
        }
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
        
        if (this.uploadedImages.length === 0) {
            this.showFeedback('Please upload at least one image first.');
            return;
        }
        
        // Clear input
        chatInput.value = '';
        
        // Show processing state
        this.showFeedback('AI is analyzing your design...');
        this.showFeedbackCard();
        this.isProcessing = true;
        
        try {
            // For now, analyze the first image
            const firstImage = this.uploadedImages[0];
            const result = await this.analyzeDesign(message, firstImage.url);
            this.showFeedback(result);
        } catch (error) {
            console.error('Error:', error);
            this.showFeedback('Sorry, I encountered an error. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    }
    
    async analyzeDesign(message, imageUrl) {
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
                    imageUrl: imageUrl,
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
            
            return result.data?.text || 'Analysis complete';
            
        } catch (error) {
            console.error('❌ Design analysis failed:', error);
            throw error;
        }
    }
    
    showFeedbackCard() {
        const feedbackCard = document.getElementById('feedbackCard');
        feedbackCard.classList.add('visible');
    }
    
    showFeedback(text) {
        const feedbackContent = document.getElementById('feedbackContent');
        feedbackContent.innerHTML = `<div class="feedback-text">${text}</div>`;
    }
    
    showError(message) {
        console.error(message);
        this.showFeedback(`Error: ${message}`);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DesignRatingApp();
});