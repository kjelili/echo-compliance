const TAG_RULES = [
  { tag: "progress", test: /complete|done|finished|progress/i },
  { tag: "delay", test: /delay|late|blocked|hold/i },
  { tag: "safety", test: /safety|incident|risk|hazard/i },
  { tag: "labor", test: /crew|labor|labour|workers|shift/i },
  { tag: "materials", test: /material|supply|concrete|steel|timber/i },
  { tag: "weather", test: /rain|storm|weather|wind|temperature/i }
];

const PRIORITY_RULES = [
  { label: "High", test: /incident|injury|urgent|critical|hazard|risk/i },
  { label: "Medium", test: /delay|blocked|late|hold|rework/i }
];

function extractRisks(text) {
  const matches = text.match(/(risk|hazard|incident|injury|delay)[^.?!]*/gi) ?? [];
  return matches.slice(0, 3).map((item) => item.trim());
}

function splitSentences(text) {
  return text
    .split(/[.?!]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function inferPriority(updateText, tags) {
  for (const rule of PRIORITY_RULES) {
    if (rule.test.test(updateText)) {
      return rule.label;
    }
  }
  if (tags.includes("weather") || tags.includes("materials")) {
    return "Medium";
  }
  return "Low";
}

function buildActions(risks, tags, updateText) {
  const actions = [];

  if (risks.length) {
    actions.push("Confirm mitigation owners and close out each flagged risk before next shift.");
  }
  if (tags.includes("delay")) {
    actions.push("Review blocker causes and publish a recovery plan with revised timeline.");
  }
  if (tags.includes("materials")) {
    actions.push("Validate material availability and escalation path for low-stock items.");
  }
  if (tags.includes("safety") && /scaffold/i.test(updateText)) {
    actions.push("Reinspect scaffold zones and document controls before work resumes.");
  }
  if (actions.length === 0) {
    actions.push("Continue as planned and capture a verification photo set at end of shift.");
  }

  return actions.slice(0, 4);
}

function createActionTemplates(actions, foreman) {
  return actions.map((description, index) => ({
    description,
    owner: foreman,
    dueInDays: index === 0 ? 1 : 2,
    status: "open"
  }));
}

export function structureDailyLog({ siteName, foreman, updateText, attachments }) {
  const tags = TAG_RULES.filter((rule) => rule.test.test(updateText)).map((rule) => rule.tag);
  const risks = extractRisks(updateText);
  const sentences = splitSentences(updateText);
  const summary = sentences.slice(0, 2).join(". ").trim();
  const priority = inferPriority(updateText, tags);
  const actions = buildActions(risks, tags, updateText);
  const actionTemplates = createActionTemplates(actions, foreman);
  const watchouts = risks.length ? risks : ["No explicit risk terms detected in this update."];
  const progressPoints = sentences.slice(0, 3);
  const handoverNotes = [
    `Next check-in owner: ${foreman}`,
    `Evidence captured: ${attachments.length} photo(s).`
  ];

  return {
    summary: summary || "Site update captured successfully.",
    tags: tags.length ? tags : ["general"],
    actionTemplates,
    structured: {
      siteName,
      foreman,
      reportHeadline: `Daily Compliance Brief - ${siteName}`,
      reportPriority: priority,
      executiveSummary:
        summary || "Work update recorded successfully; no detailed narrative was provided.",
      progressPoints,
      riskWatchlist: watchouts,
      recommendedActions: actions,
      handoverNotes,
      keyActivities: sentences.slice(0, 5),
      potentialRisks: risks,
      photoCount: attachments.length,
      complianceNotes: risks.length
        ? "Risk terms detected. Please review and confirm mitigations."
        : "No explicit risks detected in this update."
    }
  };
}

export function formatStructuredReportText(structured) {
  const report = structured ?? {};
  const asList = (items) =>
    Array.isArray(items) && items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";

  return [
    `Headline: ${report.reportHeadline ?? "Daily Compliance Brief"}`,
    `Priority: ${report.reportPriority ?? "Low"}`,
    "",
    "Executive Summary:",
    report.executiveSummary ?? "No summary available.",
    "",
    "Progress Points:",
    asList(report.progressPoints ?? report.keyActivities),
    "",
    "Risk Watchlist:",
    asList(report.riskWatchlist ?? report.potentialRisks),
    "",
    "Recommended Actions:",
    asList(report.recommendedActions),
    "",
    "Handover Notes:",
    asList(report.handoverNotes),
    "",
    `Compliance Notes: ${report.complianceNotes ?? "No compliance note."}`,
    `Photo Count: ${report.photoCount ?? 0}`
  ].join("\n");
}

export function formatDailyBrief({ siteName, foreman, createdAt, summary, tags, structured }) {
  const report = structured ?? {};
  const priority = report.reportPriority ?? "Low";
  const actions =
    Array.isArray(report.recommendedActions) && report.recommendedActions.length
      ? report.recommendedActions.slice(0, 2)
      : ["Continue as planned and confirm end-of-shift checks."];
  const risks =
    Array.isArray(report.riskWatchlist) && report.riskWatchlist.length
      ? report.riskWatchlist.slice(0, 2)
      : ["No explicit risks detected."];

  return [
    `Daily Brief | ${siteName} | ${new Date(createdAt).toLocaleDateString()}`,
    `Foreman: ${foreman} | Priority: ${priority}`,
    "",
    `Summary: ${summary}`,
    "",
    "Top Risks:",
    ...risks.map((item) => `- ${item}`),
    "",
    "Immediate Actions:",
    ...actions.map((item) => `- ${item}`),
    "",
    `Tags: ${(tags ?? []).join(", ") || "general"}`
  ].join("\n");
}
