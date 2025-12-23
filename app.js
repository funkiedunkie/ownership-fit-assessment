const app = document.getElementById("app");

/* ---------- DATA ---------- */

const words = [
  "Methodical","Adaptive","Persistent","Experimental","Cautious",
  "Assertive","Patient","Decisive","Opportunistic","Consistent",
  "Independent","Collaborative","Practical","Vision-driven",
  "Reliable","Iterative","Measured","Resilient","Structured","Exploratory"
];

const wordPairs = [
  ["Predictable", "Flexible"],
  ["Proven", "Unproven"],
  ["Steady", "Opportunistic"],
  ["Disciplined", "Inventive"],
  ["Reliable", "Experimental"],
  ["Consistent", "Adaptive"],
  ["Methodical", "Fast-moving"],
  ["Tested", "Exploratory"]
];

/* ---------- STATE ---------- */

let responses = {
  words: [],
  wordTimes: [],
  pairs: [],
  pairTimes: []
};

/* ---------- WORD SELECTION ---------- */

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
      if (responses.words.length >= 5 || btn.disabled) return;

      responses.words.push(word);
      responses.wordTimes.push(performance.now() - startTime);

      btn.disabled = true;
      btn.style.opacity = 0.5;

      if (responses.words.length === 5) {
        document.getElementById("continue").disabled = false;
      }
    };

    grid.appendChild(btn);
  });

  document.getElementById("continue").onclick = renderWordPairs;
}

/* ---------- WORD PAIRS ---------- */

function renderWordPairs() {
  let index = 0;

  function showPair() {
    if (index >= wordPairs.length) {
      finish();
      return;
    }

    const [a, b] = wordPairs[index];
    const start = performance.now();

    app.innerHTML = `
      <h2>Choose quickly</h2>
      <button id="a">${a}</button>
      <button id="b">${b}</button>
    `;

    document.getElem

