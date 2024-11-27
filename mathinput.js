function enter(keyinputs, paramater, latexDisplay) {
    const inputs = {
        keyinputs: keyinputs,
        paramater: paramater,
        latexDisplay: latexDisplay 
    };
    console.log(inputs);
    console.log("Sending inputs:", inputs);

    fetch('http://localhost:5000/process_math', { // Correct endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
    })
    .then(response => response.json())
    .then(data => {
        if (data.result) {
            console.log("Operation result:", data.result);
        } else {
            console.error("Error:", data.error);
        }
    })
    .catch(error => console.error("Fetch error:", error));
}

// Ensure DOM is ready before invoking
document.addEventListener("DOMContentLoaded", function () {
    let keyinputs = "(x^2-1)/(x-1)";
    let paramater = "simplify";
    let latexDisplay = "\\\\frac{x^2-1}{x-1}";
    enter(keyinputs, paramater, latexDisplay);
});

// Export the function for use elsewhere
export { enter };
