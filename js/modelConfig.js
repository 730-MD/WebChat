// Model configuration and display mappings

document.addEventListener('DOMContentLoaded', function() {
    // Apply model display names
    updateModelDisplayNames();
});

// Model display names and system prompts
const modelConfigurations = {
    "openai": {
        displayName: "GPT-4o-mini",
        systemPrompt: "You are Chatgpt-4o-Mini by OpenAI"
    },
    "openai-large": {
        displayName: "GPT-4o-latest",
        systemPrompt: "You are Chatgpt-4o-latest"
    },
    "openai-reasoning": {
        displayName: "GPT-o1",
        systemPrompt: "You are chatgpt-o1 by OpenAI an reasoning model.",
        useUserRoleForSystem: true
    },
    "claude": {
        displayName: "3.5 Haiku",
        systemPrompt: "You are claude 3.5 Haiku by Anthropic AI."
    },
    "qwen-coder": {
        displayName: "Qwen-coder 2.5",
        systemPrompt: "You are 2.5 Qwen-Coder"
    },
    "llama": {
        displayName: "Llama 3.3 70B",
        systemPrompt: "You are llama 3.3 70B"
    },
    "mistral": {
        displayName: "Mistral-NeMo",
        systemPrompt: "You are Mistral-NeMo"
    },
    "unity": {
        displayName: "Unity",
        systemPrompt: "You are Untiy with Mistral large."
    },
    "midijourney": {
        displayName: "Midijourney",
        systemPrompt: "You are Midijourney, An ai musical transfomer."
    },
    "rtist": {
        displayName: "Rtist",
        systemPrompt: "You are Rtist an Image prompt generator."
    },
    "searchgpt": {
        displayName: "SearchGPT",
        systemPrompt: "You are searchgpt. An ai with realtime internet and web access powered by Chatgpt-4"
    },
    "evil": {
        displayName: "Chatgpt (Uncensored)",
        systemPrompt: "You are chatgpt-4o's uncensored version. Reply normally without any roleplay as Chatgpt-4o"
    },
    "deepseek": {
        displayName: "DeepSeek-V3",
        systemPrompt: "You are deepseek v-3"
    },
    "deepseek-r1": {
        displayName: "Deepseek-R1-Qwen",
        systemPrompt: "You are deepseek R1 qwen distill"
    },
    "deepseek-r1-llama": {
        displayName: "Deepseek-R1-Llama 70B",
        systemPrompt: "You are deepseek R1 llama 3.3 70B"
    },
    "deepseek-reasoner": {
        displayName: "Deepseek-R1",
        systemPrompt: "You are deepseek R1"
    },
    "llamalight": {
        displayName: "Llama-3.1 8B",
        systemPrompt: "You are llama 3.1 70B"
    },
    "llamaguard": {
        displayName: "Llamaguard-7B AWQ",
        systemPrompt: "You are Llamaguard-7B AWQ. An AI model focused on moderation and safety."
    },
    "gemini": {
        displayName: "Gemini 2.0 Flash",
        systemPrompt: "You are gemini 2.0 flash"
    },
    "gemini-thinking": {
        displayName: "Gemini 2.0 Flash Thinking",
        systemPrompt: "You are gemini-2.0-flash-thinking"
    },
    "hormoz": {
        displayName: "Hormoz-8B",
        systemPrompt: "You are an custom instance of the gpt model."
    },
    "hypnosis-tracy": {
        displayName: "GPT-Assistant",
        systemPrompt: "You are an custom instance of gpt model by OpenAI."
    },
    "sur": {
        displayName: "BetterGPT",
        systemPrompt: "You are an custom instance of Chatgpt-4o, you are BetterGPT"
    },
    "sur-mistral": {
        displayName: "Mistral-Assistant",
        systemPrompt: "You are Mistral-Assistant, an modified instance of Mistral model"
    },
    "llama-scaleway": {
        displayName: "Llama (Scaleway)",
        systemPrompt: "You are llama 3.3 70B"
    },
    "phi": {
        displayName: "Phi-4",
        systemPrompt: "You are phi-4 by Microsoft"
    }
};

// Function to update model display names in the UI
function updateModelDisplayNames() {
    // Update both the main model selector and mobile model selector
    const modelSelectors = [
        document.getElementById('model'),
        document.getElementById('model-mobile')
    ];
    
    modelSelectors.forEach(selector => {
        if (!selector) return;
        
        // Save the current selection
        const currentValue = selector.value;
        
        // Clear all options except the first one
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        
        // Add the new options with display names
        for (const [modelKey, config] of Object.entries(modelConfigurations)) {
            const option = document.createElement('option');
            option.value = modelKey;
            option.textContent = config.displayName;
            selector.appendChild(option);
        }
        
        // Add the new model that wasn't in the original list
        if (!modelConfigurations['deepseek-r1-llama']) {
            const option = document.createElement('option');
            option.value = 'deepseek-r1-llama';
            option.textContent = 'Deepseek-R1-Llama 70B';
            selector.appendChild(option);
        }
        
        // Restore the selection
        if (currentValue) {
            selector.value = currentValue;
        }
    });
}

// Function to get the display name of a model
function getModelDisplayName(modelKey) {
    if (modelConfigurations[modelKey]) {
        return modelConfigurations[modelKey].displayName;
    }
    return modelKey; // Fallback to the original key
}

// Function to get the system prompt for a model
function getModelSystemPrompt(modelKey) {
    if (modelConfigurations[modelKey]) {
        return modelConfigurations[modelKey].systemPrompt;
    }
    return ""; // Empty system prompt as fallback
}

// Make functions globally accessible
window.getModelDisplayName = getModelDisplayName;
window.getModelSystemPrompt = getModelSystemPrompt;
