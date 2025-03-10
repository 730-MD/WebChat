// Image generation functionality

// Make the module properly scoped and prevent global namespace pollution
(function() {
    // Ensure we wait for the DOM to be loaded before accessing elements
    document.addEventListener('DOMContentLoaded', function() {
        // Make functions globally accessible for app.js
        window.parseImagePrompt = parseImagePrompt;
        window.handleImageGeneration = handleImageGeneration;
        window.handleImageEditing = handleImageEditing;
    });

// Function to parse image generation prompts and extract parameters
function parseImagePrompt(prompt) {
    let cleanedPrompt = prompt;
    let count = 1;
    let width = null;
    let height = null;
    let useEnhance = false;
    let modelName = 'flux'; // Default model
    
    // Check for specific number of images
    const numberMatch = prompt.match(/(\d+)\s+images?/i);
    if (numberMatch && numberMatch[1]) {
        count = parseInt(numberMatch[1]);
        count = Math.min(count, 10); // Limit to 10 images max
    }
    
    // Check for dimensions
    const dimensionsMatch = prompt.match(/(\d+)x(\d+)/i);
    if (dimensionsMatch) {
        width = parseInt(dimensionsMatch[1]);
        height = parseInt(dimensionsMatch[2]);
        
        // Remove dimensions from prompt
        cleanedPrompt = cleanedPrompt.replace(dimensionsMatch[0], '').trim();
    }
    
    // Check for enhance option
    if (prompt.toLowerCase().includes('enhance')) {
        useEnhance = true;
        // Remove 'enhance' from prompt
        cleanedPrompt = cleanedPrompt.replace(/\benhance\b/gi, '').trim();
    }
    
    // Check for model name
    if (prompt.toLowerCase().includes('flux')) {
        modelName = 'flux';
        cleanedPrompt = cleanedPrompt.replace(/\bflux\b/gi, '').trim();
    } else if (prompt.toLowerCase().includes('turbo')) {
        modelName = 'turbo';
        cleanedPrompt = cleanedPrompt.replace(/\bturbo\b/gi, '').trim();
    }
    
    // Clean up the generation part - now more flexible to detect image requests
    cleanedPrompt = cleanedPrompt.replace(/generate\s+(\d+\s+)?images?\s+of\s+/i, '')
                             .replace(/generate\s+(\d+\s+)?pictures?\s+of\s+/i, '')
                             .replace(/generate\s+(\d+\s+)?photos?\s+of\s+/i, '')
                             .replace(/generate\s+/i, '')
                             .replace(/create\s+(\d+\s+)?images?\s+of\s+/i, '')
                             .replace(/make\s+(\d+\s+)?images?\s+of\s+/i, '')
                             .replace(/show\s+(\d+\s+)?images?\s+of\s+/i, '')
                             .replace(/draw\s+(\d+\s+)?images?\s+of\s+/i, '')
                             .replace(/show\s+me\s+/i, '')
                             .replace(/\bimage\s+of\b/i, '')
                             .replace(/\bpicture\s+of\b/i, '')
                             .trim();
    
    return {
        cleanedPrompt,
        count,
        width,
        height,
        useEnhance,
        modelName
    };
}

// Function to detect if a message is requesting an image generation
function isImageGenerationRequest(message) {
    const imageTriggerWords = [
        // Explicit generation commands
        /generate(\s+an?)?\s+(image|picture|photo)/i,
        /create(\s+an?)?\s+(image|picture|photo)/i,
        /make(\s+an?)?\s+(image|picture|photo)/i,
        /draw(\s+an?)?\s+(image|picture|photo)/i,
        
        // Visual descriptions that suggest image generation
        /\bshow\s+me\s+/i,
        /\bvisualize\s+/i,
        /\billustrate\s+/i,
        
        // Dimensional specifications that suggest image generation
        /\b\d+x\d+\b/i,
        
        // Style-related image generation requests
        /\bin\s+(the\s+)?(style|manner)\s+of\b/i,
        /\bphotorealistic\b/i,
        /\bcartoon\s+(style)?\b/i,
        /\b3d\s+render(ing)?\b/i,
        
        // Art style specifications
        /\boil\s+painting\b/i,
        /\bwatercolor\b/i,
        /\bdigital\s+art\b/i,
        /\bpencil\s+sketch\b/i,
        
        // Image enhancement or editing requests
        /\benhance\b/i,
        /\bimprove\s+the\s+image\b/i,
        
        // Model specifications
        /\bflux\b/i,
        /\bturbo\b/i
    ];
    
    // Check if the message matches any of the image generation patterns
    for (const pattern of imageTriggerWords) {
        if (pattern.test(message)) {
            return true;
        }
    }
    
    return false;
}

// Make the function globally accessible
window.isImageGenerationRequest = isImageGenerationRequest;

// Function to handle image generation requests
async function handleImageGeneration(prompt) {
    // Parse the prompt for parameters
    const { cleanedPrompt, count, width, height, useEnhance, modelName } = parseImagePrompt(prompt);
    
    // Create bot message container with placeholder
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    
    // Determine the number of images to generate (default to 1 if not specified)
    const imageCount = count || 1;
    
    // Set default dimensions if not specified
    const imageWidth = width || 512;
    const imageHeight = height || 512;
    
    // Create placeholder with aspect ratio based on requested dimensions
    const aspectRatio = imageHeight / imageWidth;
    
    let carouselHTML;
    if (imageCount > 1) {
        // For multiple images, create a carousel with placeholders
        carouselHTML = `
            <div class="image-carousel">
                ${Array(imageCount).fill(0).map((_, i) => `
                    <div class="carousel-item">
                        <div class="image-loading-placeholder" data-index="${i + 1}" style="aspect-ratio: ${imageWidth}/${imageHeight};">
                            <div class="placeholder-dimensions">${imageWidth}×${imageHeight}</div>
                        </div>
                        <div class="carousel-counter">${i + 1}/${imageCount}</div>
                    </div>
                `).join('')}
            </div>
            <div class="carousel-controls">
                <button class="prev-btn" disabled><i class="fas fa-chevron-left"></i></button>
                <button class="next-btn" disabled><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
    } else {
        // For a single image, just show a placeholder
        carouselHTML = `
            <div class="image-loading-placeholder" style="aspect-ratio: ${imageWidth}/${imageHeight};">
                <div class="placeholder-dimensions">${imageWidth}×${imageHeight}</div>
            </div>
        `;
    }
    
    messageElement.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            ${carouselHTML}
        </div>
    `;
    
    // Add to chat area
    const chatArea = getChatArea();
    chatArea.appendChild(messageElement);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    // Set flag for ongoing image generation
    isGeneratingImages = true;
    pendingImageGenerations = imageCount;
    
    // Generate multiple images concurrently
    const imagePromises = [];
    const generatedImages = [];
    
    for (let i = 0; i < imageCount; i++) {
        // Generate a random seed for each image
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        // Set up parameters
        const params = new URLSearchParams();
        params.append("model", modelName);
        params.append("token", "gacha11211");
        params.append("referrer", "gacha11211");
        params.append("nologo", "true");
        params.append("private", "true");
        params.append("nofeed", "true");
        params.append("seed", randomSeed);
        
        if (useEnhance) {
            params.append("enhance", "true");
        }
        
        // Always include dimensions
        params.append("width", imageWidth);
        params.append("height", imageHeight);
        
        // Construct the image URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanedPrompt)}?${params.toString()}`;
        
        // Create a promise for each image request
        const imagePromise = fetch(imageUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to generate image ${i + 1}: ${response.status} ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ index: i, dataUrl: reader.result });
                    reader.readAsDataURL(blob);
                });
            })
            .catch(error => {
                console.error(`Error generating image ${i + 1}:`, error);
                return { index: i, error: error.message };
            });
        
        imagePromises.push(imagePromise);
    }
    
    // Process images as they complete
    for (let i = 0; i < imagePromises.length; i++) {
        try {
            const result = await imagePromises[i];
            
            // Update the placeholder with the actual image or error message
            if (result.dataUrl) {
                generatedImages[result.index] = result.dataUrl;
                
                // Store the base64 image data for potential editing
                const base64Data = result.dataUrl.split(',')[1];
                if (window.updateLastGeneratedImage) {
                    window.updateLastGeneratedImage(base64Data);
                }
                
                if (imageCount > 1) {
                    // Update carousel item
                    const placeholder = messageElement.querySelector(`.image-loading-placeholder[data-index="${result.index + 1}"]`);
                    if (placeholder) {
                        const parentItem = placeholder.closest('.carousel-item');
                        parentItem.innerHTML = `
                            <img src="${result.dataUrl}" alt="Generated image ${result.index + 1}" style="aspect-ratio: ${imageWidth}/${imageHeight};" class="fullscreen-image">
                            <div class="carousel-counter">${result.index + 1}/${imageCount}</div>
                        `;
                        
                        // Add click event for fullscreen
                        const img = parentItem.querySelector('img');
                        if (img) {
                            img.addEventListener('click', function() {
                                openImageFullscreen(this);
                            });
                        }
                    }
                } else {
                    // Update single image
                    const placeholder = messageElement.querySelector('.image-loading-placeholder');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.src = result.dataUrl;
                        img.alt = "Generated image";
                        img.className = "fullscreen-image";
                        img.style.aspectRatio = `${imageWidth}/${imageHeight}`;
                        placeholder.parentNode.replaceChild(img, placeholder);
                        
                        // Add click event for fullscreen
                        img.addEventListener('click', function() {
                            openImageFullscreen(this);
                        });
                    }
                }
            } else if (result.error) {
                // Display error for this specific image
                const placeholder = messageElement.querySelector(
                    imageCount > 1 ? 
                    `.image-loading-placeholder[data-index="${result.index + 1}"]` : 
                    '.image-loading-placeholder'
                );
                
                if (placeholder) {
                    placeholder.innerHTML = `<p class="error-message">Error: ${result.error}</p>`;
                    placeholder.style.display = "flex";
                    placeholder.style.justifyContent = "center";
                    placeholder.style.alignItems = "center";
                    placeholder.style.padding = "20px";
                    placeholder.style.color = "var(--error-color)";
                }
            }
            
            // Enable carousel controls when we have more than one image
            if (imageCount > 1 && generatedImages.filter(Boolean).length > 1) {
                const prevBtn = messageElement.querySelector('.prev-btn');
                const nextBtn = messageElement.querySelector('.next-btn');
                
                if (prevBtn) prevBtn.disabled = false;
                if (nextBtn) nextBtn.disabled = false;
                
                // Add event listeners to carousel buttons if we haven't already
                if (!prevBtn.hasListener) {
                    prevBtn.addEventListener('click', () => {
                        const carousel = messageElement.querySelector('.image-carousel');
                        carousel.scrollBy({ left: -carousel.clientWidth, behavior: 'smooth' });
                    });
                    prevBtn.hasListener = true;
                }
                
                if (!nextBtn.hasListener) {
                    nextBtn.addEventListener('click', () => {
                        const carousel = messageElement.querySelector('.image-carousel');
                        carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' });
                    });
                    nextBtn.hasListener = true;
                }
            }
            
            pendingImageGenerations--;
        } catch (error) {
            console.error('Error processing image result:', error);
            pendingImageGenerations--;
        }
    }
    
    // Update final message content when all images are done
    isGeneratingImages = false;
    
    // Save to conversation history
    if (window.saveConversation) {
        window.saveConversation(prompt, `Generated ${imageCount} image(s) of: "${cleanedPrompt}"`);
    }
    if (window.updateChatHistorySidebar) {
        window.updateChatHistorySidebar();
    }
    
    // Add long-press functionality to the message content
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent && window.addLongPressListeners) {
        window.addLongPressListeners(messageContent);
    }
}

// Fix for chatArea reference - use document.getElementById instead of global variable
function getChatArea() {
    return document.getElementById('chat-area');
}

// Function to handle image editing requests (using OpenAI to generate a description and then generating a new image)
async function handleImageEditing(message, imageBase64, thinkingElement) {
    try {
        // First, get a description of the image using OpenAI
        if (thinkingElement) {
            const thinkingContent = thinkingElement.querySelector('.thinking span');
            if (thinkingContent) {
                thinkingContent.textContent = 'Analyzing your image...';
            }
        }
        
        // Prepare the request to OpenAI large model
        const payload = {
            "model": "openai-large",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert at describing images in detailed yet concise prompts for image generation. Focus on key visual elements, style, composition, and mood. Be detailed but brief."
                },
                {
                    "role": "user",
                    "content": [
                        { 
                            "type": "text", 
                            "text": "Create a detailed image generation prompt based on this image. The prompt should accurately describe what's in the image in a way that could recreate a similar visual." 
                        },
                        { 
                            "type": "image_url", 
                            "image_url": { 
                                "url": `data:image/jpeg;base64,${imageBase64}` 
                            } 
                        }
                    ]
                }
            ],
            "temperature": 0.7,
            "top_p": 1.0,
            "stream": false,
            "private": true,
            "nofeed": true,
            "token": "gacha11211",
            "referrer": "gacha11211",
            "max_tokens": 1000
        };
        
        // Send request to OpenAI
        const response = await fetch("https://text.pollinations.ai/openai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to analyze image: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const imageDescription = data.choices[0].message.content;
        
        // Update thinking text
        if (thinkingElement) {
            const thinkingContent = thinkingElement.querySelector('.thinking span');
            if (thinkingContent) {
                thinkingContent.textContent = 'Generating new image based on your request...';
            }
        }
        
        // Combine the original user request with the image description
        let userRequest = message.trim();
        let finalPrompt = imageDescription;
        
        // Check for specific modifications in the user's request
        if (userRequest.toLowerCase().includes('but with')) {
            const modification = userRequest.substring(userRequest.toLowerCase().indexOf('but with') + 8).trim();
            finalPrompt = finalPrompt + ", but with " + modification;
        } else if (userRequest.toLowerCase().includes('make it')) {
            const modification = userRequest.substring(userRequest.toLowerCase().indexOf('make it') + 7).trim();
            finalPrompt = finalPrompt + ", make it " + modification;
        } else if (!userRequest.toLowerCase().includes('similar') && 
                  !userRequest.toLowerCase().includes('like this')) {
            // If the user has a more specific request that's not just "make similar"
            finalPrompt = finalPrompt + ", " + userRequest;
        }
        
        // Remove the thinking indicator
        if (window.removeBotThinkingIndicator) {
            window.removeBotThinkingIndicator();
        }
        
        // Generate the new image
        await handleImageGeneration(finalPrompt);
        
    } catch (error) {
        console.error('Error editing image:', error);
        if (window.removeBotThinkingIndicator) {
            window.removeBotThinkingIndicator();
        }
        if (window.addErrorMessage) {
            window.addErrorMessage(`Failed to edit image: ${error.message}`);
        } else {
            // Fallback message
            const chatArea = getChatArea();
            const errorElement = document.createElement('div');
            errorElement.className = 'message bot';
            errorElement.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <p><strong>Failed to edit image:</strong> ${error.message}</p>
                </div>
            `;
            chatArea.appendChild(errorElement);
        }
    }
}

/**
 * Function to open an image in fullscreen mode
 * @param {HTMLElement} img - The image element to display in fullscreen
 */
function openImageFullscreen(img) {
    // Create a fullscreen overlay
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.cursor = 'pointer';
    
    // Create fullscreen image
    const fullscreenImg = document.createElement('img');
    fullscreenImg.src = img.src;
    fullscreenImg.style.maxWidth = '90%';
    fullscreenImg.style.maxHeight = '90%';
    fullscreenImg.style.objectFit = 'contain';
    fullscreenImg.style.borderRadius = '8px';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.fontSize = '30px';
    closeBtn.style.color = 'white';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    
    // Close on click or ESC key
    const closeOverlay = () => {
        document.body.removeChild(overlay);
    };
    
    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeOverlay();
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
            closeOverlay();
        }
    });
    
    // Add elements to the DOM
    overlay.appendChild(fullscreenImg);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
}

// Make the function globally accessible
window.openImageFullscreen = openImageFullscreen;

// Close the IIFE
})();
