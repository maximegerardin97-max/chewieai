// Simple Design Rating App
class DesignRatingApp {
    constructor() {
        this.supabaseUrl = 'https://iiolvvdnzrfcffudwocp.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2x2dmRuenJmY2ZmdWR3b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTIxNzQsImV4cCI6MjA3MTE4ODE3NH0.zm_bLL3lu2hXKqZdIHzH-bIgVwd1cM1jb7Cju92sl6E';
        this.uploadedImages = [];
        this.isProcessing = false;
        this.currentCardId = 1;
        this.cardData = new Map(); // Store data for each card
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeCard(1); // Initialize the first card
    }
    
    initializeCard(cardId) {
        this.cardData.set(cardId, {
            uploadedImages: [],
            isProcessing: false
        });
    }
    
    createNewCard() {
        this.currentCardId++;
        const cardId = this.currentCardId;
        
        const cardHTML = `
            <div class="upload-card" id="card-${cardId}">
                <div class="card-header">
                    <h2 class="card-title">Rate my designs</h2>
                </div>
                <div class="upload-content-container">
                    <div class="upload-zone" id="uploadZone-${cardId}">
                        <input type="file" id="imageUpload-${cardId}" accept="image/*" multiple class="hidden">
                        <div class="upload-content" id="uploadContent-${cardId}">
                            <div class="plus-icon">+</div>
                        </div>
                        <div class="images-grid hidden" id="imagesGrid-${cardId}"></div>
                    </div>
                    <div class="results-container hidden" id="resultsContainer-${cardId}">
                        <div class="results-content" id="resultsContent-${cardId}">
                            <div class="placeholder-text">Upload a design to get AI feedback</div>
                        </div>
                    </div>
                </div>
                <div class="analyze-button-container hidden" id="analyzeButtonContainer-${cardId}">
                    <button class="analyze-btn" id="analyzeBtn-${cardId}">Analyze</button>
                </div>
            </div>
        `;
        
        const uploadCardsStack = document.getElementById('uploadCardsStack');
        uploadCardsStack.insertAdjacentHTML('afterbegin', cardHTML);
        
        this.initializeCard(cardId);
        this.attachCardEventListeners(cardId);
        
        return cardId;
    }
    
    attachCardEventListeners(cardId) {
        const imageUpload = document.getElementById(`imageUpload-${cardId}`);
        const uploadZone = document.getElementById(`uploadZone-${cardId}`);
        const analyzeBtn = document.getElementById(`analyzeBtn-${cardId}`);
        
        imageUpload.addEventListener('change', (e) => this.handleFileUpload(e, cardId));
        uploadZone.addEventListener('click', () => imageUpload.click());
        uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadZone.addEventListener('drop', (e) => this.handleDrop(e, cardId));
        analyzeBtn.addEventListener('click', () => this.analyzeImages(cardId));
    }
    
    setupEventListeners() {
        // Attach listeners to the first card
        this.attachCardEventListeners(1);
        
        // Chat input (global)
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Paste functionality (global)
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
    
    handleDrop(e, cardId) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.processFiles(files, cardId);
        }
    }
    
    handleFileUpload(e, cardId) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files, cardId);
        }
        e.target.value = ''; // Reset input
    }
    
    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // Find the most recent card for paste
                    const mostRecentCardId = this.currentCardId;
                    this.processFiles([file], mostRecentCardId);
                }
                break;
            }
        }
    }
    
    processFiles(files, cardId) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showError('Please select image files only.', cardId);
            return;
        }
        
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addImage(e.target.result, file.name, cardId);
            };
            reader.readAsDataURL(file);
        });
    }
    
    addImage(imageDataUrl, filename, cardId) {
        const cardData = this.cardData.get(cardId);
        
        // Check if we've reached the limit of 3 images
        if (cardData.uploadedImages.length >= 3) {
            this.showError('Maximum of 3 images allowed per iteration. Please remove an image before adding a new one.', cardId);
            return;
        }
        
        const imageId = Date.now() + Math.random();
        const imageData = { id: imageId, url: imageDataUrl, filename };
        
        cardData.uploadedImages.push(imageData);
        this.updateUploadDisplay(cardId);
    }
    
    removeImage(imageId, cardId) {
        const cardData = this.cardData.get(cardId);
        cardData.uploadedImages = cardData.uploadedImages.filter(img => img.id !== imageId);
        this.updateUploadDisplay(cardId);
    }
    
    updateUploadDisplay(cardId) {
        const uploadContent = document.getElementById(`uploadContent-${cardId}`);
        const imagesGrid = document.getElementById(`imagesGrid-${cardId}`);
        const analyzeButtonContainer = document.getElementById(`analyzeButtonContainer-${cardId}`);
        const uploadCard = document.getElementById(`card-${cardId}`);
        const cardData = this.cardData.get(cardId);
        
        if (cardData.uploadedImages.length === 0) {
            // Show upload prompt
            uploadContent.classList.remove('hidden');
            imagesGrid.classList.add('hidden');
            analyzeButtonContainer.classList.add('hidden');
            uploadCard.classList.add('without-results');
            uploadCard.classList.remove('with-results');
        } else {
            // Show images grid
            uploadContent.classList.add('hidden');
            imagesGrid.classList.remove('hidden');
            analyzeButtonContainer.classList.remove('hidden');
            
            // Clear and rebuild grid
            imagesGrid.innerHTML = '';
            
            // Add existing images
            cardData.uploadedImages.forEach(imageData => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                
                const img = document.createElement('img');
                img.src = imageData.url;
                img.alt = imageData.filename;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = () => this.removeImage(imageData.id, cardId);
                
                imageItem.appendChild(img);
                imageItem.appendChild(removeBtn);
                imagesGrid.appendChild(imageItem);
            });
            
            // Add "add more" button only if under the limit
            if (cardData.uploadedImages.length < 3) {
                const addMoreBtn = document.createElement('div');
                addMoreBtn.className = 'add-more-btn';
                addMoreBtn.innerHTML = '<div class="plus-icon">+</div>';
                addMoreBtn.onclick = () => document.getElementById(`imageUpload-${cardId}`).click();
                imagesGrid.appendChild(addMoreBtn);
            }
        }
    }
    
    async analyzeImages(cardId) {
        const cardData = this.cardData.get(cardId);
        
        if (cardData.isProcessing) {
            return;
        }
        
        if (cardData.uploadedImages.length === 0) {
            this.showResults('Please upload at least one image first.', cardId);
            return;
        }
        
        // Create new card immediately when analysis starts
        const newCardId = this.createNewCard();
        
        // Show processing state in the current card
        this.showResults('AI is analyzing your design...', cardId);
        this.showResultsContainer(cardId);
        cardData.isProcessing = true;
        
        try {
            // For now, analyze the first image
            const firstImage = cardData.uploadedImages[0];
            const result = await this.analyzeDesign('Analyze this design', firstImage.url);
            this.showResults(result, cardId);
        } catch (error) {
            console.error('Error:', error);
            this.showResults('Sorry, I encountered an error. Please try again.', cardId);
        } finally {
            cardData.isProcessing = false;
        }
    }
    
    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Find the most recent card with images
        let targetCardId = null;
        for (let i = this.currentCardId; i >= 1; i--) {
            const cardData = this.cardData.get(i);
            if (cardData && cardData.uploadedImages.length > 0 && !cardData.isProcessing) {
                targetCardId = i;
                break;
            }
        }
        
        if (!targetCardId) {
            this.showError('Please upload at least one image first.');
            return;
        }
        
        const cardData = this.cardData.get(targetCardId);
        
        // Clear input
        chatInput.value = '';
        
        // Create new card immediately when analysis starts
        const newCardId = this.createNewCard();
        
        // Show processing state in the current card
        this.showResults('AI is analyzing your design...', targetCardId);
        this.showResultsContainer(targetCardId);
        cardData.isProcessing = true;
        
        try {
            // For now, analyze the first image
            const firstImage = cardData.uploadedImages[0];
            const result = await this.analyzeDesign(message, firstImage.url);
            this.showResults(result, targetCardId);
        } catch (error) {
            console.error('Error:', error);
            this.showResults('Sorry, I encountered an error. Please try again.', targetCardId);
        } finally {
            cardData.isProcessing = false;
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
    
    showResultsContainer(cardId) {
        const resultsContainer = document.getElementById(`resultsContainer-${cardId}`);
        const uploadCard = document.getElementById(`card-${cardId}`);
        resultsContainer.classList.remove('hidden');
        uploadCard.classList.add('with-results');
        uploadCard.classList.remove('without-results');
    }
    
    showResults(text, cardId) {
        const resultsContent = document.getElementById(`resultsContent-${cardId}`);
        resultsContent.innerHTML = `<div class="feedback-text">${text}</div>`;
    }
    
    showFeedbackCard() {
        const feedbackCard = document.getElementById('feedbackCard');
        feedbackCard.classList.add('visible');
    }
    
    showFeedback(text) {
        const feedbackContent = document.getElementById('feedbackContent');
        feedbackContent.innerHTML = `<div class="feedback-text">${text}</div>`;
    }
    
    showError(message, cardId = null) {
        console.error(message);
        if (cardId) {
            this.showResults(`Error: ${message}`, cardId);
        } else {
            // Show error in the most recent card
            this.showResults(`Error: ${message}`, this.currentCardId);
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DesignRatingApp();
});