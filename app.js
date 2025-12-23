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
    options: ["Operate it well", "Optimize within limits", "Rework or expand it"]
  },
  {
    prompt: "Income is inconsistent but promising.",
    options: ["Stabilize quickly", "Diagnose first", "Experiment"]
  },
  {
    prompt: "You disagree with an established rule.",
    options: ["Follow it", "Work around it", "Replace it"]
  },
  {
    prompt: "Progress depends mostly on you.",
    options: ["Focused", "Engaged", "Energized"]
  },
  {
    prompt: "Progress depends mostly on systems or others.",
    options: ["Relieved", "Neutral", "Constrained"]
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

/* ---------- SCORING MAPS (INTERNAL) ---------- */

const wordScores = {
  Franchise: ["Methodical","Consistent","Reliable","Structured","Patient","Practical","Measured"],
  Existing: ["Persistent","Collaborative","Assertive","Decisive","Resilient"],
  Startup: ["Experimental","Opportunistic","Vision-driven","Exploratory","Adaptive","Iterative","Independent"]
};

const pairScores = {
  Franchise: ["Predictable","Proven","Steady","Disciplined","Reliable","Consistent","Methodical","Tested"],
  Startup: ["Flexible","Unproven","Opportunistic","Inventive","Experimental","Adaptive","Fast-moving","Exploratory"]
};

const scenarioScores = {
  Franchise: ["Operate it well","Stabilize quickly","Follow it","Relieved"],
  Existing: ["Optimize within limits","Diagnose first","Work around it","Focused","Engaged","Neutral"],
  Startup: ["Rework or expand it","Experiment","Replace it","Energized","Constrained"]
};

/* ---------- TIMING ---------- */

function timingMultiplier(ms) {
  if (ms < 1500) return 1.0;
  if (ms < 3000) return 0.7;
  return 0.4;
}

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

/* ---------- SCORING ---------- */

function calculateScore() {
  let score = { Franchise: 0, Existing: 0, Startup: 0 };

  responses.words.forEach((w, i) => {
    const weight = timingMultiplier(responses.wordTimes[i]);
    Object.keys(wordScores).forEach(type => {
      if (wordScores[type].includes(w)) score[type] += 1 * weight;
    });
  });

  responses.pairs.forEach((p, i) => {
    const weight = timingMultiplier(responses.pairTimes[i]);
    Object.keys(pairScores).forEach(type => {
      if (pairScores[type].includes(p)) score[type] += 1 * weight;
    });
  });

  responses.scenarios.forEach(s => {
    Object.keys(scenarioScores).forEach(type => {
      if (scenarioScores[type].includes(s)) score[type] += 1;
    });
  });

  return score;
}

/* ---------- FINISH ---------- */

function finish() {
  const score = calculateScore();
  const result = Object.keys(score).reduce((a, b) =>
    score[a] > score[b] ? a : b
  );

  console.log("FINAL SCORE:", score);

  app.innerHTML = `
    <h2>Your Ownership Fit</h2>
    <h1>${result}</h1>
    <p>This reflects how you respond under real decision pressure.</p>
  `;
}

/* ---------- START ---------- */

renderWordSelection();
