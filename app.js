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

const scenarios = [
  {
    prompt: "A business is profitable but tightly constrained.",
    options: [
      "Focus on operating it well",
      "Improve performance within limits",
      "Plan how to rework or expand it"
    ]
  },
  {
    prompt: "Income is inconsistent but promising.",
    options: [
      "Stabilize cash flow quickly",
      "Diagnose the core issue",
      "Accept volatility and experiment"
    ]
  },
  {
    prompt: "You disagree with an established rule.",
    options: [
      "Follow it anyway",
      "Work around it carefully",
      "Replace it"
    ]
  },
  {
    prompt: "Progress depends mostly on you.",
    options: [
      "I feel focused",
      "I feel engaged",
      "I feel energized"
    ]
  },
  {
    prompt: "Progress depends mostly on systems or others.",
    options: [
      "I feel relieved",
      "I feel neutral",
      "I feel constrained"
    ]
  }
];

/* ---------- STATE ---------- */

let responses = {
  words: [],
  wordTimes: [],
  pairs: [],
  pairTimes: [],
  scenarios: []
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
      renderScenarios();
      return;
    }

    const [a, b] = wordPairs[index];
    const start = performance.now();

    app.innerHTML = `
      <h2>Choose quickly</h2>
      <button id="a">${a}</button>
      <button id="b">${b}</button>
    `;

    document.getElementById("a").onclick = () => select(a);
    document.getElementById("b").onclick = () => select(b);

    function select(choice) {
      responses.pairs.push(choice);
      responses.pairTimes.push(performance.now() - start);
      index++;
      showPair();
    }
  }

  showPair();
}

/* ---------- SCENARIOS ---------- */

function renderScenarios() {
  let index = 0;

  function showScenario() {
    if (index >= scenarios.length) {
      finish();
      return;
    }

    const s = scenarios[index];
    app.innerHTML = `<h2>${s.prompt}</h2>`;

    s.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => {
        responses.scenarios.push(opt);
        index++;
        showScenario();
      };
      app.appendChild(btn);
    });
  }

  showScenario();
}

/* ---------- FINISH ---------- */

function finish() {
  console.log("FINAL RESULTS:", responses);

  app.innerHTML = `
    <h2>Assessment complete</h2>
    <p>Thank you. Results captured.</p>
  `;
}

/* ---------- START ---------- */

renderWordSelection();
