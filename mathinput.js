
function enter(keyinputs, latexDisplay) {
    console.log('Input from keyinputs:', keyinputs.value);
    let asciiMathToLatex = AMTparseAMtoTeX(keyinputs.value);
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
    console.log('Current LaTeX in latexDisplay:', newContent);
}
export { enter };
