// Function to update model indication UI
function updateModelIndicationUI() {
    console.log("Updating model UI with current values");
    
    const modelSelect = document.getElementById('model');
    const modelSelectMobile = document.getElementById('model-mobile');
    const startChatBtn = document.getElementById('start-chat-btn');
    
    const selectedModel = modelSelect.value || modelSelectMobile.value;
    const welcomeMessage = document.querySelector('.welcome-message');
    
    if (welcomeMessage) {
        // Always check for help message regardless of whether a model is selected
        const helpMessage = welcomeMessage.querySelector('.model-selection-help');
        
        if (helpMessage) {
            console.log("Found help message, model selected?", !!selectedModel);
            // Explicitly hide or show the help message based on model selection
            if (selectedModel) {
                console.log("Hiding help message because a model is selected:", selectedModel);
                helpMessage.style.display = 'none';
            } else {
                console.log("Showing help message - no model selected");
                helpMessage.style.display = 'block';
            }
        }
        
        if (selectedModel) {
            // Get the display name for the selected model
            let displayName = '';
            
            if (modelSelectMobile && modelSelectMobile.value) {
                const selectedOption = modelSelectMobile.options[modelSelectMobile.selectedIndex];
                displayName = selectedOption ? selectedOption.text : '';
            } else if (modelSelect && modelSelect.value) {
                const selectedOption = modelSelect.options[modelSelect.selectedIndex];
                displayName = selectedOption ? selectedOption.text : '';
            }
                 
            const existingIndicator = welcomeMessage.querySelector('.model-indicator');
            if (existingIndicator) {
                existingIndicator.innerHTML = `Model "<strong>${displayName}</strong>" is selected`;
                existingIndicator.style.display = 'block';
            } else {
                const modelIndicator = document.createElement('div');
                modelIndicator.className = 'model-indicator';
                modelIndicator.innerHTML = `Model "<strong>${displayName}</strong>" is selected`;
                welcomeMessage.appendChild(modelIndicator);
            }
        }
    }
    
    // Enable/disable start button based on selection
    if (startChatBtn) {
        startChatBtn.disabled = !selectedModel;
    }
}

// Make function available globally
window.updateModelIndicationUI = updateModelIndicationUI;

// Add additional styles for the model indicator
document.addEventListener('DOMContentLoaded', function() {
    // Create style element
    const style = document.createElement('style');
    style.textContent = `
        /* Style for model indicator */
        .model-indicator {
            margin-top: 15px;
            padding: 10px;
            border-radius: 5px;
            background-color: #e8f5e9;
            color: #2e7d32;
            font-weight: bold;
            text-align: center;
            display: block;
        }
        
        /* Style for model selection help - will be hidden by JS when a model is selected */
        .model-selection-help[style*="display: none"] {
            display: none !important;
        }
    `;
    
    // Append to head
    document.head.appendChild(style);
});
