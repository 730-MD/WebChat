// Image upload processing for AI chat interface

document.addEventListener('DOMContentLoaded', function() {
    // Add hook for image upload detection in main app
    setupImageUploadHooks();
});

/**
 * Setup hooks to detect when an image is uploaded and process it
 */
function setupImageUploadHooks() {
    // Set up global function to expose the image upload handling functionality
    window.handleImageUpload = handleImageUpload;
    
    // Watch for file upload element
    const fileUpload = document.getElementById('file-upload');
    if (fileUpload) {
        const originalOnChange = fileUpload.onchange;
        
        // Override the change handler to detect image uploads
        fileUpload.onchange = function(e) {
            // Call original handler if it exists
            if (originalOnChange) {
                originalOnChange.call(this, e);
            }
            
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                // Set a flag that can be checked later to detect this is an image upload
                window.lastUploadIsImage = true;
            } else {
                window.lastUploadIsImage = false;
            }
        };
    }
}

/**
 * Process an uploaded image when the user wants to generate an image from it
 * @param {string} message - User's message/prompt 
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {HTMLElement} thinkingElement - Element containing the thinking indicator
 */
function handleImageUpload(message, imageBase64, thinkingElement) {
    // Check if we should treat this as an image generation request
    if (shouldProcessAsImageGeneration(message)) {
        if (window.processImageToImage) {
            // Use the image2image processor
            window.processImageToImage(message, imageBase64, thinkingElement);
            return true;
        }
    }
    
    return false; // Not processed as image generation
}

/**
 * Determine if a message with an image upload should be treated as an image generation request
 * @param {string} message - User's message/prompt
 * @returns {boolean} - True if it should be treated as an image generation request
 */
function shouldProcessAsImageGeneration(message) {
    if (!message) return false;
    
    const lowerMessage = message.toLowerCase();
    
    // Direct image generation indicators
    if (lowerMessage.includes('generate') || 
        lowerMessage.includes('create') || 
        lowerMessage.includes('make an image') ||
        lowerMessage.includes('similar image') ||
        lowerMessage.includes('new image')) {
        return true;
    }
    
    // Style transformation indicators
    if (lowerMessage.includes('style of') ||
        lowerMessage.includes('like this but') ||
        lowerMessage.includes('transform this') ||
        lowerMessage.includes('convert this') ||
        lowerMessage.includes('change this')) {
        return true;
    }
    
    // Use external image generation detector if available
    if (window.isImageGenerationRequest && window.isImageGenerationRequest(message)) {
        return true;
    }
    
    return false;
}
