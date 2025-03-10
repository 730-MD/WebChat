// UI fixes and enhancements

document.addEventListener('DOMContentLoaded', function() {
    // Add visual feedback for tap actions
    addTapFeedback();
    
    // Fix for menu toggle to ensure it remains visible
    fixMenuToggle();
    
    // Add visual indicator for tap-and-hold functionality
    addTapHoldIndicator();
    
    // Fix code block UI issues
    fixCodeBlockUI();
});

// Add visual feedback when tapping on buttons
function addTapFeedback() {
    const interactiveElements = document.querySelectorAll('button, .message-content, .code-copy-btn, .code-run-btn');
    
    interactiveElements.forEach(el => {
        el.addEventListener('touchstart', function() {
            this.classList.add('tapped');
        });
        
        el.addEventListener('touchend', function() {
            this.classList.remove('tapped');
        });
        
        el.addEventListener('touchcancel', function() {
            this.classList.remove('tapped');
        });
    });
    
    // Re-add for new elements that might be dynamically added
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const newElements = node.querySelectorAll('button, .message-content, .code-copy-btn, .code-run-btn');
                        newElements.forEach(el => {
                            el.addEventListener('touchstart', function() {
                                this.classList.add('tapped');
                            });
                            
                            el.addEventListener('touchend', function() {
                                this.classList.remove('tapped');
                            });
                            
                            el.addEventListener('touchcancel', function() {
                                this.classList.remove('tapped');
                            });
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Fix for menu toggle to ensure it remains visible
function fixMenuToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        // Ensure menu toggle is always visible in mobile view
        window.addEventListener('scroll', function() {
            if (window.innerWidth <= 768) {
                menuToggle.style.position = 'fixed';
                menuToggle.style.top = '15px';
                menuToggle.style.left = '15px';
                menuToggle.style.zIndex = '30';
            }
        });
    }
}

// Add visual indicator for tap-and-hold functionality to bot messages
function addTapHoldIndicator() {
    // Add a subtle hint to AI messages to show they can be tap-and-held
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('message') && node.classList.contains('bot')) {
                            const messageContent = node.querySelector('.message-content');
                            if (messageContent) {
                                // Add a tooltip on the first interaction
                                if (!localStorage.getItem('shownTapHoldHint')) {
                                    const hint = document.createElement('div');
                                    hint.className = 'tap-hold-hint';
                                    hint.innerHTML = 'Tap and hold to copy text';
                                    hint.style.position = 'absolute';
                                    hint.style.bottom = '5px';
                                    hint.style.right = '5px';
                                    hint.style.backgroundColor = 'rgba(58, 134, 255, 0.8)';
                                    hint.style.color = 'white';
                                    hint.style.padding = '5px 8px';
                                    hint.style.borderRadius = '4px';
                                    hint.style.fontSize = '0.8rem';
                                    hint.style.zIndex = '5';
                                    hint.style.opacity = '0';
                                    hint.style.transition = 'opacity 0.5s ease';
                                    
                                    messageContent.style.position = 'relative';
                                    messageContent.appendChild(hint);
                                    
                                    // Show the hint briefly
                                    setTimeout(() => {
                                        hint.style.opacity = '1';
                                        setTimeout(() => {
                                            hint.style.opacity = '0';
                                            setTimeout(() => {
                                                if (hint.parentNode) {
                                                    hint.parentNode.removeChild(hint);
                                                }
                                            }, 500);
                                        }, 3000);
                                    }, 1000);
                                    
                                    localStorage.setItem('shownTapHoldHint', 'true');
                                }
                            }
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Fix code block UI issues
function fixCodeBlockUI() {
    // Ensure code blocks are properly displayed and copy buttons work
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const codeDetails = node.querySelectorAll('.code-details');
                        if (codeDetails.length > 0) {
                            codeDetails.forEach(details => {
                                // Fix any sizing issues
                                const preElements = details.querySelectorAll('pre');
                                preElements.forEach(pre => {
                                    pre.style.maxWidth = '100%';
                                    pre.style.overflowX = 'auto';
                                });
                                
                                // Ensure copy buttons are properly styled
                                const copyButtons = details.querySelectorAll('.code-copy-btn');
                                copyButtons.forEach(btn => {
                                    btn.style.minWidth = '30px';
                                    btn.style.height = '30px';
                                    btn.style.display = 'flex';
                                    btn.style.alignItems = 'center';
                                    btn.style.justifyContent = 'center';
                                });
                            });
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}
