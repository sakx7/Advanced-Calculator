document.addEventListener("DOMContentLoaded", function () {
    const keyinputs = document.getElementById('keyinputs');
    const latexDisplay = document.getElementById('latexdisplay');

    const keyConfig = {
        'Backspace': backSpace,
        'ArrowLeft': moveBack,
        'ArrowRight': moveForward,
        ' ': addSpace,
        'Enter': enter
    };

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    let previousValue = keyinputs.value;  // Keep track of the previous value
    const debouncedUpdateLatexDisplay = debounce(updateLatexDisplay, 50);

    keyinputs.addEventListener('input', function () {
        if (keyinputs.value !== previousValue) {
            previousValue = keyinputs.value;  // Update the previous value
            debouncedUpdateLatexDisplay(previousValue);  // Update the LaTeX display
        }
    });

    function enter() {
        console.log(AMTparseAMtoTeX(keyinputs.value));
    }

    function appendToKeyInputs(character) {
        const pos = keyinputs.selectionStart;
        keyinputs.value = keyinputs.value.slice(0, pos) + character + keyinputs.value.slice(pos);
        keyinputs.setSelectionRange(pos + character.length, pos + character.length);
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
        const start = keyinputs.selectionStart;
        const end = keyinputs.selectionEnd;

        if (start !== end) {
            keyinputs.value = keyinputs.value.slice(0, start) + keyinputs.value.slice(end);
            keyinputs.setSelectionRange(start, start);
        } else if (start > 0) {
            keyinputs.value = keyinputs.value.slice(0, start - 1) + keyinputs.value.slice(start);
            keyinputs.setSelectionRange(start - 1, start - 1);
        }
    }

    function clearKeyInputs() {
        keyinputs.value = '';
        previousValue = '';
    }

    function updateLatexDisplay(input) {
        let asciiMathToLatex = AMTparseAMtoTeX(input);
        let result = [];
        
        for (let i = 0; i < asciiMathToLatex.length; i++) {
            const char = asciiMathToLatex[i];
            if (char === '+' || char === '-' || asciiMathToLatex.slice(i, i + 5) === '\\cdot') {
                const operator = char === '\\' ? '\\cdot' : char;
                const operatorLength = operator.length;
                const prev = i > 0 && /\S/.test(asciiMathToLatex[i - 1]);
                const next = i + operatorLength < asciiMathToLatex.length && /\S/.test(asciiMathToLatex[i + operatorLength]);
                const isFirstTerm = i === 0 || asciiMathToLatex[i - 1] === '=';
                if (!isFirstTerm && (!prev || !next)) {
                    if (prev) { result.push('\\;'); }
                    result.push(operator);
                    if (next) { result.push('\\;'); }
                    i += operatorLength - 1;
                    continue;
                }
            }
            result.push(char);
        }

        latexDisplay.innerHTML = `$$${result.join('')}$$`;
        MathJax.typesetPromise([latexDisplay]).then(() => {
            latexDisplay.scrollLeft = latexDisplay.scrollWidth;
        }).catch(function (err) {
            console.error("MathJax rendering failed: ", err);
        });
    }

    document.querySelectorAll('#keys button').forEach(button => {
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', function () {
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
            } else if (className.includes('enter')) {
                enter();
            } else {
                appendToKeyInputs(this.textContent);
            }
            keyinputs.focus();
        });
    });
});
