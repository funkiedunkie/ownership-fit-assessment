const app = document.getElementById("app");

/* ---------- UTIL ---------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function timingWeight(ms, med) {
  // Relative to the user's own median.
  // Mild influence to sharpen signal without penalizing thoughtful people.
  if (!med || med <= 0) return 1.0;
  if (ms <= med * 0.9) return 1.15;   // faster than their norm
  if (ms >= med * 1.1) return 0.85;   // slower than their norm
  return 1.0;                         // near their norm
}

function normalizeTo100(raw) {
  const total = raw.Franchise + raw.Existing + raw.Startup;
  if (total <= 0) return { Franchise: 33, Existing: 33, Startup: 34 };

  let f = Math.round((raw.Franchise / total) * 100);
  let e = Math.round((raw.Existing / total) * 100);
  let s = Math.round((raw.Startup / total) * 100);

  // Fix rounding so sum is exactly 100
  let sum = f + e + s;
  if (sum !== 100) {
    const diff = 100 - sum;
    // Add/subtract from the highest bucket to keep things stable
    const entries = [
      { k: "Franchise", v: f },
      { k: "Existing", v: e },
      { k: "Startup", v: s }
    ].sort((a, b) => b.v - a.v);

    if (entries[0].k === "Franchise") f += diff;
    if (entries[0].k === "Existing") e += diff;
    if (entries[0].k === "Startup") s += diff;
  }

  return { Franchise: f, Existing: e, Startup: s };
}

function topTwo(normalized) {
  const arr = Object.entries(normalized).map(([k, v]) => ({ k, v }));
  arr.sort((a, b) => b.v - a.v);
  return { first: arr[0], second: arr[1], gap: arr[0].v - arr[1].v };
}

/* ---------- ASSESSMENT DATA ---------- */

// 4 pages, 3 choices each
const wordPages = [
  ["Visionary", "Reliable", "Practical"],
  ["Experimental", "Consistent", "Adaptive"],
  ["Independent", "Structured", "Decisive"],
  ["Opportunistic", "Patient", "Iterative"]
];

// 8 pairs
const wordPairs = [
  ["Execute", "Shape"],
  ["Proven", "Adaptable"],
  ["Clear rules", "Judgment"],
  ["Consistent", "Evolving"],
  ["Adopt", "Invent"],
  ["Stable", "Directional"],
  ["Follow the process", "Own the process"],
  ["Refine", "Reimagine"]
];

// 5 scenarios
const scenarios = [
  {
    prompt: "When a well-documented process already exists, I feel:",
    options: ["Uninspired", "Comfortable", "Evaluative"]
  },
  {
    prompt: "When I believe an existing process can be improved, I typically feel:",
    options: ["Constrained", "Accepting", "Engaged"]
  },
  {
    prompt: "When the long-term vision is already defined for me, I feel:",
    options: ["Neutral", "Disconnected", "Reassured"]
  },
  {
    prompt: "When important decisions are made above me, I feel:",
    options: ["Selective", "Aligned", "Resistant"]
  },
  {
    prompt: "When there’s an opportunity to create something new, I feel:",
    options: ["Interested", "Compelled", "Cautious"]
  }
];

// Choice → archetype mapping (by STRING, order-independent)
const choiceMap = new Map([
  // Word pages
  ["Reliable", "Franchise"],
  ["Consistent", "Franchise"],
  ["Structured", "Franchise"],
  ["Patient", "Franchise"],

  ["Practical", "Existing"],
  ["Adaptive", "Existing"],
  ["Decisive", "Existing"],
  ["Iterative", "Existing"],

  ["Visionary", "Startup"],
  ["Experimental", "Startup"],
  ["Independent", "Startup"],
  ["Opportunistic", "Startup"],

  // Word pairs
  ["Execute", "Franchise"],
  ["Proven", "Franchise"],
  ["Clear rules", "Franchise"],
  ["Consistent", "Franchise"],
  ["Adopt", "Franchise"],
  ["Stable", "Franchise"],
  ["Follow the process", "Franchise"],

  ["Shape", "Existing"],
  ["Adaptable", "Existing"],
  ["Judgment", "Existing"],
  ["Evolving", "Existing"],
  ["Refine", "Existing"],
  ["Own the process", "Existing"],

  ["Invent", "Startup"],
  ["Directional", "Startup"],
  ["Reimagine", "Startup"],

  // Scenarios
  ["Comfortable", "Franchise"],
  ["Accepting", "Franchise"],
  ["Reassured", "Franchise"],
  ["Aligned", "Franchise"],
  ["Cautious", "Franchise"],

  ["Evaluative", "Existing"],
  ["Engaged", "Existing"],
  ["Neutral", "Existing"],
  ["Selective", "Existing"],
  ["Interested", "Existing"],

  ["Uninspired", "Startup"],
  ["Constrained", "Startup"],
  ["Disconnected", "Startup"],
  ["Resistant", "Startup"],
  ["Compelled", "Startup"]
]);

/* ---------- EXPLANATIONS ---------- */

const explainStrong = {
  Franchise:
    "Your responses strongly suggest that you’re best suited for an environment with clear expectations, proven systems, and defined processes. You tend to perform at your best when the playbook is established and success comes from disciplined execution rather than reinvention.",
  Existing:
    "Your responses indicate a strong fit for owning and improving an existing business. You’re comfortable working within established systems, but you value the freedom to refine, adapt, and improve them when necessary. This balance of structure and autonomy tends to bring out your best work.",
  Startup:
    "Your responses show a strong preference for environments where you own the vision from the outset. You’re energized by creating direction, building from scratch, and shaping how things work. Operating inside someone else’s fixed framework is likely to feel limiting over time."
};

const explainClose = {
  Franchise:
    "Your tendency appears to be toward a franchise-style environment, where structure and proven systems support consistent execution. That said, your responses also suggest you may have developed skills to be successful as {SECOND}.",
  Existing:
    "Your strongest fit points toward owning an existing business, where you can work with established systems while still exercising judgment and control. At the same time, your profile suggests you may have developed skills to be successful as {SECOND}.",
  Startup:
    "Your results lean toward a startup-style environment, where owning the vision and shaping direction are central. However, your responses also indicate you may have developed skills to be successful as {SECOND}."
};

function archetypeLabel(k) {
  if (k === "Existing") return "Existing Business";
  return k;
}

/* ---------- STATE ---------- */

const state = {
  stepIndex: 0,
  totalSteps: wordPages.length + wordPairs.length + scenarios.length,

  // responses
  wordChoices: [],       // 4
  wordTimes: [],         // 4

  pairChoices: [],       // 8
  pairTimes: [],         // 8

  scenarioChoices: []    // 5
};

/* ---------- UI ---------- */

function renderShell(title, subtitle, innerHtml, nextEnabled = false, nextText = "Next") {
  const progressPct = Math.round((state.stepIndex / state.totalSteps) * 100);

  app.innerHTML = `
    <div class="card">
      <div class="header">
        <div class="progress-wrap" aria-label="Progress">
          <div class="progress" style="width:${progressPct}%"></div>
        </div>
        <div class="step">${state.stepIndex} / ${state.totalSteps}</div>
      </div>

      <h2>${title}</h2>
      ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}

      <div class="content">
        ${innerHtml}
      </div>

      <div class="footer">
        <button id="next" class="next" ${nextEnabled ? "" : "disabled"}>${nextText}</button>
      </div>
    </div>
  `;
}

function renderChoiceButtons(options) {
  return `
    <div class="btn-grid">
      ${options.map((opt, idx) => `<button class="choice" data-idx="${idx}">${opt}</button>`).join("")}
    </div>
  `;
}

/* ---------- FLOW ---------- */

function start() {
  state.stepIndex = 0;
  renderWordPage(0);
}

function renderWordPage(pageIdx) {
  state.stepIndex += 1;

  const options = shuffle(wordPages[pageIdx]);
  const startTime = performance.now();

  renderShell(
    "Pick the word that best describes you.",
    "",
    renderChoiceButtons(options),
    false,
    pageIdx === wordPages.length - 1 ? "Next" : "Next"
  );

  let selected = null;

  document.querySelectorAll(".choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = btn.textContent.trim();
      document.getElementById("next").disabled = false;
    });
  });

  document.getElementById("next").addEventListener("click", () => {
    const elapsed = performance.now() - startTime;
    state.wordChoices.push(selected);
    state.wordTimes.push(elapsed);

    if (pageIdx < wordPages.length - 1) {
      renderWordPage(pageIdx + 1);
    } else {
      renderPair(0);
    }
  });
}

function renderPair(pairIdx) {
  state.stepIndex += 1;

  const pair = wordPairs[pairIdx];
  const options = shuffle(pair); // randomize left/right
  const startTime = performance.now();

  renderShell(
    "Which word or phrase dominates?",
    "",
    renderChoiceButtons(options.map(o => o)), // two buttons
    false,
    pairIdx === wordPairs.length - 1 ? "Next" : "Next"
  );

  let selected = null;

  document.querySelectorAll(".choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = btn.textContent.trim();
      document.getElementById("next").disabled = false;
    });
  });

  document.getElementById("next").addEventListener("click", () => {
    const elapsed = performance.now() - startTime;
    state.pairChoices.push(selected);
    state.pairTimes.push(elapsed);

    if (pairIdx < wordPairs.length - 1) {
      renderPair(pairIdx + 1);
    } else {
      renderScenario(0);
    }
  });
}

function renderScenario(sIdx) {
  state.stepIndex += 1;

  const s = scenarios[sIdx];
  const options = shuffle(s.options);

  renderShell(
    s.prompt,
    "",
    renderChoiceButtons(options),
    false,
    sIdx === scenarios.length - 1 ? "See Results" : "Next"
  );

  let selected = null;

  document.querySelectorAll(".choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = btn.textContent.trim();
      document.getElementById("next").disabled = false;
    });
  });

  document.getElementById("next").addEventListener("click", () => {
    state.scenarioChoices.push(selected);

    if (sIdx < scenarios.length - 1) {
      renderScenario(sIdx + 1);
    } else {
      renderResults();
    }
  });
}

/* ---------- SCORING ---------- */

function scoreAssessment() {
  const raw = { Franchise: 0, Existing: 0, Startup: 0 };

  const medWord = median(state.wordTimes);
  const medPair = median(state.pairTimes);

  // Words (timed, relative)
  state.wordChoices.forEach((choice, i) => {
    const archetype = choiceMap.get(choice);
    if (!archetype) return;
    const w = timingWeight(state.wordTimes[i], medWord);
    raw[archetype] += 1 * w;
  });

  // Pairs (timed, relative)
  state.pairChoices.forEach((choice, i) => {
    const archetype = choiceMap.get(choice);
    if (!archetype) return;
    const w = timingWeight(state.pairTimes[i], medPair);
    raw[archetype] += 1 * w;
  });

  // Scenarios (untimed)
  state.scenarioChoices.forEach(choice => {
    const archetype = choiceMap.get(choice);
    if (!archetype) return;
    raw[archetype] += 1;
  });

  const fit = normalizeTo100(raw);
  const { first, second, gap } = topTwo(fit);

  // Explanation selection
  const STRONG_GAP = 20;   // strong lean
  const CLOSE_GAP = 10;    // winner exists, but second is close if gap < 10

  let explanation = "";
  if (gap >= STRONG_GAP) {
    explanation = explainStrong[first.k];
  } else {
    const secondLabel = archetypeLabel(second.k);
    explanation = explainClose[first.k].replace("{SECOND}", secondLabel);
  }

  return { raw, fit, first, second, gap, explanation };
}

function renderResults() {
  const result = scoreAssessment();

  const winner = result.first.k;
  const winnerLabel = archetypeLabel(winner);

  const f = result.fit.Franchise;
  const e = result.fit.Existing;
  const s = result.fit.Startup;

  const bars = `
    <div class="scores">
      ${renderScoreRow("Franchise", f, winner === "Franchise")}
      ${renderScoreRow("Existing Business", e, winner === "Existing")}
      ${renderScoreRow("Startup", s, winner === "Startup")}
    </div>
  `;

  const inner = `
    <div class="result">
      <div class="winner">Best Fit: <span class="winner-pill">${winnerLabel}</span></div>
      ${bars}
      <div class="explain">${result.explanation}</div>
      <button id="restart" class="restart">Retake</button>
    </div>
  `;

  // stepIndex shows completed state
  state.stepIndex = state.totalSteps;

  renderShell("Your Fit Score", "", inner, true, "Done");
  document.getElementById("next").style.display = "none";

  document.getElementById("restart").addEventListener("click", () => {
    // reset
    state.stepIndex = 0;
    state.wordChoices = [];
    state.wordTimes = [];
    state.pairChoices = [];
    state.pairTimes = [];
    state.scenarioChoices = [];
    start();
  });

  // Debug if you want:
  // console.log(result);
}

function renderScoreRow(label, pct, isWinner) {
  return `
    <div class="score-row ${isWinner ? "winner-row" : ""}">
      <div class="score-label">${label}</div>
      <div class="score-bar">
        <div class="score-fill" style="width:${pct}%"></div>
      </div>
      <div class="score-pct">${pct}</div>
    </div>
  `;
}

/* ---------- START ---------- */

start();
