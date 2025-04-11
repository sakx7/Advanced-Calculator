function enter(keyinputs, parameter, latexDisplay) {
    const inputs = {
        keyinputs: keyinputs,
        parameter: parameter,
        latexDisplay: latexDisplay 
    };
    console.log("Sending inputs:", inputs);

    fetch('http://localhost:5000/process_math', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
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
    let parameter = "simplify"; // Fix spelling
    let latexDisplay = "\\frac{x^2-1}{x-1}"; // Fix escaping
    enter(keyinputs, parameter, latexDisplay);
});

// Export the function for use elsewhere
export { enter };
