document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const searchBtn = document.getElementById('search-btn');
    const modelSelect = document.getElementById('model');
    const modelSelectMobile = document.getElementById('model-mobile');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const fileUpload = document.getElementById('file-upload');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const previewContainer = document.getElementById('preview-container');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeUploadBtn = document.getElementById('remove-upload');
    const startChatBtn = document.getElementById('start-chat-btn');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const codeExecutionArea = document.getElementById('code-execution-area');
    const codeOutput = document.getElementById('code-output');
    const closeExecutionBtn = document.getElementById('close-execution');

    // State management
    let currentChatId = generateUUID();
    let conversations = {};
    let lastSeed = null;
    let lastQuery = null;
    let lastUpload = null; // Can be image or other file
    let lastUploadType = null; // Type of upload (image, pdf, etc)
    let lastFileName = null; // To store the original uploaded file name
    let isWaitingForResponse = false;
    let isRegenerating = false; // Track when we're regenerating a response vs. new message
    let currentReader = null;
    let isMobile = window.innerWidth <= 768;
    let isSearchMode = false;
    let pyodideInstance = null;
    let isExecutingCode = false;
    let isGeneratingImages = false; // Flag for ongoing image generation
    let pendingImageGenerations = 0; // Counter for batch image generation

    // Initialize app
    initApp();

    // Event listeners
    userInput.addEventListener('keydown', handleInputKeydown);
    sendBtn.addEventListener('click', handleSendMessage);
    regenerateBtn.addEventListener('click', handleRegenerateResponse);
    searchBtn.addEventListener('click', toggleSearchMode);
    newChatBtn.addEventListener('click', handleNewChat);
    fileUpload.addEventListener('change', handleFileUpload);
    removeUploadBtn.addEventListener('click', handleRemoveUpload);
    userInput.addEventListener('input', autoResizeTextarea);
    startChatBtn.addEventListener('click', handleStartChat);
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Track user scrolling to prevent automatic scrolling when user manually scrolls
    chatArea.addEventListener('scroll', () => {
        const isAtBottom = chatArea.scrollHeight - chatArea.clientHeight <= chatArea.scrollTop + 100;
        if (!isAtBottom) {
            chatArea.setAttribute('data-user-scrolled', 'true');
        } else {
            chatArea.removeAttribute('data-user-scrolled');
        }
    });
    
    // Code execution related event listeners
    if (closeExecutionBtn) {
        closeExecutionBtn.addEventListener('click', () => {
            codeExecutionArea.style.display = 'none';
        });
    }
    
    // Add an event listener to initialize Pyodide when the page loads (in background)
    window.addEventListener('load', () => {
        // Initialize Pyodide in the background after page load
        setTimeout(() => {
            // Only initialize if the script is loaded
            if (typeof loadPyodide !== 'undefined') {
                console.log("Pre-loading Pyodide in the background...");
                loadPyodideIfNeeded();
            }
        }, 5000);  // Wait 5 seconds after page load to start loading
    });
    
    // Initialize Pyodide for Python code execution
    async function initPyodide() {
        try {
            if (!pyodideInstance) {
                console.log("Initializing Pyodide...");
                pyodideInstance = await loadPyodide();
                console.log("Pyodide initialized successfully");
            }
        } catch (error) {
            console.error("Failed to initialize Pyodide:", error);
        }
    }
    
    // Load Pyodide on demand to save resources
    function loadPyodideIfNeeded() {
        if (typeof loadPyodide !== 'undefined' && !pyodideInstance) {
            initPyodide();
        }
    }
    
    // Sync model selectors
    modelSelect.addEventListener('change', () => {
        console.log("Sidebar model changed to:", modelSelect.value);
        
        // Store current chat ID to preserve memory across model changes
        const savedChatId = currentChatId;
        
        if (modelSelectMobile) {
            modelSelectMobile.value = modelSelect.value;
            
            // Update model indicator if visible
            if (modelSelect.value) {
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                    const existingIndicator = welcomeMessage.querySelector('.model-indicator');
                    if (existingIndicator) {
                        existingIndicator.innerHTML = `Model "<strong>${modelSelect.options[modelSelect.selectedIndex].text}</strong>" is selected`;
                    } else {
                        const modelIndicator = document.createElement('div');
                        modelIndicator.className = 'model-indicator';
                        modelIndicator.innerHTML = `Model "<strong>${modelSelect.options[modelSelect.selectedIndex].text}</strong>" is selected`;
                        welcomeMessage.appendChild(modelIndicator);
                    }
                }
            }
            
            // Ensure we don't lose chat history when changing models
            if (conversations[currentChatId] && conversations[currentChatId].messages.length > 0) {
                // Make sure welcome message is hidden if we have existing messages
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.style.display = 'none';
                }
                
                // Store the selected model with the current conversation
                conversations[currentChatId].model = modelSelect.value;
                console.log(`Updated conversation ${currentChatId} to use model: ${modelSelect.value}`);
                
                // Force display of conversation to ensure memory persists
                displayConversation(currentChatId);
                
                // Save to ensure memory is preserved
                saveConversations();
            }
        }
    });
    
    modelSelectMobile.addEventListener('change', () => {
        console.log("Mobile model changed to:", modelSelectMobile.value);
        
        // Store current chat ID to preserve memory across model changes
        const savedChatId = currentChatId;
        
        modelSelect.value = modelSelectMobile.value;
        
        // Update model indicator if visible
        if (modelSelectMobile.value) {
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                const existingIndicator = welcomeMessage.querySelector('.model-indicator');
                if (existingIndicator) {
                    existingIndicator.innerHTML = `Model "<strong>${modelSelectMobile.options[modelSelectMobile.selectedIndex].text}</strong>" is selected`;
                } else {
                    const modelIndicator = document.createElement('div');
                    modelIndicator.className = 'model-indicator';
                    modelIndicator.innerHTML = `Model "<strong>${modelSelectMobile.options[modelSelectMobile.selectedIndex].text}</strong>" is selected`;
                    welcomeMessage.appendChild(modelIndicator);
                }
            }
            
            // Ensure we don't lose chat history when changing models
            if (conversations[currentChatId] && conversations[currentChatId].messages.length > 0) {
                // Make sure welcome message is hidden if we have existing messages
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.style.display = 'none';
                }
                
                // Store the selected model with the current conversation
                conversations[currentChatId].model = modelSelectMobile.value;
                console.log(`Updated conversation ${currentChatId} to use model: ${modelSelectMobile.value}`);
                
                // Force display of conversation to ensure memory persists
                displayConversation(currentChatId);
                
                // Save to ensure memory is preserved
                saveConversations();
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            isMobile = newIsMobile;
            if (!isMobile) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        }
    });

    // Function to initialize the application
    function initApp() {
        // Check if we're on mobile
        checkMobileView();
        
        // Load conversations from localStorage
        loadConversations();
        
        // Create a new chat if none exists
        if (Object.keys(conversations).length === 0) {
            createNewChat();
        } else {
            // Load the most recent chat
            const mostRecentChatId = Object.keys(conversations)[0];
            loadChat(mostRecentChatId);
        }
        
        // Copy model options from sidebar to mobile selector
        syncModelOptions();
        
        // Log initial model values
        console.log("Initial app state - modelSelect:", modelSelect.value);
        console.log("Initial app state - modelSelectMobile:", modelSelectMobile ? modelSelectMobile.value : "not available");
        
        // Add debug tools - press F2 to see model status
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F2') {
                const debugDiv = document.getElementById('model-debug');
                if (debugDiv) {
                    debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
                    debugDiv.innerHTML = `
                        <p>modelSelect: ${modelSelect.value}</p>
                        <p>modelSelectMobile: ${modelSelectMobile ? modelSelectMobile.value : "N/A"}</p>
                    `;
                }
            }
        });
        
        // Check if model is already selected
        if (modelSelect.value !== '') {
            console.log("Model already selected on init:", modelSelect.value);
            
            // If on mobile and welcome message is showing, allow user to start directly
            if (isMobile) {
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    // Update mobile selection to match
                    if (modelSelectMobile) {
                        modelSelectMobile.value = modelSelect.value;
                    }
                    
                    // Add indicator to show selected model
                    const modelIndicator = document.createElement('div');
                    modelIndicator.className = 'model-indicator';
                    modelIndicator.innerHTML = `Model "<strong>${modelSelect.options[modelSelect.selectedIndex].text}</strong>" is selected`;
                    welcomeMessage.appendChild(modelIndicator);
                }
            }
        }
    }
    
    // Check if we're in mobile view and set up accordingly
    function checkMobileView() {
        isMobile = window.innerWidth <= 768;
        // Always ensure sidebar is closed by default
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
    
    // Sync model options between selectors
    function syncModelOptions() {
        if (modelSelectMobile) {
            // Make sure mobile selector has the same options
            modelSelectMobile.innerHTML = '<option value="">-- Select a model --</option>';
            Array.from(modelSelect.options).forEach(option => {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.textContent = option.textContent;
                modelSelectMobile.appendChild(newOption);
            });
            
            // If a model is selected in the sidebar, sync it to mobile
            if (modelSelect.value) {
                modelSelectMobile.value = modelSelect.value;
                console.log("Synced model to mobile:", modelSelect.value);
            }
        }
    }
    
    // Toggle sidebar on mobile
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
    
    // Handle start chat button on mobile welcome screen
    function handleStartChat() {
        console.log("Start Chat clicked");
        console.log("Mobile model value:", modelSelectMobile.value);
        console.log("Sidebar model value:", modelSelect.value);
        
        // Check both model selectors, use whichever one has a value
        let selectedModel = modelSelectMobile.value || modelSelect.value;
        
        if (!selectedModel || selectedModel === '') {
            alert('Please select a model first');
            return;
        }
        
        try {
            // Force sync both model selectors to ensure they have the same value
            modelSelect.value = selectedModel;
            modelSelectMobile.value = selectedModel;
            
            console.log("Using model:", selectedModel);
            
            // Hide the welcome message
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }

            // Show a subtle notification to indicate user can type
            const notification = document.createElement('div');
            notification.className = 'start-typing-notification';
            notification.textContent = 'You can start typing now...';
            chatArea.appendChild(notification);
            
            // Auto-focus the input field with a slight delay to ensure UI has updated
            setTimeout(() => {
                userInput.focus();
                // Remove the notification after 3 seconds
                setTimeout(() => {
                    if (notification.parentNode) {
                        chatArea.removeChild(notification);
                    }
                }, 3000);
            }, 100);
            
            // Test API connectivity with a small request
            testAPIConnection();
        } catch (error) {
            console.error('Error starting chat:', error);
            // If there's an error, show a helpful message
            addErrorMessage('There was an error initializing the chat. Please try refreshing the page.');
        }
    }
    
    // Test API connection before user starts chatting
    async function testAPIConnection() {
        try {
            // Simple request to check if the API is accessible
            const response = await fetch('https://text.pollinations.ai/health', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Short timeout to avoid long waits
                signal: AbortSignal.timeout(3000)
            });
            
            // If we get a response, log it but don't block the user
            console.log('API connection test:', response.ok ? 'Success' : 'Failed');
        } catch (error) {
            // Just log the error, don't block the user experience
            console.warn('API connection test failed:', error);
            
            // Add a subtle warning that doesn't interrupt the UX
            const warningNotification = document.createElement('div');
            warningNotification.className = 'message system';
            warningNotification.innerHTML = `
                <div class="message-content api-warning">
                    <p><i class="fas fa-exclamation-triangle"></i> Note: The AI service might be experiencing connectivity issues. If your messages don't receive responses, please try again later.</p>
                </div>
            `;
            chatArea.appendChild(warningNotification);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }

    // Auto-resize textarea as content grows
    function autoResizeTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    }

    // Handle input keydown event (e.g., Enter to send)
    function handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    // Define variables to track image-related context
    let lastMessageType = null;
    let lastGeneratedImageBase64 = null;
    
    // Update last generated image base64 data for editing
    window.updateLastGeneratedImage = function(base64Data) {
        lastGeneratedImageBase64 = base64Data;
    };
    
    // Handle sending a message
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '' && !lastUpload) return;

        if (isWaitingForResponse) return;
        
        // This is a new message, not regeneration
        isRegenerating = false;
        
        // Check if this is an image editing request
        if (lastMessageType === 'image' && lastGeneratedImageBase64 && 
           (message.toLowerCase().includes('edit') || 
            message.toLowerCase().includes('modify') || 
            message.toLowerCase().includes('change') || 
            message.toLowerCase().includes('update') || 
            message.toLowerCase().includes('adjust'))) {
            
            // Handle as an image editing request
            if (window.handleImageEditing) {
                addMessageToChat('user', message);
                addBotThinkingIndicator();
                window.handleImageEditing(message, lastGeneratedImageBase64, document.querySelector('.message.bot:last-child'));
                clearInput();
                return;
            }
        }
        
        // Check if a model is selected - use value from either selector
        const selectedModel = modelSelect.value || (modelSelectMobile ? modelSelectMobile.value : '');
        
        if (!selectedModel) {
            console.log("No model selected. modelSelect:", modelSelect.value, "modelSelectMobile:", modelSelectMobile ? modelSelectMobile.value : "not available");
            
            // Show welcome message if it's hidden
            const welcomeMessage = document.querySelector('.welcome-message');
            if (!welcomeMessage || welcomeMessage.style.display === 'none') {
                chatArea.innerHTML = `
                    <div class="welcome-message">
                        <h2>Welcome to AI Chat</h2>
                        <p>Please select a model to start chatting</p>
                        
                        <div class="welcome-actions">
                            <select id="model-mobile" class="model-select-mobile">
                                <option value="">-- Select a model --</option>
                            </select>
                            <button id="start-chat-btn" class="start-chat-btn">Start Chatting</button>
                        </div>
                        <div class="model-selection-help">
                            <p>Please select a model from the dropdown above to begin</p>
                        </div>
                        <div id="model-debug" style="display: none;" class="model-debug"></div>
                    </div>
                `;
                
                // Re-bind mobile elements
                const newModelSelectMobile = document.getElementById('model-mobile');
                const newStartChatBtn = document.getElementById('start-chat-btn');
                
                // Sync model options
                syncModelOptions();
                
                // Re-bind event listeners
                newStartChatBtn.addEventListener('click', handleStartChat);
                newModelSelectMobile.addEventListener('change', (e) => {
                    console.log("Mobile model changed to:", e.target.value);
                    modelSelect.value = e.target.value;
                    
                    // Update or add model indicator
                    if (e.target.value) {
                        const welcomeMessage = document.querySelector('.welcome-message');
                        if (welcomeMessage) {
                            const existingIndicator = welcomeMessage.querySelector('.model-indicator');
                            if (existingIndicator) {
                                existingIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                            } else {
                                const modelIndicator = document.createElement('div');
                                modelIndicator.className = 'model-indicator';
                                modelIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                                welcomeMessage.appendChild(modelIndicator);
                            }
                        }
                    }
                });
            }
            
            alert('Please select a model first');
            return;
        }

        // Close sidebar on mobile when sending a message
        if (isMobile) {
            closeSidebar();
        }

        // Hide welcome message if it's still visible
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Check if this is an image generation request using more sophisticated detection
        if ((message.toLowerCase().includes('generate') && 
            (message.toLowerCase().includes('image') || message.toLowerCase().includes('picture') || 
             message.toLowerCase().includes('photo'))) ||
            (window.isImageGenerationRequest && window.isImageGenerationRequest(message))) {
            
            // Track this as an image message for potential editing later
            lastMessageType = 'image';
            
            // Add user message to chat
            addMessageToChat('user', message);
            userInput.value = '';
            userInput.style.height = 'auto';
            lastQuery = message;
            
            // Handle image generation
            isWaitingForResponse = true;
            regenerateBtn.disabled = true;
            searchBtn.disabled = true;
            
            try {
                await handleImageGeneration(message);
                regenerateBtn.disabled = false;
                searchBtn.disabled = false;
            } catch (error) {
                addErrorMessage(error.message);
                console.error('Error generating images:', error);
                regenerateBtn.disabled = false;
                searchBtn.disabled = false;
            } finally {
                isWaitingForResponse = false;
            }
            
            return;
        }
        
        // Check if this is a request to edit an uploaded image
        if (lastUpload && lastUploadType && lastUploadType.startsWith('image/') && 
            (message.toLowerCase().includes('edit') || 
             message.toLowerCase().includes('similar') || 
             message.toLowerCase().includes('generate') || 
             message.toLowerCase().includes('like this'))) {
            
            // Add user message to chat with the image
            addMessageToChat('user', message, lastUpload, lastUploadType);
            userInput.value = '';
            userInput.style.height = 'auto';
            lastQuery = message;
            
            // Add thinking indicator
            const thinkingElement = addThinkingIndicator();
            
            // Store upload before resetting it
            const uploadToSend = lastUpload;
            const uploadTypeToSend = lastUploadType;
            handleRemoveUpload();
            
            isWaitingForResponse = true;
            regenerateBtn.disabled = true;
            searchBtn.disabled = true;
            
            try {
                await handleImageEditing(message, uploadToSend, thinkingElement);
                regenerateBtn.disabled = false;
                searchBtn.disabled = false;
            } catch (error) {
                removeBotThinkingIndicator();
                addErrorMessage(error.message);
                console.error('Error editing image:', error);
                regenerateBtn.disabled = false;
                searchBtn.disabled = false;
            } finally {
                isWaitingForResponse = false;
            }
            
            return;
        }

        // Add user message to chat
        addMessageToChat('user', message, lastUpload, lastUploadType);
        userInput.value = '';
        userInput.style.height = 'auto';
        lastQuery = message;

        // Add thinking indicator
        const thinkingElement = addThinkingIndicator();

        // Store upload before resetting it
        const uploadToSend = lastUpload;
        const uploadTypeToSend = lastUploadType;
        handleRemoveUpload();

        // Get response from AI
        isWaitingForResponse = true;
        regenerateBtn.disabled = true;
        searchBtn.disabled = true;
        
        try {
            if (isSearchMode) {
                // First use searchgpt to get search results
                await handleSearchQuery(message, thinkingElement);
                isSearchMode = false;
                searchBtn.classList.remove('active');
                userInput.placeholder = 'Send a message...';
            } else {
                await getAIResponse(message, uploadToSend, uploadTypeToSend, thinkingElement);
            }
            regenerateBtn.disabled = false;
            searchBtn.disabled = false;
        } catch (error) {
            removeBotThinkingIndicator();
            addErrorMessage(error.message);
            console.error('Error getting AI response:', error);
            regenerateBtn.disabled = false;
            searchBtn.disabled = false;
        } finally {
            isWaitingForResponse = false;
        }
    }
    
    // Handle web search using searchgpt
    async function handleSearchQuery(query, thinkingElement) {
        try {
            // Update thinking indicator to show we're searching
            if (thinkingElement) {
                const thinkingContent = thinkingElement.querySelector('.thinking span');
                if (thinkingContent) {
                    thinkingContent.textContent = 'Searching the web...';
                }
            }
            
            // Current datetime for searchgpt
            const currentDatetime = new Date().toISOString();
            // Use -1 for random seed by default
            const randomSeed = -1;
            
            // Make a request to searchgpt model using the provided payload format
            const systemMessage = `its ${currentDatetime} today! always use web tool before replying and perform websearch. Convert the UTC time accordingly to user's timezone if provided`;
            
            const searchPayload = {
                "model": "searchgpt",
                "messages": [
                    {"role": "system", "content": systemMessage},
                    {"role": "user", "content": `Perform search for: ${query}`}
                ],
                "temperature": 1.0,
                "top_p": 1.0,
                "seed": randomSeed,
                "private": true,
                "nofeed": true,
                "token": "gacha11211",
                "referrer": "gacha11211"
            };
            
            // Update thinking indicator
            if (thinkingElement) {
                const thinkingContent = thinkingElement.querySelector('.thinking span');
                if (thinkingContent) {
                    thinkingContent.textContent = 'Searching the web...';
                }
            }
            
            // Make the request to searchgpt
            const response = await fetch("https://text.pollinations.ai/openai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(searchPayload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }
            
            const result = await response.json();
            const searchResponse = result.choices[0].message.content;
            
            // Update thinking indicator
            if (thinkingElement) {
                const thinkingContent = thinkingElement.querySelector('.thinking span');
                if (thinkingContent) {
                    thinkingContent.textContent = 'Processing search results...';
                }
            }
            
            // Now pass search results to the main model
            const selectedModel = modelSelect.value;
            
            // Create a prompt that includes the search results
            const enhancedPrompt = `I searched for: "${query}"\n\nSearch results:\n${searchResponse}\n\nBased on these search results, please provide a helpful response.`;
            
            // Now get response from the main model with the search results
            await getAIResponse(enhancedPrompt, null, null, thinkingElement, query);
            
        } catch (error) {
            console.error("Error performing web search:", error);
            throw new Error(`Web search failed: ${error.message}`);
        }
    }

    // Handle regenerating the last response
    async function handleRegenerateResponse() {
        if (isWaitingForResponse || !lastQuery) return;

        // Get the last messages for context
        const currentChat = conversations[currentChatId];
        let lastUploadData = null;
        let lastUploadType = null;
        
        // Set the regenerating flag to true (using seed -1 for randomness)
        isRegenerating = true;
        
        // Check if the last user message had an upload
        if (currentChat && currentChat.messages.length >= 2) {
            const userMessages = currentChat.messages.filter(msg => msg.role === 'user');
            if (userMessages.length > 0) {
                const lastUserMsg = userMessages[userMessages.length - 1];
                if (lastUserMsg.image) {
                    lastUploadData = lastUserMsg.image;
                    lastUploadType = lastUserMsg.fileType || 
                        (lastUserMsg.image ? 'image/jpeg' : null);
                }
            }
        }

        // Remove the last bot message
        const botMessages = chatArea.querySelectorAll('.message.bot');
        if (botMessages.length > 0) {
            chatArea.removeChild(botMessages[botMessages.length - 1]);
        }

        // Add thinking indicator
        const thinkingElement = addThinkingIndicator();

        // Get response from AI with a new seed
        isWaitingForResponse = true;
        regenerateBtn.disabled = true;
        searchBtn.disabled = true;
        
        try {
            // Using seed -1 for randomness
            // isRegenerating flag is only used for handling the message UI
            
            // For regeneration, we should include any uploads from the original message
            await getAIResponse(lastQuery, lastUploadData, lastUploadType, thinkingElement);
            
            isRegenerating = false; // Reset flag after regeneration is done
            regenerateBtn.disabled = false;
            searchBtn.disabled = false;
        } catch (error) {
            removeBotThinkingIndicator();
            addErrorMessage(error.message);
            console.error('Error regenerating AI response:', error);
            regenerateBtn.disabled = false;
            searchBtn.disabled = false;
        } finally {
            isWaitingForResponse = false;
        }
    }

    // Add thinking indicator while waiting for AI response
    function addThinkingIndicator() {
        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'message bot';
        thinkingElement.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="thinking">
                    <span>Thinking</span>
                    <div class="dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
            </div>
        `;
        chatArea.appendChild(thinkingElement);
        chatArea.scrollTop = chatArea.scrollHeight;
        return thinkingElement;
    }

    // Remove the thinking indicator
    function removeBotThinkingIndicator() {
        const thinkingElements = document.querySelectorAll('.message.bot .thinking');
        if (thinkingElements.length > 0) {
            const thinkingContainer = thinkingElements[thinkingElements.length - 1].closest('.message.bot');
            if (thinkingContainer && thinkingContainer.parentNode) {
                thinkingContainer.parentNode.removeChild(thinkingContainer);
            }
        }
    }
    
    // Make these functions globally available for imageGeneration.js
    window.removeBotThinkingIndicator = removeBotThinkingIndicator;
    window.addErrorMessage = addErrorMessage;
    window.saveConversation = saveConversation;
    window.updateChatHistorySidebar = updateChatHistorySidebar;

    // Add an error message to the chat
    function addErrorMessage(errorMessage) {
        const errorElement = document.createElement('div');
        errorElement.className = 'message bot';
        
        // More user-friendly error messages
        let friendlyMessage = 'Please try again later.';
        let detailedError = errorMessage;
        
        // Check for common error patterns
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            friendlyMessage = 'The AI service is experiencing high demand right now. Please wait a moment and try again.';
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            friendlyMessage = 'The AI service endpoint could not be found. This might be a temporary issue.';
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            friendlyMessage = 'Access to the AI service is currently restricted.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server')) {
            friendlyMessage = 'The AI service is experiencing technical difficulties. Please try again later.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            friendlyMessage = 'The request timed out. The service might be experiencing high demand.';
        } else if (errorMessage.includes('network') || errorMessage.includes('offline')) {
            friendlyMessage = 'Please check your internet connection and try again.';
        }
        
        errorElement.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <p><strong>Sorry, there was an error connecting to the AI service.</strong></p>
                <p>${friendlyMessage}</p>
                <details>
                    <summary>Technical details</summary>
                    <p class="error-details">${detailedError}</p>
                </details>
            </div>
        `;
        chatArea.appendChild(errorElement);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Get AI response from the API
    async function getAIResponse(query, uploadBase64, uploadType, thinkingElement, displayQuery = null) {
        // Cancel any existing streaming response
        if (currentReader) {
            try {
                await currentReader.cancel();
            } catch (e) {
                console.error("Error canceling previous stream:", e);
            }
        }

        // Change send button to pause button
        updateSendButtonForStreaming(true);

        // Use seed -1 for randomness in all responses
        const randomSeed = -1;
        lastSeed = randomSeed;

        // Get selected model
        const selectedModel = modelSelect.value;

        // Get system prompt for the selected model
        let systemPrompt = getModelSystemPrompt(selectedModel);

        // Add current datetime only for searchgpt
        if (selectedModel === 'searchgpt') {
            const currentDatetime = new Date().toISOString();
            systemPrompt = `${systemPrompt}. Current date and time: ${currentDatetime}`;
        }

        // Prepare messages array with system prompt (except for models that don't support system role)
        const messages = [];
        
        // Some models like openai-reasoning don't support system role or streaming
        const noSystemRoleModels = ['openai-reasoning'];
        // Models that don't support streaming
        const noStreamingModels = ['openai-reasoning'];
        
        if (!noSystemRoleModels.includes(selectedModel)) {
            messages.push({ 
                "role": "system", 
                "content": systemPrompt
            });
        } else {
            // For models that don't support system role, add as user message with special prefix
            messages.push({
                "role": "user",
                "content": `[SYSTEM] ${systemPrompt}\n\nPlease acknowledge these instructions.`
            });
            
            // Add assistant response to acknowledge system instructions
            messages.push({
                "role": "assistant",
                "content": "I understand these instructions and will act as a helpful AI assistant."
            });
        }

        // Add conversation history for memory if this is not the first message in the conversation
        if (conversations[currentChatId] && conversations[currentChatId].messages.length > 0) {
            // Get all messages from the current chat to ensure complete memory
            // Previously this was limited to last 10 to avoid token limits, but per requirement we need to maintain full history
            const contextMessages = conversations[currentChatId].messages;
            
            // Only add history if we're not in search mode or regenerating
            if (!displayQuery) {
                contextMessages.forEach(msg => {
                    if (msg.image) {
                        // For messages with images, we need special handling
                        if (msg.role === 'user') {
                            messages.push({
                                "role": "user",
                                "content": [
                                    { "type": "text", "text": msg.content || "What's in this image?" },
                                    { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${msg.image}` } }
                                ]
                            });
                        } else {
                            messages.push({
                                "role": msg.role === 'bot' ? 'assistant' : msg.role,
                                "content": msg.content
                            });
                        }
                    } else {
                        // For text-only messages
                        messages.push({
                            "role": msg.role === 'bot' ? 'assistant' : msg.role,
                            "content": msg.content
                        });
                    }
                });
            }
        }

        // Handle file/image processing
        let processedQuery = query;
        let imageDescription = null;
        let fileContent = null;

        // If there's an upload, process it
        if (uploadBase64) {
            try {
                if (thinkingElement) {
                    const thinkingContent = thinkingElement.querySelector('.thinking span');
                    if (thinkingContent) {
                        thinkingContent.textContent = 'Processing your upload...';
                    }
                }

                // Access the file name that was stored during upload if available
                const actualFileName = lastFileName || "uploaded file";

                if (uploadType && uploadType.startsWith('image/')) {
                    // For images, we can use openai-large to get a description if not already using it
                    if (selectedModel !== 'openai-large') {
                        // Use -1 for random seed
                        const imageProcessingRandomSeed = -1;
                        
                        // Process image with openai-large first
                        const imageProcessingPayload = {
                            "model": "openai-large",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "Describe this image in detail but concisely."
                                },
                                {
                                    "role": "user",
                                    "content": [
                                        { "type": "text", "text": "What's in this image? Provide a clear description." },
                                        { "type": "image_url", "image_url": { "url": `data:${uploadType};base64,${uploadBase64}` } }
                                    ]
                                }
                            ],
                            "temperature": 0.7,
                            "stream": false,
                            "seed": imageProcessingRandomSeed,
                            "private": true,
                            "nofeed": true,
                            "token": "gacha11211",
                            "referrer": "gacha11211"
                        };

                        const imageProcessingResponse = await fetch("https://text.pollinations.ai/openai", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(imageProcessingPayload)
                        });

                        if (imageProcessingResponse.ok) {
                            const imageProcessingResult = await imageProcessingResponse.json();
                            imageDescription = imageProcessingResult.choices[0].message.content;
                            processedQuery = `${query || "What's in this image?"}\n\nImage description: ${imageDescription}`;
                        }
                    }
                } else if (uploadType) {
                    // For non-image files with all models
                    let fileContentText = "";
                    let fileTypeDisplay = uploadType.split('/').pop();
                    
                    // Try to extract content based on file type
                    if (uploadType === 'application/pdf') {
                        fileContentText = "PDF file (base64 encoded)";
                    } else if (uploadType === 'text/plain' || 
                              uploadType === 'text/javascript' || 
                              uploadType === 'text/html' || 
                              uploadType === 'text/css' ||
                              uploadType === 'application/json' ||
                              uploadType === 'text/x-python') {
                        try {
                            fileContentText = atob(uploadBase64);
                        } catch (e) {
                            fileContentText = "[File content could not be decoded]";
                            console.error("Error decoding file:", e);
                        }
                    }
                    
                    // Check if we need to process with openai-large first
                    if (selectedModel !== 'openai-large' && fileContentText) {
                        // Use -1 for random seed
                        const fileProcessingRandomSeed = -1;
                        
                        const fileProcessingPayload = {
                            "model": "openai-large",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "Extract and summarize key information from this file."
                                },
                                {
                                    "role": "user",
                                    "content": `Please analyze this file content (${actualFileName}) and provide a summary:\n\n${fileContentText}`
                                }
                            ],
                            "temperature": 0.7,
                            "stream": false,
                            "seed": fileProcessingRandomSeed,
                            "private": true,
                            "nofeed": true,
                            "token": "gacha11211",
                            "referrer": "gacha11211"
                        };

                        const fileProcessingResponse = await fetch("https://text.pollinations.ai/openai", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(fileProcessingPayload)
                        });

                        if (fileProcessingResponse.ok) {
                            const fileProcessingResult = await fileProcessingResponse.json();
                            fileContent = fileProcessingResult.choices[0].message.content;
                            processedQuery = `${query || `I'm uploading a file: ${actualFileName}.`}\n\nFile content analysis: ${fileContent}`;
                        }
                    }
                }

                // Update thinking indicator
                if (thinkingElement) {
                    const thinkingContent = thinkingElement.querySelector('.thinking span');
                    if (thinkingContent) {
                        thinkingContent.textContent = 'Getting response...';
                    }
                }
            } catch (error) {
                console.error("Error preprocessing upload:", error);
                // Continue with original query if preprocessing fails
            }
        }

        // Add current query with file if provided
        if (uploadBase64) {
            // Get the actual filename if available
            const fileName = lastFileName || "uploaded file";
            
            if (uploadType && uploadType.startsWith('image/')) {
                if (selectedModel === 'openai-large') {
                    // For openai-large, send the image directly
                    messages.push({
                        "role": "user",
                        "content": [
                            { "type": "text", "text": query || `What's in this image? (${fileName})` },
                            { "type": "image_url", "image_url": { "url": `data:${uploadType};base64,${uploadBase64}` } }
                        ]
                    });
                } else {
                    // For other models, only send the text content with description
                    // Don't include image data in any format to avoid API errors
                    let imageMessage = "";
                    
                    // If we have an image description from preprocessing, use it
                    if (imageDescription) {
                        imageMessage = `${query || "What's in this image?"}\n\nImage description: ${imageDescription}`;
                    } else {
                        imageMessage = `${query || "What's in this image?"} (Note: Image was uploaded but cannot be processed by this model)`;
                    }
                    
                    messages.push({
                        "role": "user",
                        "content": imageMessage
                    });
                }
            } else {
                // For non-image files
                if (fileContent) {
                    // If we have processed file content, use it
                    messages.push({
                        "role": "user",
                        "content": processedQuery || `${query || `I'm uploading a file called ${fileName}.`}`
                    });
                } else {
                    // Otherwise use a basic message
                    try {
                        if (uploadType === 'application/pdf') {
                            messages.push({
                                "role": "user",
                                "content": `${query || `I'm uploading a PDF file named "${fileName}".`}\n\nFile content (base64 encoded PDF): [Base64 content too large to display]`
                            });
                        } else if (uploadType === 'text/plain' || 
                                 uploadType === 'text/javascript' || 
                                 uploadType === 'text/html' || 
                                 uploadType === 'text/css' ||
                                 uploadType === 'application/json' ||
                                 uploadType === 'text/x-python') {
                            try {
                                const text = atob(uploadBase64);
                                messages.push({
                                    "role": "user",
                                    "content": `${query || `I'm uploading a file named "${fileName}".`}\n\nFile content:\n\`\`\`\n${text}\n\`\`\``
                                });
                            } catch (e) {
                                console.error("Error decoding file:", e);
                                messages.push({
                                    "role": "user",
                                    "content": `${query || `I'm uploading a file named "${fileName}".`}\n\nFile content could not be decoded.`
                                });
                            }
                        } else {
                            // Default for other file types
                            messages.push({
                                "role": "user",
                                "content": `${query || `I'm uploading a file named "${fileName}".`}\n\nFile of type ${uploadType} uploaded (base64 encoded).`
                            });
                        }
                    } catch (e) {
                        console.error("Error processing file:", e);
                        messages.push({
                            "role": "user",
                            "content": `${query || `I'm uploading a file named "${fileName}".`}\n\nFile of type ${uploadType} uploaded, but could not be processed.`
                        });
                    }
                }
            }
        } else {
            // Just a regular text query
            messages.push({
                "role": "user",
                "content": query
            });
        }

        // Get system prompt for this model if available
        let systemPrompt = "";
        if (window.getModelSystemPrompt) {
            systemPrompt = window.getModelSystemPrompt(selectedModel);
        }
        
        // Check if this model needs special handling for system prompts (like openai-reasoning)
        const modelConfig = window.modelConfigurations && window.modelConfigurations[selectedModel];
        const useUserRoleForSystem = modelConfig && modelConfig.useUserRoleForSystem;
        
        // Add system prompt to messages if it exists and there isn't already a system message
        if (systemPrompt && !messages.some(msg => msg.role === 'system')) {
            if (useUserRoleForSystem) {
                // For models that don't support system role, we add it to the first user message
                // or create a new user message if there are none
                if (messages.length > 0 && messages[0].role === 'user') {
                    messages[0].content = `${systemPrompt}\n\n${messages[0].content}`;
                } else {
                    messages.unshift({
                        "role": "user",
                        "content": systemPrompt
                    });
                }
            } else {
                // Normal handling for system prompts
                messages.unshift({
                    "role": "system",
                    "content": systemPrompt
                });
            }
        }
        
        // Prepare the payload
        const payload = {
            "model": selectedModel,
            "messages": messages,
            "temperature": 1.0,  // Using default temperature as some models require this
            "top_p": 1.0,
            "seed": randomSeed,
            "stream": !noStreamingModels.includes(selectedModel), // Disable streaming for incompatible models
            "private": true,
            "nofeed": true,
            "token": "gacha11211",  // Updated token
            "referrer": "gacha11211" // Updated referrer
        };
        
        // Special handling for openai-reasoning model to avoid the system role issue
        if (selectedModel === 'openai-reasoning') {
            // Remove any system messages that might cause the API error
            const filteredMessages = messages.filter(msg => msg.role !== 'system');
            payload.messages = filteredMessages;
        }

        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
            try {
                const response = await fetch("https://text.pollinations.ai/openai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    
                    // Check for rate limiting (429) error
                    if (response.status === 429 && retryCount < maxRetries) {
                        retryCount++;
                        
                        // Update thinking indicator to show retry status
                        if (thinkingElement) {
                            const thinkingContent = thinkingElement.querySelector('.thinking span');
                            if (thinkingContent) {
                                thinkingContent.textContent = `Rate limited. Retrying (${retryCount}/${maxRetries})...`;
                            }
                        }
                        
                        // Wait before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    }
                    
                    throw new Error(`API Error (${response.status}): ${errorText}`);
                }

                // Check if the response is streaming or not based on the payload setting
                if (payload.stream) {
                    // Process the streaming response
                    const reader = response.body.getReader();
                    currentReader = reader;
                    
                    let botMessageElement = null;
                    let responseContent = '';
                    const decoder = new TextDecoder();
                    let openCodeBlocks = new Set(); // Track open code blocks

                    // Handle cancellation through pause button
                    const onPauseClick = async () => {
                        if (currentReader) {
                            try {
                                await currentReader.cancel();
                                console.log("Stream canceled by user");
                                // Restore send button
                                updateSendButtonForStreaming(false);
                                isWaitingForResponse = false;
                                currentReader = null;
                            } catch (e) {
                                console.error("Error canceling stream:", e);
                            }
                        }
                    };
                    
                    // Attach event listener to pause button
                    sendBtn.addEventListener('click', onPauseClick);

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            
                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split('\n').filter(line => line.trim() !== '');
                            
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    
                                    if (data === '[DONE]') continue;
                                    
                                    try {
                                        const parsedData = JSON.parse(data);
                                        if (parsedData.choices && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                                            const content = parsedData.choices[0].delta.content;
                                            responseContent += content;
                                            
                                            // Create bot message element if it doesn't exist
                                            if (!botMessageElement) {
                                                // Remove thinking indicator
                                                removeBotThinkingIndicator();
                                                
                                                // Add bot message
                                                botMessageElement = document.createElement('div');
                                                botMessageElement.className = 'message bot';
                                                botMessageElement.innerHTML = `
                                                    <div class="message-avatar">AI</div>
                                                    <div class="message-content"></div>
                                                `;
                                                chatArea.appendChild(botMessageElement);
                                            }
                                            
                                            // Before updating, capture any open code blocks
                                            if (botMessageElement) {
                                                const details = botMessageElement.querySelectorAll('details.code-details');
                                                openCodeBlocks.clear();
                                                details.forEach((detail, index) => {
                                                    if (detail.hasAttribute('open')) {
                                                        openCodeBlocks.add(index);
                                                    }
                                                });
                                            }
                                            
                                            // Update content with markdown rendering
                                            const messageContent = botMessageElement.querySelector('.message-content');
                                            messageContent.innerHTML = formatMessage(responseContent);
                                            
                                            // Restore open state of code blocks
                                            const updatedDetails = messageContent.querySelectorAll('details.code-details');
                                            openCodeBlocks.forEach(index => {
                                                if (index < updatedDetails.length) {
                                                    updatedDetails[index].setAttribute('open', '');
                                                }
                                            });
                                            
                                            // Add event listeners to copy buttons
                                            addCopyButtonListeners();
                                            
                                            // Add event listeners to download buttons
                                            addDownloadButtonListeners();
                                            
                                            // Add event listeners to run code buttons
                                            addRunCodeButtonListeners();
                                            
                                            // Use the smart scroll function to maintain proper scroll position
                                            if (window.smartScroll) {
                                                window.smartScroll();
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error parsing streaming data:', e, data);
                                    }
                                }
                            }
                        }
                    } finally {
                        // Always remove the pause button event listener when done
                        sendBtn.removeEventListener('click', onPauseClick);
                        // Restore send button
                        updateSendButtonForStreaming(false);
                    }
                } else {
                    // Handle non-streaming response for models like openai-reasoning
                    try {
                        // Parse the JSON response
                        const result = await response.json();
                        
                        // Extract the complete message
                        let responseContent = '';
                        if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                            responseContent = result.choices[0].message.content;
                        }
                        
                        // Remove thinking indicator
                        removeBotThinkingIndicator();
                        
                        // Create and add bot message with the complete response
                        const botMessageElement = document.createElement('div');
                        botMessageElement.className = 'message bot';
                        botMessageElement.innerHTML = `
                            <div class="message-avatar">AI</div>
                            <div class="message-content">${formatMessage(responseContent)}</div>
                        `;
                        chatArea.appendChild(botMessageElement);
                        
                        // Add event listeners to buttons
                        addCopyButtonListeners();
                        addDownloadButtonListeners();
                        addRunCodeButtonListeners();
                        
                        // Add long-press listeners
                        const messageContent = botMessageElement.querySelector('.message-content');
                        if (messageContent) {
                            addLongPressListeners(messageContent);
                        }
                        
                        // Scroll to bottom
                        chatArea.scrollTop = chatArea.scrollHeight;
                        
                        // Restore send button
                        updateSendButtonForStreaming(false);
                        
                        // Save conversation to history
                        if (responseContent) {
                            const queryToSave = displayQuery || query;
                            saveConversation(queryToSave, responseContent, uploadBase64, uploadType);
                            
                            // Update the chat history sidebar
                            updateChatHistorySidebar();
                        }
                    } catch (error) {
                        console.error('Error processing non-streaming response:', error);
                        throw error;
                    }
                }
                
                // Note: Conversation saving is now handled inside the streaming/non-streaming blocks
                
                // If we got here, the request was successful
                break;
                
            } catch (error) {
                // If we've exhausted our retries, throw the error
                if (retryCount >= maxRetries) {
                    console.error('Error fetching response:', error);
                    // Restore send button regardless of error
                    updateSendButtonForStreaming(false);
                    throw error;
                }
                
                // Otherwise increment retry count and try again
                retryCount++;
                
                // Update thinking indicator
                if (thinkingElement) {
                    const thinkingContent = thinkingElement.querySelector('.thinking span');
                    if (thinkingContent) {
                        thinkingContent.textContent = `Error. Retrying (${retryCount}/${maxRetries})...`;
                    }
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
        currentReader = null;
        // Ensure send button is restored
        updateSendButtonForStreaming(false);
    }
    
    // Helper function to update send button state during streaming
    function updateSendButtonForStreaming(isStreaming) {
        if (isStreaming) {
            // Change to pause button
            sendBtn.innerHTML = '<i class="fas fa-pause"></i>';
            sendBtn.title = 'Stop generation';
            sendBtn.classList.add('streaming');
        } else {
            // Change back to send button
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.title = 'Send message';
            sendBtn.classList.remove('streaming');
        }
    }
    
    // Handle code execution using Pyodide or other interpreters
    async function executeCode(code, language) {
        console.log(`Executing ${language} code: ${code.substring(0, 100)}...`);
        
        // Make sure code execution area is visible
        codeExecutionArea.style.display = 'block';
        codeOutput.innerHTML = '<div class="output-line">Running code...</div>';
        
        // Add this flag to prevent multiple simultaneous executions
        if (isExecutingCode) {
            codeOutput.innerHTML += '<div class="output-line output-error">Another code execution is already in progress. Please wait.</div>';
            return;
        }
        
        isExecutingCode = true;
        
        try {
            if (language === 'python' || language === 'py') {
                await executePythonCode(code);
            } else if (language === 'javascript' || language === 'js') {
                executeJavaScriptCode(code);
            } else {
                codeOutput.innerHTML = `<div class="output-line output-error">Code execution for ${language} is not supported yet.</div>`;
            }
        } catch (error) {
            codeOutput.innerHTML += `<div class="output-line output-error">Error: ${error.message}</div>`;
        } finally {
            isExecutingCode = false;
        }
    }
    
    // Execute Python code using Pyodide
    async function executePythonCode(code) {
        try {
            // Check if Pyodide is loaded
            if (!pyodideInstance) {
                codeOutput.innerHTML = '<div class="output-header"><span>Python Initialization</span></div>';
                codeOutput.innerHTML += '<div class="output-logs"><div class="output-line output-stdout">Loading Python interpreter...</div></div>';
                await initPyodide();
                if (!pyodideInstance) {
                    throw new Error("Failed to initialize Python interpreter");
                }
            }
            
            // Create a clean output area
            codeOutput.innerHTML = '';
            
            // Add a header for technical report style
            const header = document.createElement('div');
            header.className = 'output-header';
            header.innerHTML = '<span>Python Execution</span>';
            codeOutput.appendChild(header);
            
            // Create container for logs
            const logsContainer = document.createElement('div');
            logsContainer.className = 'output-logs';
            
            // Add initial running message
            const initialMsg = document.createElement('div');
            initialMsg.className = 'output-line output-stdout';
            initialMsg.textContent = 'Running Python code...';
            logsContainer.appendChild(initialMsg);
            
            codeOutput.appendChild(logsContainer);
            
            // Collect stdout and stderr
            const outputLines = [];
            
            // Redirect stdout and stderr
            pyodideInstance.setStdout({
                write: (text) => {
                    outputLines.push({ type: 'stdout', text });
                    const line = document.createElement('div');
                    line.className = 'output-line output-stdout';
                    line.textContent = text;
                    logsContainer.appendChild(line);
                    codeOutput.scrollTop = codeOutput.scrollHeight;
                }
            });
            
            pyodideInstance.setStderr({
                write: (text) => {
                    outputLines.push({ type: 'stderr', text });
                    const line = document.createElement('div');
                    line.className = 'output-line output-stderr';
                    line.textContent = text;
                    logsContainer.appendChild(line);
                    codeOutput.scrollTop = codeOutput.scrollHeight;
                }
            });
            
            // Preprocess code to handle common input issues
            // This fixes the EOFError by adding proper line endings and input handling
            const processedCode = `
# Add mock input function to prevent EOFError
import sys
from io import StringIO

class MockInputManager:
    def __init__(self, predefined_inputs=None):
        self.predefined_inputs = predefined_inputs or [""]
        self.input_index = 0
    
    def mock_input(self, prompt=""):
        print(prompt, end="")
        if self.predefined_inputs and self.input_index < len(self.predefined_inputs):
            value = self.predefined_inputs[self.input_index]
            self.input_index += 1
            print(value)  # Echo the "entered" value
            return value
        return ""

# Set up mock input handler
mock_manager = MockInputManager(["sample input", "another input", "more input"])
__builtins__.input = mock_manager.mock_input

# Actual user code begins here
${code}
`;
            
            // Execute code with the preprocessed version
            const result = await pyodideInstance.runPythonAsync(processedCode);
            
            // Display result if any
            if (result !== undefined) {
                const resultElem = document.createElement('div');
                resultElem.className = 'output-result';
                
                let resultText;
                if (typeof result === 'object') {
                    try {
                        resultText = JSON.stringify(result, null, 2);
                    } catch (e) {
                        resultText = result.toString();
                    }
                } else {
                    resultText = result.toString();
                }
                
                resultElem.textContent = 'Result: ' + resultText;
                codeOutput.appendChild(resultElem);
                codeOutput.scrollTop = codeOutput.scrollHeight;
            }
        } catch (error) {
            if (codeOutput.children.length === 0) {
                // If we have no output yet, create the structure
                codeOutput.innerHTML = '';
                const header = document.createElement('div');
                header.className = 'output-header';
                header.innerHTML = '<span>Python Execution Error</span>';
                codeOutput.appendChild(header);
                
                const logsContainer = document.createElement('div');
                logsContainer.className = 'output-logs';
                codeOutput.appendChild(logsContainer);
            }
            
            // Find the logs container
            const logsContainer = codeOutput.querySelector('.output-logs');
            
            const errorElem = document.createElement('div');
            errorElem.className = 'output-line output-stderr';
            errorElem.textContent = 'Error: ' + error.message;
            logsContainer.appendChild(errorElem);
            
            // Add helpful message for EOFError specifically
            if (error.message.includes('EOFError') || error.message.includes('EOF when reading a line')) {
                const helpElem = document.createElement('div');
                helpElem.className = 'output-line output-stderr';
                helpElem.innerHTML = `<br>This error typically occurs when Python is trying to read input. In this web environment, we've provided mock inputs, but they may not match what your code expects. Try modifying your code to avoid using input() or provide default values.`;
                logsContainer.appendChild(helpElem);
            }
            
            codeOutput.scrollTop = codeOutput.scrollHeight;
        }
    }
    
    // Execute JavaScript code
    function executeJavaScriptCode(code) {
        try {
            codeOutput.innerHTML = '<div class="output-line">Running JavaScript code...</div>';
            
            // Create a safe execution environment
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            const originalConsoleWarn = console.warn;
            const logs = [];
            
            // Hijack console methods
            console.log = (...args) => {
                logs.push({ type: 'log', message: args.map(a => String(a)).join(' ') });
                originalConsoleLog.apply(console, args);
            };
            
            console.error = (...args) => {
                logs.push({ type: 'error', message: args.map(a => String(a)).join(' ') });
                originalConsoleError.apply(console, args);
            };
            
            console.warn = (...args) => {
                logs.push({ type: 'warn', message: args.map(a => String(a)).join(' ') });
                originalConsoleWarn.apply(console, args);
            };
            
            // Execute in a try-catch to handle syntax errors
            let result;
            try {
                // Create a function from the code to get return values
                const executeFunction = new Function(`
                    "use strict";
                    ${code};
                    return eval("undefined");
                `);
                
                result = executeFunction();
            } catch (error) {
                logs.push({ type: 'error', message: 'Execution error: ' + error.message });
            }
            
            // Display all logs
            codeOutput.innerHTML = '';
            
            // Add a header for technical report style
            const header = document.createElement('div');
            header.className = 'output-header';
            header.innerHTML = '<span>Execution Output</span>';
            codeOutput.appendChild(header);
            
            // Create container for logs
            const logsContainer = document.createElement('div');
            logsContainer.className = 'output-logs';
            
            logs.forEach(log => {
                const line = document.createElement('div');
                line.className = `output-line output-${log.type === 'error' ? 'stderr' : 'stdout'}`;
                line.textContent = log.message;
                logsContainer.appendChild(line);
            });
            
            codeOutput.appendChild(logsContainer);
            
            // Display result if any
            if (result !== undefined) {
                const resultElem = document.createElement('div');
                resultElem.className = 'output-result';
                
                let resultText;
                if (typeof result === 'object') {
                    try {
                        resultText = JSON.stringify(result, null, 2);
                    } catch (e) {
                        resultText = result.toString();
                    }
                } else {
                    resultText = result.toString();
                }
                
                resultElem.textContent = 'Result: ' + resultText;
                codeOutput.appendChild(resultElem);
            }
            
            // Restore console methods
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            
            // Scroll to bottom
            codeOutput.scrollTop = codeOutput.scrollHeight;
            
        } catch (error) {
            codeOutput.innerHTML += `<div class="output-line output-error">Error: ${error.message}</div>`;
        }
    }

    // Add a message to the chat area
    function addMessageToChat(role, content, uploadBase64 = null, uploadType = null) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        
        let avatarContent = role === 'user' ? 'You' : 'AI';
        let messageContent = content;
        
        // Handle different types of content
        if (uploadBase64) {
            if (uploadType === 'image_generation') {
                // This is a saved generated image
                const placeholderText = content || 'Generated image';
                messageContent = window.renderSavedImageData(uploadBase64, 1, placeholderText);
            }
            else if (uploadType && uploadType.startsWith('image/')) {
                // If it's an uploaded image, display it - don't add text above the image if content is empty
                if (content && content.trim() !== '') {
                    messageContent = `${content}<br><img src="data:${uploadType};base64,${uploadBase64}" alt="Uploaded Image">`;
                } else {
                    messageContent = `<img src="data:${uploadType};base64,${uploadBase64}" alt="Uploaded Image">`;
                }
            } else {
                // For other file types, show a note but don't embed the content
                const fileType = uploadType ? uploadType.split('/').pop() : 'unknown';
                messageContent = `${content || ''}<br><div class="file-attachment"><i class="fas fa-file"></i> Uploaded ${fileType} file</div>`;
            }
        } else if (role === 'bot' && content && content.includes('Generated') && content.includes('image')) {
            // Handle case where bot message indicates an image was generated but the image data isn't available
            messageContent = `<p>${content}</p><p class="missing-image-note">Image not available</p>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-avatar">${avatarContent}</div>
            <div class="message-content">${formatMessage(messageContent)}</div>
        `;
        
        // Add to chat area
        chatArea.appendChild(messageElement);
        
        // Scroll to bottom
        chatArea.scrollTop = chatArea.scrollHeight;
        
        // Add event listeners to buttons
        addCopyButtonListeners();
        addDownloadButtonListeners();
        addRunCodeButtonListeners();
        
        // Set up carousel controls if this is a multi-image message
        const carousel = messageElement.querySelector('.image-carousel');
        if (carousel) {
            const prevBtn = messageElement.querySelector('.prev-btn');
            const nextBtn = messageElement.querySelector('.next-btn');
            
            if (prevBtn && !prevBtn.hasListener) {
                prevBtn.addEventListener('click', () => {
                    carousel.scrollBy({ left: -carousel.clientWidth, behavior: 'smooth' });
                });
                prevBtn.hasListener = true;
            }
            
            if (nextBtn && !nextBtn.hasListener) {
                nextBtn.addEventListener('click', () => {
                    carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' });
                });
                nextBtn.hasListener = true;
            }
        }
        
        // Setup fullscreen for images
        const images = messageElement.querySelectorAll('.fullscreen-image');
        images.forEach(img => {
            img.addEventListener('click', function() {
                if (window.openImageFullscreen) {
                    window.openImageFullscreen(this);
                }
            });
        });
        
        // Add long-press functionality for context menu on messages
        if (role === 'bot') {
            addLongPressListeners(messageElement.querySelector('.message-content'));
        }
        
        // Hide welcome message if visible
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }
    
    // Add long-press event listeners to message content
    function addLongPressListeners(element) {
        let longPressTimer;
        const longPressDuration = 500; // ms
        
        // Remove any existing listeners to avoid duplicates
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('contextmenu', handleContextMenu);
        
        // Store the element-specific handlers
        function handleTouchStart(e) {
            // Store touch position for later comparison
            element.touchStartX = e.touches[0].clientX;
            element.touchStartY = e.touches[0].clientY;
            
            longPressTimer = setTimeout(() => {
                // Only trigger if it's a relatively stationary press
                if (element.touchMoved !== true) {
                    showMessageContextMenu(e, element);
                    // Vibrate if supported
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }, longPressDuration);
        }
        
        function handleTouchEnd() {
            clearTimeout(longPressTimer);
            element.touchMoved = false;
        }
        
        function handleTouchMove(e) {
            if (!e.touches[0]) return;
            
            // Calculate how far the touch has moved
            const diffX = Math.abs(element.touchStartX - e.touches[0].clientX);
            const diffY = Math.abs(element.touchStartY - e.touches[0].clientY);
            
            // If moved more than 10px, consider it a move, not a press
            if (diffX > 10 || diffY > 10) {
                element.touchMoved = true;
                clearTimeout(longPressTimer);
            }
        }
        
        function handleContextMenu(e) {
            e.preventDefault();
            showMessageContextMenu(e, element);
        }
        
        // Add the listeners
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('contextmenu', handleContextMenu);
        
        // Store the handlers on the element for potential later removal
        element.handleTouchStart = handleTouchStart;
        element.handleTouchEnd = handleTouchEnd;
        element.handleTouchMove = handleTouchMove;
        element.handleContextMenu = handleContextMenu;
        
        // Mark as having listeners
        element.hasLongPressListeners = true;
    }
    
    // Make the function globally available for imageGeneration.js
    window.addLongPressListeners = addLongPressListeners;
    
    // Show context menu for messages
    function showMessageContextMenu(event, element) {
        // Remove any existing context menus
        const existingMenu = document.querySelector('.message-context-menu');
        if (existingMenu) {
            document.body.removeChild(existingMenu);
        }
        
        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'message-context-menu';
        
        // Add menu options
        contextMenu.innerHTML = `
            <div class="menu-option" id="copy-all">
                <i class="fas fa-copy"></i> Copy entire message
            </div>
            <div class="menu-option" id="copy-selection">
                <i class="fas fa-cut"></i> Copy selection
            </div>
            <div class="menu-option" id="menu-close">
                <i class="fas fa-times"></i> Close
            </div>
        `;
        
        // Position the menu
        const rect = element.getBoundingClientRect();
        let x, y;
        
        if (event.touches && event.touches[0]) {
            // Touch event
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            // Mouse event
            x = event.clientX;
            y = event.clientY;
        }
        
        // Make sure menu stays in viewport
        contextMenu.style.position = 'fixed';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
        contextMenu.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
        
        // Add to DOM
        document.body.appendChild(contextMenu);
        
        // Add event listeners
        document.getElementById('copy-all').addEventListener('click', () => {
            // Get text content without HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = element.innerHTML;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            navigator.clipboard.writeText(textContent)
                .then(() => {
                    showToast('Message copied to clipboard');
                })
                .catch(err => {
                    console.error('Error copying text: ', err);
                    showToast('Failed to copy to clipboard');
                });
                
            document.body.removeChild(contextMenu);
        });
        
        document.getElementById('copy-selection').addEventListener('click', () => {
            // Get current selection
            const selection = window.getSelection();
            const selectedText = selection.toString();
            
            if (selectedText) {
                navigator.clipboard.writeText(selectedText)
                    .then(() => {
                        showToast('Selection copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Error copying text: ', err);
                        showToast('Failed to copy to clipboard');
                    });
            } else {
                showToast('No text selected');
            }
            
            document.body.removeChild(contextMenu);
        });
        
        document.getElementById('menu-close').addEventListener('click', () => {
            document.body.removeChild(contextMenu);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu(e) {
            if (!contextMenu.contains(e.target)) {
                if (document.body.contains(contextMenu)) {
                    document.body.removeChild(contextMenu);
                }
                document.removeEventListener('click', closeMenu);
            }
        });
    }
    
    // Show a toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after animation completes
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // Format message with Markdown and code highlighting
    function formatMessage(message) {
        if (!message) return '';
        
        // Configure marked.js
        marked.setOptions({
            highlight: function(code, lang) {
                if (hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                } else {
                    return hljs.highlightAuto(code).value;
                }
            },
            breaks: true,
            gfm: true
        });
        
        // Custom renderer to add code header and buttons
        const renderer = new marked.Renderer();
        
        const originalCodeRenderer = renderer.code;
        renderer.code = function(code, language, isEscaped) {
            const languageDisplay = language || 'plaintext';
            const resultHtml = originalCodeRenderer.call(this, code, language, isEscaped);
            
            // Only add run button for supported languages
            const canRunCode = language === 'python' || language === 'py' || 
                              language === 'javascript' || language === 'js';
            
            const runButton = canRunCode ? 
                `<button class="code-run-btn" title="Run code" data-code="${encodeURIComponent(code)}" data-lang="${languageDisplay}">
                    <i class="fas fa-play"></i>
                </button>` : '';
            
            // Create a collapsible code block (like error details)
            return `
                <details class="code-details">
                    <summary class="code-summary">
                        <span class="code-label">Code: ${languageDisplay}</span>
                        <div class="code-header-buttons">
                            <button class="code-copy-btn" title="Copy code">
                                <i class="fas fa-copy"></i>
                            </button>
                            ${runButton}
                        </div>
                    </summary>
                    <div class="code-block">
                        ${resultHtml}
                        <button class="download-btn" data-code="${encodeURIComponent(code)}" data-lang="${languageDisplay}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </details>
            `;
        };
        
        // Convert Markdown to HTML
        const html = marked.parse(message, { renderer: renderer });
        
        return html;
    }

    // Add event listeners to run code buttons
    function addRunCodeButtonListeners() {
        const runButtons = document.querySelectorAll('.code-run-btn');
        runButtons.forEach(button => {
            if (!button.hasListener) {
                button.addEventListener('click', () => {
                    // Get the code and language
                    const code = decodeURIComponent(button.getAttribute('data-code'));
                    const language = button.getAttribute('data-lang');
                    
                    // Initialize if needed
                    if (language === 'python' || language === 'py') {
                        loadPyodideIfNeeded();
                    }
                    
                    // Execute the code
                    executeCode(code, language);
                    
                    // Ensure code execution area is visible
                    codeExecutionArea.style.display = 'block';
                    
                    // Scroll to the code execution area
                    const scrollOptions = {
                        behavior: 'smooth',
                        block: 'start'
                    };
                    codeExecutionArea.scrollIntoView(scrollOptions);
                    
                    // Show success feedback
                    const originalIcon = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        button.innerHTML = originalIcon;
                    }, 1500);
                });
                button.hasListener = true;
            }
        });
    }

    // Add event listeners to copy buttons
    function addCopyButtonListeners() {
        const copyButtons = document.querySelectorAll('.code-copy-btn');
        copyButtons.forEach(button => {
            if (!button.hasListener) {
                button.addEventListener('click', () => {
                    // Fix: Find the code element more reliably
                    const codeBlock = button.closest('.code-details');
                    if (!codeBlock) return;
                    
                    const preElement = codeBlock.querySelector('pre');
                    if (!preElement) return;
                    
                    const code = preElement.textContent;
                    
                    // Copy to clipboard
                    try {
                        navigator.clipboard.writeText(code).then(() => {
                            // Show a brief success indicator
                            const originalIcon = button.innerHTML;
                            button.innerHTML = '<i class="fas fa-check"></i>';
                            setTimeout(() => {
                                button.innerHTML = originalIcon;
                            }, 1500);
                            
                            // Show toast notification
                            showToast('Code copied to clipboard');
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            // Fallback for browsers that don't support clipboard API
                            fallbackCopy(code);
                        });
                    } catch (err) {
                        console.error('Copy error: ', err);
                        // Fallback for older browsers
                        fallbackCopy(code);
                    }
                });
                button.hasListener = true;
            }
        });
    }
    
    // Fallback copy mechanism for older browsers
    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('Code copied to clipboard');
            } else {
                showToast('Failed to copy code');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showToast('Failed to copy code');
        }
        
        document.body.removeChild(textArea);
    }

    // Add event listeners to download buttons
    function addDownloadButtonListeners() {
        const downloadButtons = document.querySelectorAll('.download-btn');
        downloadButtons.forEach(button => {
            if (!button.hasListener) {
                button.addEventListener('click', () => {
                    const code = decodeURIComponent(button.getAttribute('data-code'));
                    const language = button.getAttribute('data-lang') || 'txt';
                    
                    // Determine file extension based on language
                    let extension = 'txt';
                    if (language === 'javascript' || language === 'js') extension = 'js';
                    else if (language === 'html') extension = 'html';
                    else if (language === 'css') extension = 'css';
                    else if (language === 'python' || language === 'py') extension = 'py';
                    else if (language === 'json') extension = 'json';
                    else if (language === 'typescript' || language === 'ts') extension = 'ts';
                    else if (language === 'java') extension = 'java';
                    else if (language === 'c' || language === 'cpp' || language === 'c++') extension = 'cpp';
                    else if (language === 'csharp' || language === 'cs') extension = 'cs';
                    else if (language === 'php') extension = 'php';
                    else if (language === 'ruby' || language === 'rb') extension = 'rb';
                    else if (language === 'rust' || language === 'rs') extension = 'rs';
                    else if (language === 'go') extension = 'go';
                    else if (language === 'markdown' || language === 'md') extension = 'md';
                    
                    // Create a blob and download
                    const blob = new Blob([code], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `code.${extension}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
                button.hasListener = true;
            }
        });
    }

    // Handle file upload
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size should be less than 10MB.');
            return;
        }
        
        // Check supported file types
        const supportedTypes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
            // Documents
            'text/plain', 'text/javascript', 'text/html', 'text/css', 
            'application/json', 'application/pdf',
            // Code files
            'text/x-python', 'application/x-javascript',
            // Other text-based formats
            'text/markdown', 'text/csv'
        ];
        
        // Allow files that the model might be able to understand
        if (!supportedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            const proceed = confirm('This file type may not be fully supported. The AI will try to process it, but results may vary. Continue?');
            if (!proceed) {
                fileUpload.value = '';
                return;
            }
        }
        
        const reader = new FileReader();
        
        // Format file size for display
        const formatFileSize = (bytes) => {
            if (bytes < 1024) return bytes + ' bytes';
            else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };
        
        reader.onload = function(event) {
            const base64 = event.target.result.split(',')[1];
            lastUpload = base64;
            
            // Store the original file type and name for reference
            lastUploadType = file.type;
            lastFileName = file.name;
            
            // Reset views
            previewImage.style.display = 'none';
            fileInfo.style.display = 'none';
            
            // If it's an image, show image preview
            if (file.type.startsWith('image/')) {
                previewImage.src = event.target.result;
                previewImage.style.display = 'block';
            } 
            // Otherwise show file info
            else {
                const fileIcon = getFileIcon(file.type);
                // Make sure file name is displayed properly
                fileName.textContent = file.name;
                fileSize.textContent = formatFileSize(file.size);
                fileInfo.innerHTML = `<i class="${fileIcon}"></i><div><span id="file-name">${file.name}</span><span id="file-size">${formatFileSize(file.size)}</span></div>`;
                fileInfo.style.display = 'flex';
            }
            
            // Show the upload preview container
            uploadPreview.style.display = 'flex';
        };
        
        reader.readAsDataURL(file);
    }
    
    // Get appropriate icon for file type
    function getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fas fa-file-image';
        if (fileType === 'application/pdf') return 'fas fa-file-pdf';
        if (fileType === 'application/json') return 'fas fa-file-code';
        if (fileType.includes('javascript') || fileType.includes('html') || fileType.includes('css')) return 'fas fa-file-code';
        if (fileType.includes('text/')) return 'fas fa-file-alt';
        if (fileType.includes('python')) return 'fab fa-python';
        return 'fas fa-file';
    }

    // Handle removing the uploaded file
    function handleRemoveUpload() {
        lastUpload = null;
        lastUploadType = null;
        lastFileName = null; // Reset filename as well
        uploadPreview.style.display = 'none';
        previewImage.style.display = 'none';
        fileInfo.style.display = 'none';
        fileUpload.value = '';
    }
    
    // Toggle search mode
    function toggleSearchMode() {
        isSearchMode = !isSearchMode;
        
        if (isSearchMode) {
            searchBtn.classList.add('active');
            userInput.placeholder = 'Search the web...';
        } else {
            searchBtn.classList.remove('active');
            userInput.placeholder = 'Send a message...';
        }
        
        userInput.focus();
    }

    // Handle creating a new chat
    function handleNewChat() {
        createNewChat();
        // Close the sidebar on mobile after creating a new chat
        if (isMobile) {
            closeSidebar();
        }
    }

    // Create a new chat
    function createNewChat() {
        // Clear chat area
        chatArea.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to AI Chat</h2>
                <p>Select a model and start chatting!</p>
                
                <div class="welcome-actions">
                    <select id="model-mobile" class="model-select-mobile">
                        <option value="">-- Select a model --</option>
                    </select>
                    <button id="start-chat-btn" class="start-chat-btn">Start Chatting</button>
                </div>
                <div class="model-selection-help">
                    <p>Please select a model from the dropdown above to begin</p>
                </div>
                <div id="model-debug" style="display: none;" class="model-debug"></div>
            </div>
        `;
        
        // Re-bind the mobile elements since we recreated them
        const newModelSelectMobile = document.getElementById('model-mobile');
        const newStartChatBtn = document.getElementById('start-chat-btn');
        
        // Sync model options
        newModelSelectMobile.innerHTML = '<option value="">-- Select a model --</option>';
        Array.from(modelSelect.options).forEach(option => {
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.textContent = option.textContent;
            newModelSelectMobile.appendChild(newOption);
        });
        
        // If model is already selected in the sidebar, select it in mobile too
        if (modelSelect.value) {
            console.log("Setting mobile model from sidebar:", modelSelect.value);
            newModelSelectMobile.value = modelSelect.value;
            
            // Add indicator to show selected model
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                const modelIndicator = document.createElement('div');
                modelIndicator.className = 'model-indicator';
                modelIndicator.innerHTML = `Model "<strong>${modelSelect.options[modelSelect.selectedIndex].text}</strong>" is selected`;
                welcomeMessage.appendChild(modelIndicator);
            }
        }
        
        // Re-bind event listeners for mobile elements
        newStartChatBtn.addEventListener('click', handleStartChat);
        newModelSelectMobile.addEventListener('change', (e) => {
            console.log("Mobile model changed to:", e.target.value);
            modelSelect.value = e.target.value;
            
            // Update or add model indicator
            if (e.target.value) {
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    const existingIndicator = welcomeMessage.querySelector('.model-indicator');
                    if (existingIndicator) {
                        existingIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                    } else {
                        const modelIndicator = document.createElement('div');
                        modelIndicator.className = 'model-indicator';
                        modelIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                        welcomeMessage.appendChild(modelIndicator);
                    }
                }
            }
        });
        
        // Reset variables
        currentChatId = generateUUID();
        lastQuery = null;
        lastSeed = null;
        lastUpload = null;
        lastUploadType = null;
        isSearchMode = false;
        
        // Reset UI elements
        searchBtn.classList.remove('active');
        userInput.placeholder = 'Send a message...';
        
        // Reset upload preview
        handleRemoveUpload();
        
        // Reset code execution area
        codeOutput.innerHTML = '';
        codeExecutionArea.style.display = 'none';
        
        // Reset regenerate button
        regenerateBtn.disabled = true;
        
        // Add to conversations
        conversations[currentChatId] = {
            id: currentChatId,
            title: 'New Chat',
            timestamp: Date.now(),
            messages: []
        };
        
        // Update sidebar
        updateChatHistorySidebar();
        
        // Save to local storage
        saveConversations();
    }
    
    // Function to display a conversation
    function displayConversation(chatId) {
        if (!conversations[chatId]) {
            console.error(`Cannot display conversation: Chat ID ${chatId} not found in conversations`);
            return;
        }
        
        console.log(`Displaying conversation ID: ${chatId} with ${conversations[chatId].messages.length} messages`);
        
        // Clear chat area first to avoid duplicates
        chatArea.innerHTML = '';
        
        const chat = conversations[chatId];
        
        // Set the model selector to the saved model if available
        if (chat.model) {
            console.log(`Setting model to ${chat.model} from saved conversation`);
            modelSelect.value = chat.model;
            if (modelSelectMobile) {
                modelSelectMobile.value = chat.model;
            }
        }
        
        // Display each message in the conversation
        if (chat && chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                if (msg.role === 'user') {
                    // Handle user messages with or without images
                    if (msg.image) {
                        addMessageToChat('user', msg.content, msg.image, msg.fileType || 'image/jpeg');
                    } else {
                        addMessageToChat('user', msg.content);
                    }
                } else if (msg.role === 'assistant') {
                    // Handle bot messages with or without images
                    if (msg.image) {
                        addMessageToChat('bot', msg.content, msg.image);
                        lastGeneratedImageBase64 = msg.image;
                        lastMessageType = 'image';
                    } else {
                        addMessageToChat('bot', msg.content);
                        lastMessageType = 'text';
                    }
                }
            });
            
            // Scroll to the bottom of the chat
            scrollChatToBottom();
            
            // Update regenerate button state
            const hasBotMessages = chat.messages.some(msg => msg.role === 'assistant');
            regenerateBtn.disabled = !hasBotMessages;
        }
    }

    // Load a specific chat
    function loadChat(chatId) {
        if (!conversations[chatId]) {
            console.error(`Cannot load chat: ID ${chatId} not found in conversations`);
            return;
        }
        
        console.log(`Loading chat ID: ${chatId} with ${conversations[chatId].messages.length} messages`);
        
        // Set current chat ID
        currentChatId = chatId;
        
        // Reset state variables
        lastUpload = null;
        lastUploadType = null;
        lastSeed = null;
        isSearchMode = false;
        
        // Reset UI elements
        searchBtn.classList.remove('active');
        userInput.placeholder = 'Send a message...';
        uploadPreview.style.display = 'none';
        codeExecutionArea.style.display = 'none';
        
        // Clear chat area
        chatArea.innerHTML = '';
        
        // Get the chat for display
        const chat = conversations[chatId];
        if (chat.messages.length === 0) {
            chatArea.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to AI Chat</h2>
                    <p>Select a model and start chatting!</p>
                    
                    <div class="welcome-actions">
                        <select id="model-mobile" class="model-select-mobile">
                            <option value="">-- Select a model --</option>
                        </select>
                        <button id="start-chat-btn" class="start-chat-btn">Start Chatting</button>
                    </div>
                    <div class="model-selection-help">
                        <p>Please select a model from the dropdown above to begin</p>
                    </div>
                    <div id="model-debug" style="display: none;" class="model-debug"></div>
                </div>
            `;
            
            // Re-bind mobile elements
            const newModelSelectMobile = document.getElementById('model-mobile');
            const newStartChatBtn = document.getElementById('start-chat-btn');
            
            // Sync model options
            newModelSelectMobile.innerHTML = '<option value="">-- Select a model --</option>';
            Array.from(modelSelect.options).forEach(option => {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.textContent = option.textContent;
                newModelSelectMobile.appendChild(newOption);
            });
            
            // If model is already selected in the sidebar, select it in mobile too
            if (modelSelect.value) {
                console.log("Setting mobile model from sidebar in loadChat:", modelSelect.value);
                newModelSelectMobile.value = modelSelect.value;
                
                // Add indicator to show selected model
                const welcomeMessage = document.querySelector('.welcome-message');
                if (welcomeMessage) {
                    const modelIndicator = document.createElement('div');
                    modelIndicator.className = 'model-indicator';
                    modelIndicator.innerHTML = `Model "<strong>${modelSelect.options[modelSelect.selectedIndex].text}</strong>" is selected`;
                    welcomeMessage.appendChild(modelIndicator);
                }
            }
            
            // Re-bind event listeners
            newStartChatBtn.addEventListener('click', handleStartChat);
            newModelSelectMobile.addEventListener('change', (e) => {
                console.log("Mobile model changed to:", e.target.value);
                modelSelect.value = e.target.value;
                
                // Update or add model indicator
                if (e.target.value) {
                    const welcomeMessage = document.querySelector('.welcome-message');
                    if (welcomeMessage) {
                        const existingIndicator = welcomeMessage.querySelector('.model-indicator');
                        if (existingIndicator) {
                            existingIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                        } else {
                            const modelIndicator = document.createElement('div');
                            modelIndicator.className = 'model-indicator';
                            modelIndicator.innerHTML = `Model "<strong>${e.target.options[e.target.selectedIndex].text}</strong>" is selected`;
                            welcomeMessage.appendChild(modelIndicator);
                        }
                    }
                }
            });
            
            regenerateBtn.disabled = true;
        } else {
            // Use our dedicated function to display the conversation
            displayConversation(chatId);
            
            // Set last query for regeneration
            const lastUserMessage = chat.messages.filter(msg => msg.role === 'user').pop();
            if (lastUserMessage) {
                lastQuery = lastUserMessage.content;
                // Regenerate button is enabled by displayConversation
            }
        }
        
        // Update active chat in sidebar
        updateActiveChatInSidebar();
        
        // Close sidebar on mobile after loading a chat
        if (isMobile) {
            closeSidebar();
        }
    }

    // Update the active chat in the sidebar
    function updateActiveChatInSidebar() {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            if (item.dataset.id === currentChatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Update the chat history sidebar
    function updateChatHistorySidebar() {
        chatHistory.innerHTML = '';
        
        // Sort conversations by timestamp (newest first)
        const sortedConversations = Object.values(conversations).sort((a, b) => b.timestamp - a.timestamp);
        
        sortedConversations.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
            chatItem.dataset.id = chat.id;
            
            // Get model display name if available
            let modelName = chat.model || '';
            if (window.getModelDisplayName && modelName) {
                modelName = window.getModelDisplayName(modelName);
            }
            
            // Create chat item with delete button
            chatItem.innerHTML = `
                <div class="chat-item-content">
                    ${modelName ? `<strong>${modelName}:</strong> ` : ''}${chat.title}
                </div>
                <button class="delete-chat-btn" title="Delete Chat">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add click event to the content area
            chatItem.querySelector('.chat-item-content').addEventListener('click', () => loadChat(chat.id));
            
            // Add delete functionality
            chatItem.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the chat item click
                deleteChat(chat.id);
            });
            
            chatHistory.appendChild(chatItem);
        });
    }
    
    // Function to delete a chat
    function deleteChat(chatId) {
        // Ask for confirmation
        if (!confirm('Are you sure you want to delete this chat?')) {
            return;
        }
        
        // Delete the chat data
        delete conversations[chatId];
        
        // Clear all memories associated with this chat
        if (window.localStorage.getItem(`chat_memories_${chatId}`)) {
            window.localStorage.removeItem(`chat_memories_${chatId}`);
            console.log(`Removed memories for chat ${chatId}`);
        }
        
        // Save to localStorage
        saveConversations();
        
        // Update the sidebar
        updateChatHistorySidebar();
        
        // If the deleted chat was the active one, start a new chat
        if (chatId === currentChatId) {
            // Clear the chat area and show welcome message
            chatArea.innerHTML = '';
            addWelcomeMessage();
            currentChatId = null;
            modelSelect.value = '';
        }
    }

    // Save the current conversation
    function saveConversation(userMessage, botResponse, uploadBase64, uploadType) {
        if (!conversations[currentChatId]) {
            conversations[currentChatId] = {
                id: currentChatId,
                title: userMessage.substring(0, 30) || 'New Chat',
                timestamp: Date.now(),
                messages: []
            };
        }
        
        // Update title with first user message if this is the first message
        if (conversations[currentChatId].messages.length === 0) {
            conversations[currentChatId].title = userMessage.substring(0, 30) || 'New Chat';
        }
        
        // Update timestamp
        conversations[currentChatId].timestamp = Date.now();
        
        // Add user message to conversation
        conversations[currentChatId].messages.push({
            role: 'user',
            content: userMessage,
            image: uploadBase64, // Keep name as image for backward compatibility
            fileType: uploadType, // Add new fileType field
            timestamp: Date.now()
        });
        
        // Add bot response to conversation
        // For image generation, store the image data with the bot message too
        if (uploadType === 'image_generation') {
            conversations[currentChatId].messages.push({
                role: 'bot',
                content: botResponse,
                image: uploadBase64, // Store image data with bot message
                fileType: uploadType, // Store the type
                timestamp: Date.now()
            });
        } else {
            conversations[currentChatId].messages.push({
                role: 'bot',
                content: botResponse,
                timestamp: Date.now()
            });
        }
        
        // Save to local storage
        saveConversations();
    }

    // Save conversations to local storage
    function saveConversations() {
        // Ensure current chat ID is preserved
        const savedCurrentChatId = currentChatId;
        
        // Make sure we preserve image data when saving
        const conversationsToSave = JSON.parse(JSON.stringify(conversations));
        
        // Persist the conversations to localStorage
        localStorage.setItem('aiChatConversations', JSON.stringify(conversationsToSave));
        console.log(`Saved ${Object.keys(conversationsToSave).length} conversations to localStorage, current chat ID: ${savedCurrentChatId}`);
    }

    // Load conversations from local storage
    function loadConversations() {
        const saved = localStorage.getItem('aiChatConversations');
        if (saved) {
            try {
                conversations = JSON.parse(saved);
                console.log(`Loaded ${Object.keys(conversations).length} conversations from localStorage`);
                
                // Ensure all conversations have the required properties
                Object.keys(conversations).forEach(chatId => {
                    const chat = conversations[chatId];
                    
                    // Ensure chat has an id field
                    if (!chat.id && chat.id !== 0) {
                        chat.id = chatId;
                    }
                    
                    // Ensure chat has a messages array
                    if (!Array.isArray(chat.messages)) {
                        chat.messages = [];
                    }
                    
                    // Ensure all messages with images have the correct data structure
                    chat.messages.forEach(msg => {
                        // Make sure image data is properly preserved
                        if (msg.image && typeof msg.image === 'string') {
                            // Image data is correctly stored as a string
                            // No action needed
                        }
                    });
                });
            } catch (e) {
                console.error('Error loading conversations:', e);
                conversations = {};
            }
        } else {
            console.log("No saved conversations found in localStorage");
            conversations = {};
        }
    }

    // Generate a UUID for new chats
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
});
