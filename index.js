import { enter } from './mathinput.js';

document.addEventListener("DOMContentLoaded", function () {
    const keyinputs = document.getElementById('keyinputs');
    const latexDisplay = document.getElementById('latexdisplay');


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
    const debouncedUpdateLatexDisplay = debounce(updateLatexDisplay, 50);

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

    let lastSuccessfulRender = ''; 
    function updateLatexDisplay(input) {
        let asciiMathToLatex = AMTparseAMtoTeX(input);
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
        const newContent = `$$${result.join('')}$$`;
        latexDisplay.innerHTML = newContent;
        MathJax.typesetPromise([latexDisplay])
            .then(() => {
                latexDisplay.scrollLeft = latexDisplay.scrollWidth;
                const math = MathJax.startup.document.getMathItemsWithin(latexDisplay)[0];
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
                        lastSuccessfulRender = newContent;
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
        enter(keyinputs, latexDisplay);
        if (!isFocused) {
            keyinputs.focus();
        }
    });



});
