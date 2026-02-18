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

  const keys = ["Franchise", "Existing", "Startup"];
  const exact = keys.map(k => (raw[k] / total) * 100);
  const floored = exact.map(v => Math.floor(v));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);

  // Distribute remaining points to entries with largest fractional parts
  const fractions = exact.map((v, i) => ({ i, frac: v - floored[i] }));
  fractions.sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < remainder; j++) {
    floored[fractions[j].i]++;
  }

  return { Franchise: floored[0], Existing: floored[1], Startup: floored[2] };
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
  ["Dependable", "Innovative"],
  ["Structured", "Adaptive"],
  ["Follow the process", "Own the process"],
  ["Proven", "Pioneering"]
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
    prompt: "When there's an opportunity to create something new, I feel:",
    options: ["Cautious", "Interested", "Compelled"]
  }
];

const stageQuestions = [
  {
    prompt: "At this stage in my life, I'd prefer to leverage:",
    options: [
      "My time and effort",
      "My capital and resources"
    ]
  },
  {
    prompt: "My tolerance for 60+ hour weeks at this stage of my life is:",
    options: ["High", "Moderate", "Low"]
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
  ["Dependable", "Franchise"],
  ["Structured", "Franchise"],
  ["Follow the process", "Franchise"],
  ["Proven", "Franchise"],

  ["Flexible", "Existing"],
  ["Opportunistic", "Existing"],
  ["Adaptive", "Existing"],
  ["Own the process", "Existing"],

  ["Comfortable", "Franchise"],
  ["Appreciate the clarity", "Franchise"],
  ["Cautious", "Franchise"],
  ["Prefer to improve what exists", "Existing"],

  ["Evaluative", "Existing"],
  ["Evaluate whether they can be improved", "Existing"],
  ["Interested", "Existing"],
  ["Curious but cautious", "Existing"],

  ["Uninspired", "Startup"],
  ["Resist and want autonomy", "Startup"],
  ["Compelled", "Startup"],
  ["Energized", "Startup"],
  ["Innovative", "Startup"],
  ["Pioneering", "Startup"]
]);

/* ---------- STATE ---------- */

const state = {
  currentStep: 0,
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

/* ---------- UI ---------- */

function renderShell(title, innerHtml, nextEnabled = false, nextText = "Next") {
  const progressPercent = (state.currentStep / state.totalSteps) * 100;
  
  app.innerHTML = `
    <div class="card">
      <div class="header">
        <div class="progress-wrap">
          <div class="progress" style="width: ${progressPercent}%"></div>
        </div>
        <div class="step">${state.currentStep} / ${state.totalSteps}</div>
      </div>
      <h2>${title}</h2>
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
      document.querySelectorAll(".choice").forEach(b => {
        b.classList.remove("selected");
        // Remove any existing checkmarks
        const existingCheck = b.querySelector(".checkmark");
        if (existingCheck) existingCheck.remove();
      });
      btn.classList.add("selected");
      
      // Add checkmark animation
      const checkmark = document.createElement("span");
      checkmark.className = "checkmark";
      checkmark.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10L8 14L16 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      btn.appendChild(checkmark);
      
      selected = btn.textContent.trim();
      document.getElementById("next").disabled = false;
      onSelect(selected);
    });
  });
}

/* ---------- FLOW ---------- */

function start() {
  renderWordPage(0);
}

function renderWordPage(idx) {
  const options = shuffle(wordPages[idx]);
  const startTime = performance.now();

  renderShell("Pick the word that best describes you.", renderChoiceButtons(options));

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.wordChoices.push(selected);
    state.wordTimes.push(performance.now() - startTime);
    state.currentStep++;
    idx < wordPages.length - 1 ? renderWordPage(idx + 1) : renderPair(0);
  });
}

function renderPair(idx) {
  const pair = shuffle(wordPairs[idx]);
  const startTime = performance.now();

  renderShell("Which word or phrase dominates?", renderVsPair(pair[0], pair[1]));

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.pairChoices.push(selected);
    state.pairTimes.push(performance.now() - startTime);
    state.currentStep++;
    idx < wordPairs.length - 1 ? renderPair(idx + 1) : renderScenario(0);
  });
}

function renderScenario(idx) {
  const sc = scenarios[idx];
  renderShell(sc.prompt, renderChoiceButtons(shuffle(sc.options)));

  let selected = null;
  attachChoiceSelection(val => selected = val);

  document.getElementById("next").addEventListener("click", () => {
    state.scenarioChoices.push(selected);
    state.currentStep++;
    idx < scenarios.length - 1 ? renderScenario(idx + 1) : renderStage(0);
  });
}

function renderStage(idx) {
  const q = stageQuestions[idx];
  renderShell(q.prompt, renderChoiceButtons(shuffle(q.options)),
    false,
    idx === stageQuestions.length - 1 ? "See Results" : "Next");

  let selected = null;
  attachChoiceSelection(s => selected = s);

  document.getElementById("next").addEventListener("click", () => {
    state.stageChoices.push(selected);
    state.currentStep++;
    idx < stageQuestions.length - 1 ? renderStage(idx + 1) : renderResults();
  });
}

/* ---------- SCORING ---------- */

function calculateScores() {
  const raw = { Franchise: 0, Existing: 0, Startup: 0 };

  // Word choices - base weight of 1.0
  state.wordChoices.forEach(choice => {
    const bucket = choiceMap.get(choice);
    if (bucket) raw[bucket] += 1.0;
  });

  // Pair choices - weighted by timing
  const medianPairTime = median(state.pairTimes);
  state.pairChoices.forEach((choice, i) => {
    const bucket = choiceMap.get(choice);
    if (bucket) {
      const weight = timingWeight(state.pairTimes[i], medianPairTime);
      raw[bucket] += weight;
    }
  });

  // Scenario choices - weight of 1.5
  state.scenarioChoices.forEach(choice => {
    const bucket = choiceMap.get(choice);
    if (bucket) raw[bucket] += 1.5;
  });

  // Normalize to 100%
  let normalized = normalizeTo100(raw);

  // Apply stage modifier
  normalized = applyStageModifier(normalized);

  return normalized;
}

function applyStageModifier(fit) {
  let { Franchise, Existing, Startup } = fit;

  // ----- Deterministic Stage Scoring -----
  const stageMap = new Map([
    // Question 1: Leverage preference
    ["My time and effort", 1],
    ["My capital and resources", -1],

    // Question 2: Work tolerance
    ["High", 1],
    ["Moderate", 0],
    ["Low", -1]
  ]);

  let intensity = 0;

  state.stageChoices.forEach(choice => {
    if (stageMap.has(choice)) {
      intensity += stageMap.get(choice);
    }
  });

  // If no low-intensity signal, don't reduce
  if (intensity >= 0) return fit;

  // ----- Reduction based on intensity score -----
  // intensity = -1: ~17.5% reduction
  // intensity = -2: ~35% reduction
  const maxReductionPercent = 0.35;
  const reductionPercent = (Math.abs(intensity) / 2) * maxReductionPercent;

  const delta = Startup * reductionPercent;
  const newStartup = Startup - delta;

  // ----- Proportional Redistribution -----
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

function getExplanation(winner, scores) {
  const explanations = {
    Franchise: `You show a strong preference for proven systems and predictable structures. Franchise ownership may offer you the reliability and tested processes that align with your working style.`,
    Existing: `You balance structured processes with creative problem-solving. Acquiring an existing business may give you the foundation to improve and scale while maintaining operational clarity.`,
    Startup: `You thrive on autonomy and building from the ground up. Starting a new venture may channel your entrepreneurial energy and desire for creative control.`
  };

  const { first, second, gap } = topTwo(scores);
  
  let explanation = explanations[winner];
  
  if (gap < 10) {
    explanation += ` That said, your scores are quite close between ${first.k} (${first.v}%) and ${second.k} (${second.v}%), suggesting you may find success in multiple pathways.`;
  }

  return explanation;
}

function renderResults() {
  const scores = calculateScores();
  const { first, second } = topTwo(scores);
  const winner = first.k;
  const explanation = getExplanation(winner, scores);

  // Trigger confetti
  createConfetti();

  const html = `
    <div class="result">
      <div class="winner">
        Your best fit: <span class="winner-pill">${winner}</span>
      </div>
      
      <div class="scores">
        ${Object.entries(scores)
          .sort((a, b) => b[1] - a[1])
          .map(([type, pct], idx) => `
            <div class="score-row ${idx === 0 ? 'winner-row' : 'secondary-row'}">
              <div class="score-label">${type}</div>
              <div class="score-bar">
                <div class="score-fill" style="width: 0%" data-target="${pct}"></div>
              </div>
              <div class="score-pct">${pct}%</div>
            </div>
          `).join('')}
      </div>

      <div class="explain">${explanation}</div>

      <button class="restart" onclick="location.reload()">Take Again</button>
    </div>
  `;

  renderShell("Your Ownership Fit Profile", html, false, "");
  document.querySelector('.footer').style.display = 'none';
  
  // Animate score bars racing
  setTimeout(() => {
    document.querySelectorAll('.score-fill').forEach((fill, idx) => {
      setTimeout(() => {
        const target = fill.getAttribute('data-target');
        fill.style.width = target + '%';
      }, idx * 200);
    });
  }, 300);
}

function createConfetti() {
  const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.3 + 's';
    confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
  }
}

/* ---------- START ---------- */

start();
