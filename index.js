
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
            if (char === '+' || char === '-' || asciiMathToLatex.slice(i, i + 5) === '\\cdot') {
                const operator = asciiMathToLatex.slice(i, i + 5) === '\\cdot' ? '\\cdot' : char;
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
    
    function updateLatexDisplay(input) {
        if (input.trim() === '') {
            latexDisplay.innerHTML = ''; 
            lastSuccessfulRender = '';
            return;
        }
    
        // Convert ASCII math to LaTeX
        let asciiMathToLatex = AMTparseAMtoTeX(input);
        const processedLatex = processLatexString(asciiMathToLatex); // Process the LaTeX string
        const newContent = `<mjx-container>$$${processedLatex}$$</mjx-container>`; // Wrap the LaTeX in <mjx-container>
    
        // Create a div to wrap the new content
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('scrollable-content'); // Add a class for styling or targeting
        contentWrapper.innerHTML = newContent; // Set the new content
    
        // Clear previous content and append the new content
        latexDisplay.innerHTML = ''; // Clear previous content
        latexDisplay.appendChild(contentWrapper); // Append new content
    
        // Initialize SimpleBar on the new content wrapper
        new SimpleBar(contentWrapper);
    
        // Use MathJax to render the LaTeX
        MathJax.typesetPromise([contentWrapper])
            .then(() => {
                const math = MathJax.startup.document.getMathItemsWithin(contentWrapper)[0]; // Get rendered math item
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
                        const simplebarContentWrapper = document.querySelector('.simplebar-content-wrapper');

                        if (isTypingAtEnd) {
                            simplebarContentWrapper.scrollLeft = simplebarContentWrapper.scrollWidth;
                            showScrollbarTemporarily();
                        } else {
                            const currentScrollPosition = simplebarContentWrapper.scrollLeft;
                            const contentWidth = simplebarContentWrapper.scrollWidth;
                            const displayWidth = simplebarContentWrapper.clientWidth;
    
                            if (contentWidth > displayWidth) {
                                const threshold = displayWidth * 0.20;
                                const estimatedCursorPosition = (cursorPosition / input.length) * contentWidth;
                                const cursorViewPosition = estimatedCursorPosition - currentScrollPosition;
                                let scrollAdjustment = 0;
    
                                if (cursorViewPosition < threshold) {
                                    scrollAdjustment = cursorViewPosition - threshold;
                                } else if (cursorViewPosition > displayWidth - threshold) {
                                    scrollAdjustment = cursorViewPosition - (displayWidth - threshold);
                                }
                                if (scrollAdjustment !== 0) {
                                    simplebarContentWrapper.scrollBy({
                                        left: scrollAdjustment,
                                        behavior: 'auto'
                                    });
                                }
                            }
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
    
    document.addEventListener('keydown', function(event) {
        if (!isFocused) {
            keyinputs.focus();
            isFocused = true;
        }        
    });
    
        
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
        enter(keyinputs.value, paramater.value, lastSuccessfulRender); // sends to mathinput.js for API
    });



});
