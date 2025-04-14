window.MathJax = {
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], packages: { '[+]': ['amsmath', 'physics'] }, },
  svg: {
    fontCache: 'global'
  },
  errorSettings: {
    message: ["[Math Error]"],
    style: {
      color: "#CC0000",
      "font-style": "italic",
      "background-color": "#FFEEEE",
      "font-size": "90%",
      padding: "2px",
      border: "1px solid #CC0000"
    }
  }
};
const totalThemes = 3; // Set to however many themes you have
const themePrefix = "theme-";

function switchTheme() {
  const body = document.body;

  // Find current theme number
  let currentTheme = 1;
  for (let i = 1; i <= totalThemes; i++) {
    if (body.classList.contains(`${themePrefix}${i}`)) {
      currentTheme = i;
      body.classList.remove(`${themePrefix}${i}`);
      break;
    }
  }

  // Calculate next theme
  const nextTheme = currentTheme % totalThemes + 1;

  // Apply new theme
  body.classList.add(`${themePrefix}${nextTheme}`);
  localStorage.setItem("theme", `${themePrefix}${nextTheme}`);
}

// Optional: restore last theme on page load
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme");
  if (saved) {
    document.body.classList.add(saved);
  } else {
    document.body.classList.add(`${themePrefix}1`);
  }
});
