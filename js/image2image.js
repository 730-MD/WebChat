// Image to Image processing functionality

(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Expose the function to the global scope
        window.processImageToImage = processImageToImage;
    });

    /**
     * Process an image upload combined with text to generate a new image
     * @param {string} userMessage - The user's message/prompt
     * @param {string} imageBase64 - The base64 encoded image
     * @param {HTMLElement} thinkingElement - Element displaying thinking indicator
     */
    async function processImageToImage(userMessage, imageBase64, thinkingElement) {
        try {
            if (thinkingElement) {
                const thinkingContent = thinkingElement.querySelector('.thinking span');
                if (thinkingContent) {
                    thinkingContent.textContent = 'Analyzing your image and creating a description...';
                }
            }
            
            // First, get a detailed description of the image using OpenAI
            const payload = {
                "model": "openai-large",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert at converting images into detailed text descriptions for image generation. Extract all visual details, style elements, and key features. Be comprehensive and precise."
                    },
                    {
                        "role": "user",
                        "content": [
                            { 
                                "type": "text", 
                                "text": "Describe this image in complete detail as if you were creating a prompt for an image generator. Focus on visual elements, style, lighting, composition, colors, and any distinctive features. Make your description detailed and thorough." 
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
            
            // Send request to get image description
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
            
            // Update thinking message
            if (thinkingElement) {
                const thinkingContent = thinkingElement.querySelector('.thinking span');
                if (thinkingContent) {
                    thinkingContent.textContent = 'Generating new image based on your image and prompt...';
                }
            }
            
            // Combine the image description with the user's prompt
            let finalPrompt = "";
            
            // Detect if the user message is asking for a specific transformation
            if (userMessage.toLowerCase().includes('make it') || 
                userMessage.toLowerCase().includes('change it') ||
                userMessage.toLowerCase().includes('transform') ||
                userMessage.toLowerCase().includes('convert') ||
                userMessage.toLowerCase().includes('style')) {
                
                finalPrompt = `${imageDescription}, but ${userMessage}`;
            } else {
                // If user has a more specific request
                finalPrompt = `${imageDescription}, ${userMessage}`;
            }
            
            // Generate the new image
            if (window.handleImageGeneration) {
                window.handleImageGeneration(finalPrompt);
            } else {
                throw new Error("Image generation function not available");
            }
            
        } catch (error) {
            console.error('Error processing image-to-image:', error);
            
            // Remove thinking indicator
            if (thinkingElement) {
                thinkingElement.remove();
            }
            
            // Show error message
            const chatArea = document.getElementById('chat-area');
            if (chatArea) {
                const errorElement = document.createElement('div');
                errorElement.className = 'message bot';
                errorElement.innerHTML = `
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <p><strong>Failed to process image-to-image request:</strong> ${error.message}</p>
                    </div>
                `;
                chatArea.appendChild(errorElement);
                chatArea.scrollTop = chatArea.scrollHeight;
            }
        }
    }
})();
