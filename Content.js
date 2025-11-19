// --- Configuration & Global State ---
const SPOILER_CLASS = 'gemini-spoiler-censor';
let nameRegex = null; // This will hold the dynamically created RegExp
let isEnabled = true; // Assume enabled until storage is checked

// --- Utility Functions ---

/**
 * Debounce utility: Ensures a function is not called too frequently.
 * This is crucial for performance with MutationObserver.
 * @param {function} func - The function to debounce.
 * @param {number} timeout - The delay in milliseconds.
 * @returns {function} The debounced function.
 */
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}


// --- Extension Setup & Name Loading ---

/**
 * Main initialization: Loads the name list and sets up the extension.
 */
function initialize() {
    // 1. Inject styles immediately
    injectSpoilerStyles();
    addRevealClickListener();
    
    // 2. Load external name list
    fetch(chrome.runtime.getURL('first-names.txt'))
        .then(result => {
            if (!result.ok) {
                throw new Error(`Failed to load first-names.txt: ${result.statusText}`);
            }
            return result.text();
        })
        .then(text => {
            const nameList = text.split(/\r?\n/).filter(Boolean).map(n => n.trim());
            if (nameList.length === 0) {
                console.warn("Name list is empty. Censorship will not run.");
                return;
            }
            
            // Create the regex once the list is loaded.
            const pattern = nameList.join("|");
            // \b for whole word matching, gi for global/case-insensitive
            nameRegex = new RegExp(`\\b(?:${pattern})\\b`, 'gi');
            
            // 3. Start censorship and observation
            censorNames();
            observeDOMChanges();
        })
        .catch(error => {
            console.error("Name Censor: Failed to load name list. Check web_accessible_resources in manifest.", error);
        });
}


// --- Censorship Logic ---

/**
 * Traverses the DOM to find text nodes and wraps matching names in a spoiler span.
 */
function censorNames() {
    if (!isEnabled || !nameRegex) {
        return; // Exit if disabled or list not loaded
    }
    
    // Use a TreeWalker to efficiently iterate only over text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT, 
        {
            acceptNode: function(node) {
                const parentNodeName = node.parentNode ? node.parentNode.nodeName.toLowerCase() : '';
                // Ignore nodes inside elements that shouldn't be touched or are already censored
                if (parentNodeName === 'script' || 
                    parentNodeName === 'style' || 
                    parentNodeName === 'textarea' ||
                    parentNodeName === 'input' || 
                    node.parentNode.classList.contains(SPOILER_CLASS) || 
                    !/\S/.test(node.nodeValue)) { 
                    return NodeFilter.FILTER_REJECT;
                }
                // Only accept nodes containing a potential match
                if (!nameRegex.test(node.nodeValue)) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Reset regex lastIndex after testing
                nameRegex.lastIndex = 0; 
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    let node;
    while (node = walker.nextNode()) {
        const originalText = node.nodeValue;
        
        // 1. Create the HTML string with the matched names wrapped in <span> elements
        const replacementHTML = originalText.replace(
            nameRegex, 
            (match) => `<span class="${SPOILER_CLASS}">${match}</span>`
        );

        // 2. Safely replace the text node with the new elements
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = replacementHTML;

        const parent = node.parentNode;
        while (tempDiv.firstChild) {
            parent.insertBefore(tempDiv.firstChild, node);
        }
        parent.removeChild(node);
    }
}

// --- DOM Mutation Observer ---

// Use debounce to prevent performance collapse
const debouncedCensorNames = debounce(censorNames, 300); // 300ms cooldown

/**
 * Sets up the MutationObserver to handle dynamically loaded content.
 */
function observeDOMChanges() {
    // The observer only calls the debounced function
    const observer = new MutationObserver((mutationsList, observer) => {
        if (!isEnabled) return; // Don't run if disabled
        debouncedCensorNames();
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true, // Watch for new elements being added/removed
        subtree: true     // Watch the entire DOM tree
    });

    window.geminiCensorObserver = observer; 
}


// --- Toggling and Style Functions ---

// Chrome Storage listener for enabling/disabling the extension
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        if (isEnabled) {
            censorNames(); // Re-censor existing content
        } else {
            // Reload is the simplest way to undo the hundreds of spans created
            location.reload(); 
        }
    }
});


function injectSpoilerStyles() {
    // Only inject styles once
    if (document.getElementById('gemini-censor-styles')) return;

    const style = document.createElement('style');
    style.id = 'gemini-censor-styles';
    style.textContent = `
        /* The main spoiler style: black background, black text to hide the content */
        .${SPOILER_CLASS} {
            background-color: #000 !important;
            color: #000 !important;
            cursor: pointer;
            border-radius: 4px;
            padding: 0 4px; 
            display: inline-block;
            transition: background-color 0.1s ease-in-out;
            font-style: inherit;
            font-weight: inherit;
        }

        /* Hover effect to hint that it's clickable */
        .${SPOILER_CLASS}:hover {
            background-color: #333 !important;
        }
        
        /* The style applied after the element has been clicked (revealed) */
        .${SPOILER_CLASS}.revealed {
            background-color: transparent !important;
            color: inherit !important;
            cursor: default;
            padding: 0;
        }
    `;
    // Append the style to the document head
    (document.head || document.documentElement).appendChild(style);
}

function addRevealClickListener() {
    document.addEventListener('click', function(event) {
        const spoilerElement = event.target.closest(`.${SPOILER_CLASS}`);
        
        if (spoilerElement && !spoilerElement.classList.contains('revealed')) {
            event.stopPropagation(); 
            spoilerElement.classList.add('revealed');
        }
    }, true); 
}

// Start the entire process
initialize();
