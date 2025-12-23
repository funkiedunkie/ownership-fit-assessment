const app = document.getElementById("app");

const words = [
  "Methodical","Adaptive","Persistent","Experimental","Cautious",
  "Assertive","Patient","Decisive","Opportunistic","Consistent",
  "Independent","Collaborative","Practical","Vision-driven",
  "Reliable","Iterative","Measured","Resilient","Structured","Exploratory"
];

let selected = [];
let timings = [];

function renderWordSelection() {
  app.innerHTML = `
    <h2>Select 5 words</h2>
    <p>Go with your first instinct.</p>
    <div id="word-grid"></div>
    <button id="continue" disabled>Continue</button>
  `;

  const grid = document.getElementById("word-grid");
  const startTime = performance.now();

  words.forEach(word => {
    const btn = document.createElement("button");
    btn.textContent = word;

    btn.onclick = () => {
      if (selected.length >= 5 || btn.disabled) return;

      const clickTime = performance.now();
      selected.push(word);
      timings.push(clickTime - startTime);

      btn.disabled = true;
      btn.style.opacity = 0.5;

      if (selected.length === 5) {
        document.getElementById("continue").disabled = false;
      }
    };

    grid.appendChild(btn);
  });

  document.getElementById("continue").onclick = () => {
    console.log("Selected words:", selected);
    console.log("Timings (ms):", timings);
    app.innerHTML = `<h2>Section complete</h2><p>Check the console.</p>`;
  };
}

renderWordSelection();
