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
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function timingWeight(ms, med) {
  if (!med || med <= 0) return 1.0;
  if (ms <= med * 0.9) return 1.15;
  if (ms >= med * 1.1) return 0.85;
  return 1.0;
}

function normalizeTo100(raw) {
  const total = raw.Franchise + raw.Existing + raw.Startup;
  if (total <= 0) return { Franchise: 33, Existing: 33, Startup: 34 };

  let f = Math.round((raw.Franchise / total) * 100);
  let e = Math.round((raw.Existing / total) * 100);
  let s = Math.round((raw.Startup / total) * 100);

  let sum = f + e + s;
  if (sum !== 100) {
    const diff = 100 - sum;
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

/* ---------- DATA ---------- */

const wordPages = [
  ["Reliable", "Practical", "Experimental"],
  ["Consistent", "Collaborative", "Exploratory"]
];

const wordPairs = [
  ["Predictable", "Flexible"],
  ["Steady", "Opportunistic"],
  ["Reliable", "Experimental"],
  ["Consistent", "Adaptive"],
  ["Follow the process", "Own the process"],
  ["Tested", "Exploratory"]
];

const scenarios = [
  {
    prompt: "When a well-documented process already exists, I feel:",
    options: ["Comfortable", "Evaluative", "Uninspired"]
  },
  {
    prompt: "When decisions are made for me by a larger system or organization, I tend to:",
    options: [
      "Appreciate the clarity",
      "Evaluate whether they can be improved",
      "Resist and want autonomy"
    ]
  },
  {
    prompt: "When building something from scratch, I feel:",
    options: ["Energized", "Curious but cautious", "Prefer to improve what exists"]
  },
  {
    prompt: "When there’s an opportunity to create something new, I feel:",
    options: ["Cautious", "Interested", "Compelled"]
  }
];

const stageQuestions = [
  {
    prompt: "At this stage of my life, I’m most interested in:",
    options: [
      "Building something that demands intense personal involvement",
      "Improving and scaling something that already works",
      "Owning something stable that runs without me daily"
    ]
  },
  {
    prompt: "Over the next 3–5 years, I’m most willing to trade:",
    options: [
      "Time and intensity for upside",
      "Focused effort for steady improvement",
      "Capital for predictability"
    ]
  },
  {
    prompt: "Compared to earlier in my career, my tolerance for sustained uncertainty is:",
    options: ["Higher", "About the same", "Lower"]
  }
];

const choiceMap = new Map([
  ["Reliable", "Franchise"],
  ["Consistent", "Franchise"],
  ["Practical", "Existing"],
  ["Collaborative", "Existing"],
  ["Experimental", "Startup"],
  ["Exploratory", "Startup"],

  ["Predictable", "Franchise"],
  ["Steady", "Franchise"],
  ["Follow the process", "Franchise"],
  ["Tested", "Franchise"],

  ["Flexible", "Existing"],
  ["Opportunistic", "Existing"],
  ["Adaptive", "Existing"],
  ["Own the process", "Existing"],

  ["Experimental", "Startup"],
  ["Exploratory", "Startup"],

  ["Comfortable", "Franchise"],
  ["Appreciate the clarity", "Franchise"],
  ["Cautious", "Franchise"],

  ["Evaluative", "Existing"],
  ["Evaluate whether they can be improved", "Existing"],
  ["Interested", "Existing"],

  ["Uninspired", "Startup"],
  ["Resist and want autonomy", "Startup"],
  ["Compelled", "Startup"],
  ["Energized", "Startup"]
]);

/* ---------- STATE ---------- */

const state = {
  stepIndex: 0,
  totalSteps:
    wordPages.length +
    wordPairs.length +
    scenarios.length +
    stageQuestions.length,

  wordChoices: [],
  wordTimes: [],
  pairChoices: [],
  pairTimes: [],
  scenarioChoices: [],
  stageChoices: []
};

/* ---------- UI HELPERS ---------- */

function renderShell(title, subtitle, innerHtml, nextEnabled = false, nextText = "Next") {
  const progressPct = Math.round((state.stepIndex / state.totalSteps) * 100);

  app.innerHTML = `
    <div class="card">
      <div class="header">
        <div class="progress-wrap">
          <div class="progress" style="width:${progressPct}%"></div>
        </div>
        <div class="step">${state.stepIndex} / ${state.totalSteps}</div>
      </div>
      <h2>${title}</h2>
      ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
      <div class="content">${innerHtml}</div>
      <div class="footer">
        <button id="next" class="next" ${nextEnabled ? "" : "disabled"}>${nextText}</button>
      </div>
    </div>
  `;
}

function renderChoiceButtons(options) {
  return `
    <div class="btn-grid">
      ${options.map(opt => `<button class="choice">${opt}</button>`).join("")}
    </div>
  `;
}

function renderVsPair(left, right) {
  return `
    <div class="pair-wrap">
      <button class="choice pair">${left}</button>
      <div class="vs">VS.</div>
      <button class="choice pair">${right}</button>
    </div>
  `;
}

function attachChoiceSelection(onSelect) {
  let selected = null;
  document.querySelectorAll(".choice").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = btn.textContent.trim();
      document.getElementById("next").disabled = false;
      onSelect(selected);
    });
  });
  return () => selected;
}

/* ---------- FLOW ---------- */

function start() {
  state.stepIndex = 0;
  renderWordPage(0);
}

function renderWordPage(idx) {
  state.stepIndex++;
  const options = shuffle(wordPages[idx]);
  const startTime = performance.now();

  renderShell("Pick the word that best describes you.", "", renderChoiceButtons(options));

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.wordChoices.push(selected);
    state.wordTimes.push(performance.now() - startTime);
    idx < wordPages.length - 1 ? renderWordPage(idx + 1) : renderPair(0);
  });
}

function renderPair(idx) {
  state.stepIndex++;
  const pair = shuffle(wordPairs[idx]);
  const startTime = performance.now();

  renderShell("Which word or phrase dominates?", "", renderVsPair(pair[0], pair[1]));

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.pairChoices.push(selected);
    state.pairTimes.push(performance.now() - startTime);
    idx < wordPairs.length - 1 ? renderPair(idx + 1) : renderScenario(0);
  });
}

function renderScenario(idx) {
  state.stepIndex++;
  const s = scenarios[idx];
  const options = shuffle(s.options);

  renderShell(s.prompt, "", renderChoiceButtons(options));

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.scenarioChoices.push(selected);
    idx < scenarios.length - 1 ? renderScenario(idx + 1) : renderStage(0);
  });
}

function renderStage(idx) {
  state.stepIndex++;
  const q = stageQuestions[idx];
  const options = shuffle(q.options);

  renderShell(q.prompt, "", renderChoiceButtons(options), false,
    idx === stageQuestions.length - 1 ? "See Results" : "Next");

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.stageChoices.push(selected);
    idx < stageQuestions.length - 1 ? renderStage(idx + 1) : renderResults();
  });
}

/* ---------- SCORING ---------- */

function applyStageModifier(fit) {
  let { Franchise, Existing, Startup } = fit;

  const sorted = Object.entries(fit)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.v - a.v);

  const top = sorted[0];
  const second = sorted[1];

  if (
    !(top.k === "Startup" ||
      (second.k === "Startup" && Math.abs(top.v - second.v) <= 5))
  ) return fit;

  let intensity = 0;
  state.stageChoices.forEach(choice => {
    if (
      choice.includes("intense") ||
      choice.includes("Time and intensity") ||
      choice === "Higher"
    ) intensity += 1;
    if (
      choice.includes("stable") ||
      choice.includes("Capital for predictability") ||
      choice === "Lower"
    ) intensity -= 1;
  });

  if (intensity >= 0) return fit;

  const reduction = (Math.abs(intensity) / 3) * 0.2;
  const delta = Startup * reduction;
  const newStartup = Startup - delta;

  const otherTotal = Franchise + Existing;
  let newFranchise = Franchise;
  let newExisting = Existing;

  if (otherTotal > 0) {
    newFranchise += delta * (Franchise / otherTotal);
    newExisting += delta * (Existing / otherTotal);
  } else {
    newExisting += delta;
  }

  return normalizeTo100({
    Franchise: newFranchise,
    Existing: newExisting,
    Startup: newStartup
  });
}

function scoreAssessment() {
  const raw = { Franchise: 0, Existing: 0, Startup: 0 };

  const medWord = median(state.wordTimes);
  const medPair = median(state.pairTimes);

  state.wordChoices.forEach((c, i) => {
    const a = choiceMap.get(c);
    if (a) raw[a] += timingWeight(state.wordTimes[i], medWord);
  });

  state.pairChoices.forEach((c, i) => {
    const a = choiceMap.get(c);
    if (a) raw[a] += timingWeight(state.pairTimes[i], medPair);
  });

  state.scenarioChoices.forEach(c => {
    const a = choiceMap.get(c);
    if (a) raw[a] += 1;
  });

  let fit = normalizeTo100(raw);
  fit = applyStageModifier(fit);

  const { first, second, gap } = topTwo(fit);

  return { fit, first, second, gap };
}

function renderResults() {
  const result = scoreAssessment();
  const winner = result.first.k;

  app.innerHTML = `
    <div class="card">
      <h2>Your Fit Score</h2>
      <p><strong>Best Fit:</strong> ${winner}</p>
      <p>Franchise: ${result.fit.Franchise}</p>
      <p>Existing Business: ${result.fit.Existing}</p>
      <p>Startup: ${result.fit.Startup}</p>
      <button onclick="location.reload()">Retake</button>
    </div>
  `;
}

/* ---------- START ---------- */

start();
