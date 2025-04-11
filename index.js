
import { enter } from './mathinput.js';

document.addEventListener("DOMContentLoaded", function () {

    const keyinputs = document.getElementById('keyinputs');
    const latexDisplay = document.getElementById('latexdisplay');
    const paramater = document.getElementById('parameters')

    let isFocused = false;
    keyinputs.addEventListener('blur', function () {
        isFocused = false;
    });


    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    let previousValue = keyinputs.value; 
    const debouncedUpdateLatexDisplay = debounce(updateLatexDisplay, 100);

    keyinputs.addEventListener('input', function () {
        if (keyinputs.value !== previousValue) {
            previousValue = keyinputs.value;
            debouncedUpdateLatexDisplay(previousValue);
        }
    });


    function appendToKeyInputs(character) {
        const pos = keyinputs.selectionStart;
        keyinputs.value = keyinputs.value.slice(0, pos) + character + keyinputs.value.slice(pos);
        keyinputs.setSelectionRange(pos + character.length, pos + character.length);
        debouncedUpdateLatexDisplay(keyinputs.value)
    }

    function moveBack() {
        const pos = keyinputs.selectionStart;
        if (pos > 0) {
            keyinputs.setSelectionRange(pos - 1, pos - 1);
        }
    }

    function moveForward() {
        const pos = keyinputs.selectionEnd;
        if (pos < keyinputs.value.length) {
            keyinputs.setSelectionRange(pos + 1, pos + 1);
        }
    }

    function addSpace() {
        appendToKeyInputs(' ');
    }

    function backSpace() {
        if (document.activeElement !== keyinputs) {
            keyinputs.focus();
            keyinputs.setSelectionRange(keyinputs.value.length, keyinputs.value.length);
        } // auto-at-end
        const start = keyinputs.selectionStart;
        const end = keyinputs.selectionEnd;
        if (start !== end) {
            keyinputs.value = keyinputs.value.slice(0, start) + keyinputs.value.slice(end);
            keyinputs.setSelectionRange(start, start);
        } 
        else if (start > 0) {
            keyinputs.value = keyinputs.value.slice(0, start - 1) + keyinputs.value.slice(start);
            keyinputs.setSelectionRange(start - 1, start - 1);
        }
        debouncedUpdateLatexDisplay(keyinputs.value);
    }
    
    function clearKeyInputs() {
        keyinputs.value = '';
        previousValue = '';
        debouncedUpdateLatexDisplay(keyinputs.value)
    }

    function processLatexString(asciiMathToLatex) {
        let result = [];
        for (let i = 0; i < asciiMathToLatex.length; i++) {
            const char = asciiMathToLatex[i];
            if (char === '+' || char === '-' || asciiMathToLatex.slice(i,i+5)==='\\cdot') {
                const operator = asciiMathToLatex.slice(i,i+5)==='\\cdot'?'\\cdot':char;
                const operatorLength = operator.length;
                const prev = i > 0 && /\S/.test(asciiMathToLatex[i - 1]);
                const next = i + operatorLength < asciiMathToLatex.length && /\S/.test(asciiMathToLatex[i + operatorLength]);
                const isFirstTerm = i === 0 || asciiMathToLatex[i - 1] === '=';
                result.push(operator);
                if (isFirstTerm && !(char === '-')) {result.push('\\,');}    
                if (!isFirstTerm && (!prev || !next)) {
                    if (prev) { result.push('\\,'); }
                    if (next) { result.push('\\,'); }
                }
                i += operatorLength - 1;
                continue;
            }
            result.push(char);
        }
        return result.join('');
    }

    let lastSuccessfulRender = '';
    let rawLatexExpression = ''
    function updateLatexDisplay(input) {
        if (input.trim() === '') {
            latexDisplay.innerHTML = ''; 
            lastSuccessfulRender = '';
            rawLatexExpression = ''; 
            return;
        }
        let asciiMathToLatex = AMTparseAMtoTeX(input);
        const processedLatex = processLatexString(asciiMathToLatex);
        rawLatexExpression = processedLatex;  
        const newContent = `<mjx-container>$$${processedLatex}$$</mjx-container>`;
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('scrollable-content');
        contentWrapper.innerHTML = newContent;
        latexDisplay.innerHTML = '';
        latexDisplay.appendChild(contentWrapper);
        new SimpleBar(contentWrapper);
        MathJax.typesetPromise([contentWrapper])
            .then(() => {
                const math = MathJax.startup.document.getMathItemsWithin(contentWrapper)[0];
                let logMessages = [];
    
                if (math && math.root) {
                    const errors = [];
                    math.root.walkTree(node => {
                        if (node.isKind('merror')) {
                            errors.push(node.attributes.get('data-mjx-error') || 'Unknown error');
                        }
                    });
    
                    if (errors.length > 0) {
                        latexDisplay.innerHTML = `
                            <div class="previous-content">${lastSuccessfulRender}</div>
                            <div class="error">Error: ${errors.join(', ')}</div>
                        `;
                        MathJax.typesetPromise([latexDisplay.querySelector('.previous-content')]);
                    } else {
                        const mjxMathElement = latexDisplay.querySelector('mjx-math');
                        const mathWidth = mjxMathElement ? mjxMathElement.offsetWidth : 0;
                        const displayWidth = latexDisplay.offsetWidth;
    
                        // logMessages.push({ message: 'Math Width', data: mathWidth });
                        // logMessages.push({ message: 'Display Width', data: displayWidth });
    
                        const cursorPosition = keyinputs.selectionStart;
                        const isTypingAtEnd = cursorPosition === input.length;
                        const simplebarContentWrapper = document.querySelector('.simplebar-content-wrapper'); // latex is stored in here

                        if (isTypingAtEnd) {
                            simplebarContentWrapper.scrollLeft = simplebarContentWrapper.scrollWidth;
                            showScrollbarTemporarily();
                        } else {
                            
                        }     
                        lastSuccessfulRender = newContent;
                        logMessages.forEach(log => {
                            console.log(`${log.message}:`, log.data);
                        });                    
                    }
                }
            })
            .catch((err) => {
                console.error("MathJax rendering failed: ", err);
                latexDisplay.innerHTML = `
                    <div class="previous-content">${lastSuccessfulRender}</div>
                    <div class="error">Error rendering LaTeX: ${err.message}</div>
                `;
                MathJax.typesetPromise([latexDisplay.querySelector('.previous-content')]);
            });
    }

    
    function trackCursorPosition(inputElement) {
        let lastCursorPosition = null;
        function logCursorPosition(event) {
            const currentCursorPosition = inputElement.selectionStart;    
            if (currentCursorPosition !== lastCursorPosition) {
                console.log(`Cursor position changed: ${currentCursorPosition}`);
                lastCursorPosition = currentCursorPosition;
            }
        }
        inputElement.addEventListener('input', logCursorPosition);
        inputElement.addEventListener('keydown', logCursorPosition);
        inputElement.addEventListener('click', logCursorPosition);
        return function cleanup() {
            inputElement.removeEventListener('input', logCursorPosition);
            inputElement.removeEventListener('keydown', logCursorPosition);
            inputElement.removeEventListener('click', logCursorPosition);
        };
    }
 
    let scrollbarTimeoutId;

    function showScrollbarTemporarily() {
        const scrollbar = document.querySelector('.simplebar-scrollbar');
        if (scrollbar) {
            if (scrollbarTimeoutId) {
                clearTimeout(scrollbarTimeoutId);
                scrollbar.classList.remove('simplebar-visible');
            }
            void scrollbar.offsetWidth;
            scrollbar.classList.add('simplebar-visible');
            scrollbarTimeoutId = setTimeout(() => {
                scrollbar.classList.remove('simplebar-visible');
            }, 1000);
        }
    }
    
    // document.addEventListener('keydown', function(event) {
    //     if (!isFocused) {
    //         keyinputs.focus();
    //         isFocused = true;
    //     }        
    //});



    function applyStyles(element) {
        if (element.matches('mjx-container[jax="CHTML"][display="true"] mjx-math')) {
            element.style.padding = '10px';
        }
    }
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        applyStyles(node);
                        node.querySelectorAll('mjx-container[jax="CHTML"][display="true"] mjx-math').forEach(applyStyles);
                    }
                });
            }
        });
    });
    document.querySelectorAll('mjx-container[jax="CHTML"][display="true"] mjx-math').forEach(applyStyles);
    observer.observe(document.body, { childList: true, subtree: true });

    
        
    document.querySelectorAll('#keys button').forEach(button => {
        button.addEventListener('mousedown', function (event) {
            event.preventDefault(); 
            const className = this.className;    
            if (className.includes('clear')) {
                clearKeyInputs();
            } else if (className.includes('backspace')) {
                backSpace();
            } else if (className.includes('back')) {
                moveBack();
            } else if (className.includes('forward')) {
                moveForward();
            } else if (className.includes('space')) {
                addSpace();
            } else {
                appendToKeyInputs(this.textContent);
            }
            if (!isFocused && !className.includes('clear')) {
                keyinputs.focus();
                isFocused = true;
            }     
        });
    });

    const enterButton = document.querySelector('#export .enter');
    enterButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
        if (!isFocused) {
            keyinputs.focus();
        }
        enter(keyinputs.value, paramater.value, rawLatexExpression); // sends to mathinput.js
    });



const dropdownOptions = document.querySelector('.dropdown-options');
const parametersInput = document.getElementById('parameters');
const txtFilePath = 'sympy_list.txt';

let allOptions = []; // Store all options here
let currentIndex = -1; // Track the currently highlighted option

// Fetch options from the file
fetch(txtFilePath)
    .then(response => response.text())
    .then(data => {
        allOptions = data.split('\n').map(line => {
            const [text, type] = line.split('~'); // Split into text and type
            const trimmedText = text.trim();
            let methodName, className;

            // Check for '.' in the text to separate method and class names
            if (trimmedText.includes('.')) {
                const parts = trimmedText.split('.');
                methodName = parts.pop().trim(); // Get the last part as method name
                className = parts.join('.').trim(); // Join remaining parts as class name
            } else {
                methodName = trimmedText; // Use whole text as method name
                className = null; // No class name available
            }

            return { text: methodName, className, type: type ? type.trim() : 'unknown' }; // Return method and class names
        });
        updateDropdownOptions(allOptions); // Initialize dropdown with all options
    })
    .catch(error => console.error('Error loading dropdown options:', error));

function updateDropdownOptions(options) {
    dropdownOptions.innerHTML = ''; // Clear existing options
    options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        
        const textElement = document.createElement('span'); // Create a span for the method name
        textElement.textContent = `${option.text}()`; // Append parentheses to method name
        textElement.classList.add(`option-${option.type}`); // Add CSS class based on type

        optionElement.appendChild(textElement); // Append the method name span to the div
        
        if (option.className) { // Only add class name if it exists
            const classNameElement = document.createElement('span'); // Create a span for the class name
            classNameElement.textContent = option.className; // Display the class name
            classNameElement.classList.add('class-name'); // Add a class for styling
            optionElement.appendChild(classNameElement); // Append the class name element
        }

        optionElement.setAttribute('data-index', index); // Add index for keyboard navigation

        // Click event for selecting an option
        optionElement.addEventListener('click', () => {
            parametersInput.value = textElement.textContent; // Set input value to selected method with parentheses
            dropdownOptions.style.display = 'none'; // Hide dropdown after selection
        });

        dropdownOptions.appendChild(optionElement); // Add the option to the dropdown
    });

    // Reset scroll position to the top
    dropdownOptions.scrollTop = 0;
}

// Event listener for typing in the input field
parametersInput.addEventListener('input', () => {
    const inputValue = parametersInput.value.trim().toLowerCase();
    currentIndex = -1; // Reset index on input change

    if (!inputValue) {
        dropdownOptions.style.display = 'none'; // Hide dropdown if input is empty
        return updateDropdownOptions(allOptions); // Show all options
    }

    // Rank and filter options based on input
    const rankedOptions = allOptions
        .map(option => {
            const remainingText = option.text.toLowerCase().replace(inputValue, ''); // Remove input value from method name
            return {
                ...option,
                remainingLength: remainingText.length, // Length of remaining text
            };
        })
        .filter(option => option.remainingLength < option.text.length) // Only include options that match
        .sort((a, b) => a.remainingLength - b.remainingLength); // Sort by remaining length (best match first)

    updateDropdownOptions(rankedOptions); // Update the dropdown
    dropdownOptions.style.display = rankedOptions.length ? 'block' : 'none'; // Show/hide dropdown
});

// Handle keyboard navigation
parametersInput.addEventListener('keydown', (event) => {
    const visibleOptions = dropdownOptions.querySelectorAll('div'); // Get visible options
    if (!visibleOptions.length) return; // Exit if no options are visible

    if (event.key === 'ArrowDown') {
        event.preventDefault(); // Prevent cursor from moving in input
        currentIndex = (currentIndex + 1) % visibleOptions.length; // Move down
        highlightOption(visibleOptions, currentIndex);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault(); // Prevent cursor from moving in input
        currentIndex = (currentIndex - 1 + visibleOptions.length) % visibleOptions.length; // Move up
        highlightOption(visibleOptions, currentIndex);
    } else if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission or other actions
        if (currentIndex >= 0 && visibleOptions[currentIndex]) {
            visibleOptions[currentIndex].click(); // Select the highlighted option
        }
    }
});

// Highlight selected option
function highlightOption(options, index) {
    options.forEach(option => option.classList.remove('active')); // Remove 'active' from all
    const selectedOption = options[index]; // Get the current option
    selectedOption.classList.add('active'); // Add 'active' class
    selectedOption.scrollIntoView({ block: 'nearest' }); // Ensure it's visible
}

// Hide dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-dropdown')) {
        dropdownOptions.style.display = 'none';
    }
});

});
