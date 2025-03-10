// Script to fix scrolling issues and add smooth streaming animation

document.addEventListener('DOMContentLoaded', function() {
    // Fix scrolling behavior - prevent auto-scroll when user has scrolled up
    fixScrollBehavior();
    
    // Add smooth streaming animation
    addSmoothStreamingAnimation();
});

/**
 * Function to fix scrolling behavior to prevent auto-scroll when user has scrolled up
 */
function fixScrollBehavior() {
    const chatArea = document.getElementById('chat-area');
    
    if (!chatArea) return;
    
    // Improved scroll position management
    let userScrollPosition = 0;
    let isUserScrolling = false;
    let lastScrollHeight = chatArea.scrollHeight;
    
    // Save user's scroll position when they manually scroll
    chatArea.addEventListener('scroll', function() {
        const isAtBottom = chatArea.scrollHeight - chatArea.clientHeight <= chatArea.scrollTop + 30;
        
        if (!isAtBottom) {
            isUserScrolling = true;
            userScrollPosition = chatArea.scrollTop;
        } else {
            isUserScrolling = false;
        }
    });
    
    // Function to smartly handle auto-scrolling during streaming
    window.smartScroll = function() {
        const newScrollHeight = chatArea.scrollHeight;
        
        // If content height changed and user was not scrolling, keep them at the bottom
        if (newScrollHeight > lastScrollHeight && !isUserScrolling) {
            chatArea.scrollTop = chatArea.scrollHeight;
        } 
        // If user was scrolling up (not at bottom), maintain their relative scroll position
        else if (isUserScrolling) {
            const heightDifference = newScrollHeight - lastScrollHeight;
            if (heightDifference > 0) {
                // Keep the same content in view by adjusting the scroll position
                chatArea.scrollTop = userScrollPosition + heightDifference;
                userScrollPosition = chatArea.scrollTop;
            }
        }
        
        lastScrollHeight = newScrollHeight;
    };
}

/**
 * Function to add smooth animation for text streaming
 */
function addSmoothStreamingAnimation() {
    // Apply styles for smooth text animation during streaming
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .streaming-text {
            animation: fadeIn 0.3s ease-out;
        }
        
        .streaming-character {
            opacity: 0;
            animation: fadeIn 0.2s ease-out forwards;
        }
        
        /* Fix to ensure code blocks and other elements inside messages appear smoothly */
        .message-content > *:not(p):not(pre):not(code):not(.streaming-container) {
            animation: fadeIn 0.4s ease-out;
        }
        
        /* Container that holds streaming text for better performance */
        .streaming-container {
            display: inline;
        }
    `;
    
    document.head.appendChild(styleElement);
    
    // Function to be called when a new character is added in streaming
    window.animateStreamingText = function(element, text) {
        if (!element) return;
        
        // Find or create a streaming container
        let streamingContainer = element.querySelector('.streaming-container:last-child');
        if (!streamingContainer) {
            streamingContainer = document.createElement('span');
            streamingContainer.className = 'streaming-container';
            element.appendChild(streamingContainer);
        }
        
        // Add the new text with animation
        const textNode = document.createElement('span');
        textNode.textContent = text;
        textNode.className = 'streaming-character';
        streamingContainer.appendChild(textNode);
        
        // Apply staggered animation delay for a smoother effect
        textNode.style.animationDelay = `${Math.random() * 0.1}s`;
    };
}
