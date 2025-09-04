// Supabase Integration for Dust.tt AI Agent
class DustTTService {
    constructor() {
        this.supabaseUrl = 'https://iiolvvdnzrfcffudwocp.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2x2dmRuenJmY2ZmdWR3b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTIxNzQsImV4cCI6MjA3MTE4ODE3NH0.zm_bLL3lu2hXKqZdIHzH-bIgVwd1cM1jb7Cju92sl6E';
        this.workspaceId = 'tcYbszCY4S';
        this.configurationId = 'Jdb8Fh2uDn';
        this.conversationId = null;
    }
    
    async analyzeImage(imageDataUrl, prompt = "Rate this design and provide feedback") {
        try {
            console.log('🤖 Sending image to Dust.tt via Supabase edge function...');
            
            // Upload image to Supabase storage first, then get URL
            const imageUrl = await this.uploadImageToStorage(imageDataUrl);
            
            // Create request payload matching the edge function expectations
            const payload = {
                content: prompt,
                imageUrl: imageUrl,
                action: 'analyze',
                username: 'web-user',
                timezone: 'UTC'
            };
            
            // Add conversation ID if we have one
            if (this.conversationId) {
                payload.conversationId = this.conversationId;
            }
            
            // Call the Supabase edge function
            const edgeFunctionResponse = await fetch(`${this.supabaseUrl}/functions/v1/design-brain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!edgeFunctionResponse.ok) {
                const errorText = await edgeFunctionResponse.text();
                throw new Error(`Edge function error: ${edgeFunctionResponse.status} - ${errorText}`);
            }
            
            const result = await edgeFunctionResponse.json();
            console.log('📥 Response from edge function:', result);
            
            // Store conversation ID for future requests
            if (result.data && result.data.conversationId) {
                this.conversationId = result.data.conversationId;
            }
            
            return result;
            
        } catch (error) {
            console.error('Error calling Dust.tt via Supabase:', error);
            throw error;
        }
    }
    
    async uploadImageToStorage(imageDataUrl) {
        try {
            console.log('📤 Uploading image to Supabase storage...');
            
            // Convert data URL to blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // Generate unique filename
            const filename = `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            
            // Upload to Supabase storage
            const uploadResponse = await fetch(`${this.supabaseUrl}/storage/v1/object/design-screens/${filename}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                },
                body: blob
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Storage upload failed: ${uploadResponse.status} - ${errorText}`);
            }
            
            // Return the public URL
            const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/design-screens/${filename}`;
            console.log('✅ Image uploaded to storage:', publicUrl);
            return publicUrl;
            
        } catch (error) {
            console.error('❌ Error uploading to storage:', error);
            throw error;
        }
    }
    
    async testConnection() {
        try {
            console.log('🔍 Testing connection to Supabase edge function...');
            
            const response = await fetch(`${this.supabaseUrl}/functions/v1/design-brain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: 'Hello, this is a test message to verify the connection is working properly.'
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Connection test failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Connection test successful:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            throw error;
        }
    }
}

// Global Dust.tt service instance
const dustService = new DustTTService();

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
        this.loadConfiguration();
    }
    
    setupEventListeners() {
        this.uploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.clearBtn.addEventListener('click', () => this.clearAll());
        
        // Configuration panel events
        const testConnectionBtn = document.getElementById('testConnectionBtn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testConnection());
        }
        
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
    
    async startProcessing(imageContainer) {
        this.isProcessing = true;
        
        // Enlarge the magnetic zone
        this.magneticZone.classList.add('processing');
        
        // Update zone title to show rating process
        const zoneTitle = this.magneticZone.querySelector('.magnetic-zone-content p');
        if (zoneTitle) {
            zoneTitle.textContent = '🤖 AI Rating Your Design...';
        }
        
        // Add a processing indicator to the image
        const processingIndicator = document.createElement('div');
        processingIndicator.className = 'processing-indicator';
        processingIndicator.innerHTML = `
            <div class="processing-spinner"></div>
            <div class="processing-text">AI analyzing...</div>
        `;
        imageContainer.appendChild(processingIndicator);
        
        // Add loading state to the image
        imageContainer.classList.add('processing');
        
        try {
            // Get the image data URL
            const img = imageContainer.querySelector('img');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match image
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Draw image to canvas to get data URL
            ctx.drawImage(img, 0, 0);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Call Dust.tt API with specific design rating request
            const ratingPrompt = `Please rate this design on a scale of 1-10 and provide detailed feedback. 

Please analyze and rate the following aspects:
1. **Overall Design Rating**: Give a score from 1-10
2. **Composition**: How well is the layout balanced and organized?
3. **Color Usage**: Are the colors harmonious and effective?
4. **Style & Aesthetics**: How appealing and modern is the design?
5. **Impact**: How strong is the visual impact and message?

For each aspect, provide:
- A rating (1-10)
- Specific feedback on what works well
- Concrete suggestions for improvement
- Overall recommendation

Please format your response clearly with ratings and actionable feedback.`;
            
            console.log('🤖 Sending design to Dust.tt AI for rating...');
            const result = await dustService.analyzeImage(imageDataUrl, ratingPrompt);
            console.log('✅ AI Rating received:', result);
            
            // Store the result for later use
            imageContainer.setAttribute('data-ai-result', JSON.stringify(result));
            
            // Complete processing with AI result
            this.completeProcessing(imageContainer, result);
            
        } catch (error) {
            console.error('❌ Error processing image with AI:', error);
            
            // Enhanced error handling with more specific messages
            let errorMessage = error.message;
            let userFriendlyMessage = 'An error occurred while processing your image.';
            
            if (error.message.includes('Failed to fetch')) {
                userFriendlyMessage = 'Network error: Unable to connect to the AI service. Please check your internet connection and try again.';
            } else if (error.message.includes('Edge function error')) {
                userFriendlyMessage = 'Server error: The AI service is temporarily unavailable. Please try again in a few moments.';
            } else if (error.message.includes('CORS')) {
                userFriendlyMessage = 'Configuration error: Please ensure the Supabase edge function is properly configured.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                userFriendlyMessage = 'Authentication error: Please check the API credentials configuration.';
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                userFriendlyMessage = 'Request timeout: The AI service is taking longer than expected. Please try again.';
            }
            
            // Show error state
            this.showProcessingError(imageContainer, userFriendlyMessage);
            
            // Create a detailed error frame for debugging
            this.createAIResponseFrame(
                `❌ AI Processing Error\n\n${userFriendlyMessage}\n\nTechnical details: ${errorMessage}`,
                null,
                '',
                imageContainer
            );
        }
    }
    
    completeProcessing(imageContainer, aiResult) {
        this.isProcessing = false;
        
        // Remove processing state from zone
        this.magneticZone.classList.remove('processing');
        
        // Restore zone title to "Drop here for AI Design Rating"
        const zoneTitle = this.magneticZone.querySelector('.magnetic-zone-content p');
        if (zoneTitle) {
            zoneTitle.textContent = '🎯 Drop here for AI Design Rating';
        }
        
        // Remove processing state from image
        imageContainer.classList.remove('processing');
        
        // Remove processing indicator
        const processingIndicator = imageContainer.querySelector('.processing-indicator');
        if (processingIndicator) {
            processingIndicator.remove();
        }
        
        // Add completion state
        imageContainer.classList.add('processed');
        
        // Show AI feedback
        this.showAIFeedback(imageContainer, aiResult);
    }
    
    showAIFeedback(imageContainer, aiResult) {
        // Remove any existing feedback
        const existingFeedback = imageContainer.querySelector('.ai-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Extract the AI response text from Supabase edge function response
        let feedbackText = 'AI analysis complete!';
        console.log('🔍 Processing AI result:', aiResult);
        
        // Handle Supabase edge function response format
        if (aiResult && aiResult.data && aiResult.data.text) {
            // Your edge function returns: { ok: true, data: { text: "...", conversationId: "...", fileId: "..." } }
            feedbackText = aiResult.data.text;
        } else if (aiResult && aiResult.response) {
            // Direct response from edge function
            feedbackText = aiResult.response;
        } else if (aiResult && aiResult.message) {
            // Message field from edge function
            feedbackText = aiResult.message;
        } else if (aiResult && aiResult.outputs && aiResult.outputs.length > 0) {
            // Dust.tt native format (if passed through)
            const output = aiResult.outputs[0];
            if (output && output.value) {
                feedbackText = output.value;
            }
        } else if (aiResult && aiResult.output) {
            // Fallback to output field
            if (aiResult.output.text) {
                feedbackText = aiResult.output.text;
            } else if (aiResult.output.value) {
                feedbackText = aiResult.output.value;
            } else if (typeof aiResult.output === 'string') {
                feedbackText = aiResult.output;
            }
        } else if (aiResult && aiResult.result) {
            // Another possible response format
            feedbackText = aiResult.result;
        } else if (typeof aiResult === 'string') {
            // Direct string response
            feedbackText = aiResult;
        }
        
        console.log('📝 Extracted feedback text:', feedbackText);
        
        // Try to extract rating from feedback text
        const ratingMatch = feedbackText.match(/(?:rating|score|grade)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
        const overallRating = ratingMatch ? ratingMatch[1] : null;
        
        // Create rating display if found
        let ratingDisplay = '';
        if (overallRating) {
            const rating = parseFloat(overallRating);
            let ratingColor = '#10b981'; // Green for high ratings
            let ratingEmoji = '🎯';
            
            if (rating < 5) {
                ratingColor = '#ef4444'; // Red for low ratings
                ratingEmoji = '⚠️';
            } else if (rating < 7) {
                ratingColor = '#f59e0b'; // Orange for medium ratings
                ratingEmoji = '📊';
            } else if (rating >= 9) {
                ratingEmoji = '🏆';
            }
            
            ratingDisplay = `
                <div class="rating-display" style="background: ${ratingColor}20; border: 2px solid ${ratingColor};">
                    <span class="rating-emoji">${ratingEmoji}</span>
                    <span class="rating-score" style="color: ${ratingColor};">${overallRating}/10</span>
                </div>
            `;
        }
        
        // Create a new AI response frame on the canvas
        this.createAIResponseFrame(feedbackText, overallRating, ratingDisplay, imageContainer);
    }
    
    createAIResponseFrame(feedbackText, overallRating, ratingDisplay, sourceImage) {
        console.log('🎨 Creating AI response frame for:', feedbackText.substring(0, 100) + '...');
        
        // Remove any existing AI response frames
        const existingFrames = document.querySelectorAll('.ai-response-frame');
        existingFrames.forEach(frame => frame.remove());
        
        // Create the frame container
        const responseFrame = document.createElement('div');
        responseFrame.className = 'ai-response-frame';
        
        // Position the frame near the source image but not overlapping
        const imageRect = sourceImage.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        console.log('📍 Image position:', { left: imageRect.left, top: imageRect.top, right: imageRect.right, bottom: imageRect.bottom });
        console.log('🎯 Canvas bounds:', { width: canvasRect.width, height: canvasRect.height });
        
        // Calculate position to the right of the image
        let frameX = imageRect.right - canvasRect.left + 20;
        let frameY = imageRect.top - canvasRect.top;
        
        // Ensure frame stays within canvas bounds
        const maxX = canvasRect.width - 400; // 400px is max frame width
        if (frameX > maxX) {
            frameX = imageRect.left - canvasRect.left - 420; // Position to the left instead
        }
        
        const maxY = canvasRect.height - 300; // 300px is max frame height
        if (frameY > maxY) {
            frameY = maxY;
        }
        
        // Ensure minimum positions
        frameX = Math.max(20, frameX);
        frameY = Math.max(20, frameY);
        
        console.log('🎯 Frame position:', { x: frameX, y: frameY });
        
        responseFrame.style.left = frameX + 'px';
        responseFrame.style.top = frameY + 'px';
        
        // Create frame content
        const frameContent = `
            <div class="frame-header">
                <span class="frame-icon">🤖</span>
                <span class="frame-title">AI Design Rating</span>
            </div>
            ${ratingDisplay}
            <div class="frame-content">
                ${feedbackText}
            </div>
            <div class="frame-actions">
                <button class="frame-btn" onclick="this.closest('.ai-response-frame').remove()">Close</button>
                <button class="frame-btn primary" onclick="this.closest('.ai-response-frame').classList.toggle('expanded')">
                    ${feedbackText.length > 300 ? 'Expand' : 'Collapse'}
                </button>
            </div>
        `;
        
        responseFrame.innerHTML = frameContent;
        
        // Add to canvas
        this.canvas.appendChild(responseFrame);
        
        // Make frame draggable
        this.makeFrameDraggable(responseFrame);
        
        // Auto-remove after 30 seconds (increased for better reading)
        setTimeout(() => {
            if (responseFrame.parentElement) {
                responseFrame.style.opacity = '0';
                setTimeout(() => responseFrame.remove(), 300);
            }
        }, 30000);
    }
    
    makeFrameDraggable(frame) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        const header = frame.querySelector('.frame-header');
        header.style.cursor = 'grab';
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(frame.style.left) || 0;
            startTop = parseInt(frame.style.top) || 0;
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Keep frame within canvas bounds
            const canvasRect = this.canvas.getBoundingClientRect();
            const frameRect = frame.getBoundingClientRect();
            
            const maxLeft = canvasRect.width - frameRect.width;
            const maxTop = canvasRect.height - frameRect.height;
            
            frame.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            frame.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });
    }
    
    showProcessingError(imageContainer, errorMessage) {
        this.isProcessing = false;
        
        // Remove processing state from zone
        this.magneticZone.classList.remove('processing');
        
        // Restore zone title
        const zoneTitle = this.magneticZone.querySelector('.magnetic-zone-content p');
        if (zoneTitle) {
            zoneTitle.textContent = '🎯 Drop here for AI Design Rating';
        }
        
        // Remove processing state from image
        imageContainer.classList.remove('processing');
        
        // Remove processing indicator
        const processingIndicator = imageContainer.querySelector('.processing-indicator');
        if (processingIndicator) {
            processingIndicator.remove();
        }
        
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.innerHTML = `
            <div class="error-header">
                <span class="error-icon">❌</span>
                <span class="error-title">Processing Error</span>
            </div>
            <div class="error-content">${errorMessage}</div>
        `;
        
        imageContainer.appendChild(errorMsg);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorMsg.parentElement) {
                errorMsg.style.opacity = '0';
                setTimeout(() => errorMsg.remove(), 300);
            }
        }, 5000);
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
    
    loadConfiguration() {
        // Configuration is now hardcoded in the service
        console.log('✅ Dust.tt configuration loaded via Supabase integration');
    }
    
    async testConnection() {
        const configStatus = document.getElementById('configStatus');
        const testBtn = document.getElementById('testConnectionBtn');
        
        if (configStatus && testBtn) {
            // Show loading state
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
            configStatus.textContent = '🔄 Testing connection...';
            configStatus.style.color = '#f59e0b';
            
            try {
                await dustService.testConnection();
                
                // Show success
                configStatus.textContent = '✅ Connection successful!';
                configStatus.style.color = '#10b981';
                
            } catch (error) {
                console.error('Connection test failed:', error);
                
                // Show error
                configStatus.textContent = `❌ Connection failed: ${error.message}`;
                configStatus.style.color = '#ef4444';
            } finally {
                // Reset button
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    configStatus.textContent = '';
                }, 5000);
            }
        }
    }
}

// Initialize the canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageCanvas();
});
