import { jsPDF } from "jspdf";

const LOGS_KEY = "echo-compliance:logs:v2";

let cloudFileHandle = null;
let lastSyncedAt = "";

function nowIso() {
  return new Date().toISOString();
}

function parseJsonSafe(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readPersistedLogs() {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(LOGS_KEY);
  return Array.isArray(parseJsonSafe(raw, [])) ? parseJsonSafe(raw, []) : [];
}

function writePersistedLogs(logs) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function supportsCloudFileSync() {
  return (
    typeof window !== "undefined" &&
    typeof window.showSaveFilePicker === "function" &&
    typeof window.showOpenFilePicker === "function"
  );
}

async function syncToCloudIfConnected(logs) {
  if (!cloudFileHandle) {
    return;
  }
  await writeCloudSnapshot(logs);
}

async function writeCloudSnapshot(logs) {
  if (!cloudFileHandle) {
    return;
  }

  const writable = await cloudFileHandle.createWritable();
  const payload = JSON.stringify(
    {
      version: 1,
      exportedAt: nowIso(),
      logs
    },
    null,
    2
  );
  await writable.write(payload);
  await writable.close();
  lastSyncedAt = nowIso();
}

function triggerDownload(filename, blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

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

function structureDailyLog({ siteName, foreman, updateText, attachments }) {
  const tags = TAG_RULES.filter((rule) => rule.test.test(updateText)).map((rule) => rule.tag);
  const risks = extractRisks(updateText);
  const sentences = splitSentences(updateText);
  const summary = sentences.slice(0, 2).join(". ").trim();
  const priority = inferPriority(updateText, tags);
  const actions = buildActions(risks, tags, updateText);
  const actionTemplates = createActionTemplates(actions, foreman);
  const watchouts = risks.length ? risks : ["No explicit risk terms detected in this update."];
  const progressPoints = sentences.slice(0, 3);
  const handoverNotes = [`Next check-in owner: ${foreman}`, `Evidence captured: ${attachments.length} photo(s).`];

  return {
    summary: summary || "Site update captured successfully.",
    tags: tags.length ? tags : ["general"],
    actionTemplates,
    structured: {
      siteName,
      foreman,
      reportHeadline: `Daily Compliance Brief - ${siteName}`,
      reportPriority: priority,
      executiveSummary: summary || "Work update recorded successfully; no detailed narrative was provided.",
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

function formatStructuredReportText(structured) {
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

function formatDailyBrief({ siteName, foreman, createdAt, summary, tags, structured }) {
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

function resolveDueDate(createdAt, dueInDays = 1) {
  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + dueInDays);
  return dueDate.toISOString().slice(0, 10);
}

function createActionItemsForLog(log, templates = []) {
  return templates.map((template, index) => ({
    id: `${log.id}-a${index + 1}`,
    description: template.description,
    owner: template.owner || log.foreman,
    dueDate: resolveDueDate(log.createdAt, template.dueInDays ?? 1),
    status: template.status || "open",
    reminderLevel: "normal",
    escalationAcknowledged: false,
    acknowledgedAt: null
  }));
}

function isOverdue(action) {
  if (action.status === "closed") {
    return false;
  }
  return new Date(action.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

function calculateOverdueDays(action) {
  if (!isOverdue(action)) {
    return 0;
  }
  const dueDate = new Date(action.dueDate);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const diffMs = today.getTime() - dueDate.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getReminderLevel(action) {
  if (action.status === "closed") {
    return "normal";
  }
  const overdueDays = calculateOverdueDays(action);
  if (overdueDays >= 3) {
    return "critical";
  }
  if (overdueDays >= 1) {
    return "high";
  }
  return "normal";
}

function collectActions(logs, siteName = "") {
  return logs
    .filter((log) => !siteName || log.siteName.toLowerCase() === siteName.toLowerCase())
    .flatMap((log) =>
      (log.actionItems ?? []).map((action) => ({
        ...action,
        logId: log.id,
        siteName: log.siteName,
        reportPriority: log.structured?.reportPriority ?? "Low",
        overdue: isOverdue(action),
        overdueDays: calculateOverdueDays(action),
        reminderLevel: getReminderLevel(action),
        escalationAcknowledged: Boolean(action.escalationAcknowledged),
        acknowledgedAt: action.acknowledgedAt ?? null
      }))
    );
}

function buildRecurringRisks(logs) {
  const counts = new Map();
  logs.forEach((log) => {
    const risks = log.structured?.riskWatchlist ?? [];
    risks.forEach((risk) => {
      const normalizedRisk = risk.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (!normalizedRisk) {
        return;
      }
      counts.set(normalizedRisk, (counts.get(normalizedRisk) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([risk, count]) => ({ risk, count }));
}

function buildToolboxTalk(siteLogs, siteName) {
  const tagsCount = new Map();
  siteLogs.forEach((log) => {
    (log.tags ?? []).forEach((tag) => tagsCount.set(tag, (tagsCount.get(tag) ?? 0) + 1));
  });
  const topTags = [...tagsCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
  const topRisks = buildRecurringRisks(siteLogs).slice(0, 3).map((item) => item.risk);
  const topics = [...new Set([...topTags, ...topRisks])].slice(0, 5);
  const safeTopics = topics.length ? topics : ["general site awareness"];
  return {
    title: `Toolbox Talk - ${siteName}`,
    topics: safeTopics,
    talkTrack: `Today's talk focuses on ${safeTopics.join(", ")}. Confirm controls and stop-work escalation points before shift tasks begin.`,
    checklist: [
      "Confirm task-specific hazards with each crew lead.",
      "Verify PPE availability and compliance.",
      "Confirm emergency contacts and reporting flow.",
      "Close or escalate overdue actions before high-risk tasks."
    ]
  };
}

function buildHandover(logs, siteName) {
  const siteLogs = logs
    .filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const openActions = collectActions(siteLogs).filter((item) => item.status !== "closed");
  const riskWatchlist = buildRecurringRisks(siteLogs).map((item) => item.risk);
  const lastSummary = siteLogs[0]?.summary ?? "No recent summary available.";
  return {
    siteName,
    generatedAt: nowIso(),
    openActions: openActions.slice(0, 8),
    riskWatchlist: riskWatchlist.slice(0, 6),
    escalatedActions: openActions.filter((item) => item.reminderLevel === "critical").length,
    handoverText: [
      `Shift handover for ${siteName}:`,
      `Latest status: ${lastSummary}`,
      `Open actions: ${openActions.length}`,
      `Critical escalations: ${openActions.filter((item) => item.reminderLevel === "critical").length}`,
      `Recurring watch-outs: ${riskWatchlist.length ? riskWatchlist.join(", ") : "none"}`
    ].join(" ")
  };
}

function buildDailyDigest(logs, siteName) {
  const siteLogs = logs
    .filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = siteLogs.filter((log) => (log.createdAt ?? "").slice(0, 10) === today);
  const openActions = collectActions(siteLogs).filter((item) => item.status !== "closed");
  const escalated = openActions.filter((item) => item.reminderLevel === "critical");
  const highPriorityLogs = siteLogs.filter((log) => log.structured?.reportPriority === "High");
  const recurringRisks = buildRecurringRisks(siteLogs).map((item) => `${item.risk} (${item.count})`);
  const latestSummary = siteLogs[0]?.summary ?? "No recent summary available.";

  return {
    siteName,
    generatedAt: nowIso(),
    stats: {
      logsToday: todayLogs.length,
      openActions: openActions.length,
      criticalEscalations: escalated.length,
      highPriorityReports: highPriorityLogs.length
    },
    recurringRisks: recurringRisks.slice(0, 6),
    digestText: [
      `Daily Digest | ${siteName} | ${new Date().toLocaleDateString()}`,
      `Today's logs: ${todayLogs.length} | Open actions: ${openActions.length} | Critical escalations: ${escalated.length}`,
      `High-priority reports: ${highPriorityLogs.length}`,
      "",
      `Latest summary: ${latestSummary}`,
      "",
      `Recurring risks: ${recurringRisks.length ? recurringRisks.join(", ") : "none identified"}`
    ].join("\n")
  };
}

function toStartOfDay(date) {
  return new Date(date.toISOString().slice(0, 10));
}

function dueWithinHours(action, hours) {
  if (action.status === "closed" || !action.dueDate) {
    return false;
  }
  const now = new Date();
  const due = new Date(action.dueDate);
  const diffMs = due.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function buildRiskMomentum(siteLogs) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  let recentMentions = 0;
  let previousMentions = 0;
  siteLogs.forEach((log) => {
    const riskCount = log.structured?.riskWatchlist?.length ?? 0;
    const createdAt = new Date(log.createdAt);
    if (createdAt >= sevenDaysAgo) {
      recentMentions += riskCount;
      return;
    }
    if (createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo) {
      previousMentions += riskCount;
    }
  });

  let trend = "stable";
  if (recentMentions > previousMentions) {
    trend = "up";
  } else if (recentMentions < previousMentions) {
    trend = "down";
  }
  return { trend, recentMentions, previousMentions, delta: recentMentions - previousMentions };
}

function buildAttentionZones(siteLogs, openActions) {
  const sourceText = [
    ...siteLogs.flatMap((log) => log.structured?.riskWatchlist ?? []),
    ...openActions.map((action) => action.description)
  ]
    .join(" ")
    .toLowerCase();

  const zoneRules = [
    { zone: "working-at-height", keywords: ["scaffold", "ladder", "fall", "height", "edge"] },
    { zone: "plant-and-vehicle", keywords: ["plant", "excavator", "vehicle", "traffic", "crane"] },
    { zone: "electrical-systems", keywords: ["electrical", "cable", "energized", "power", "isolation"] },
    { zone: "lifting-operations", keywords: ["lifting", "rigging", "load", "hoist", "sling"] },
    { zone: "housekeeping-access", keywords: ["housekeeping", "debris", "trip", "access", "walkway"] },
    { zone: "permit-control", keywords: ["permit", "ptw", "authorization", "confined space", "hot work"] }
  ];

  const scoredZones = zoneRules
    .map((rule) => ({
      zone: rule.zone,
      count: rule.keywords.reduce((total, keyword) => total + (sourceText.includes(keyword) ? 1 : 0), 0)
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (scoredZones.length > 0) {
    return scoredZones;
  }
  const fallbackRisks = buildRecurringRisks(siteLogs).slice(0, 3);
  return fallbackRisks.map((item) => ({ zone: item.risk, count: item.count }));
}

function buildCompliancePulse(logs, siteName) {
  const siteLogs = logs
    .filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const actions = collectActions(siteLogs);
  const openActions = actions.filter((action) => action.status !== "closed");
  const criticalPending = openActions.filter((action) => action.reminderLevel === "critical").length;
  const overdueOpen = openActions.filter((action) => action.overdue).length;
  const dueIn48Hours = openActions.filter((action) => dueWithinHours(action, 48)).length;
  const evidenceGapHighPriority = siteLogs.filter(
    (log) => log.structured?.reportPriority === "High" && (log.structured?.photoCount ?? 0) === 0
  ).length;
  const riskMomentum = buildRiskMomentum(siteLogs);
  const attentionZones = buildAttentionZones(siteLogs, openActions);

  const trendPenalty = riskMomentum.trend === "up" ? 7 : 0;
  const scorePenalty = criticalPending * 18 + overdueOpen * 9 + dueIn48Hours * 6 + evidenceGapHighPriority * 8 + trendPenalty;
  const score = Math.max(0, 100 - scorePenalty);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";

  const now = new Date();
  const today = toStartOfDay(now);
  const recentClosed = actions.filter((action) => {
    if (action.status !== "closed") {
      return false;
    }
    const due = toStartOfDay(new Date(action.dueDate));
    return due >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  const recommendedFocus = [];
  if (criticalPending > 0) {
    recommendedFocus.push(`Resolve ${criticalPending} critical escalations before next shift.`);
  }
  if (dueIn48Hours > 0) {
    recommendedFocus.push(`Run pre-closure checks for ${dueIn48Hours} actions due within 48 hours.`);
  }
  if (evidenceGapHighPriority > 0) {
    recommendedFocus.push(`Capture photo evidence for ${evidenceGapHighPriority} high-priority logs.`);
  }
  if (riskMomentum.trend === "up") {
    recommendedFocus.push("Risk mentions are trending up; increase supervisor walkdowns this week.");
  }
  if (recommendedFocus.length === 0) {
    recommendedFocus.push("Maintain control discipline and continue daily evidence capture.");
  }

  return {
    siteName,
    generatedAt: nowIso(),
    score,
    grade,
    metrics: {
      openActions: openActions.length,
      overdueOpen,
      criticalPending,
      dueIn48Hours,
      evidenceGapHighPriority,
      recentClosed
    },
    riskMomentum,
    attentionZones,
    recommendedFocus,
    briefingText: [
      `Compliance Pulse | ${siteName} | ${new Date().toLocaleDateString()}`,
      `Score: ${score} (${grade})`,
      `Open actions: ${openActions.length} | Critical: ${criticalPending} | Due in 48h: ${dueIn48Hours}`,
      `Evidence gaps (high priority no photos): ${evidenceGapHighPriority}`,
      `Risk momentum: ${riskMomentum.trend} (${riskMomentum.recentMentions} vs ${riskMomentum.previousMentions})`,
      `Focus: ${recommendedFocus.join(" ")}`
    ].join("\n")
  };
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export async function createLog(payload) {
  const attachments = (payload.photos ?? []).map((file) => ({
    filename: file.name,
    mimetype: file.type,
    size: file.size
  }));
  const aiResult = structureDailyLog({
    siteName: payload.siteName,
    foreman: payload.foreman,
    updateText: payload.updateText,
    attachments
  });
  const logs = readPersistedLogs();
  const newLog = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    siteName: payload.siteName,
    foreman: payload.foreman,
    updateText: payload.updateText,
    attachments,
    summary: aiResult.summary,
    tags: aiResult.tags,
    structured: aiResult.structured,
    actionItems: createActionItemsForLog(
      { id: "temp", createdAt: nowIso(), foreman: payload.foreman },
      aiResult.actionTemplates
    )
  };
  newLog.actionItems = createActionItemsForLog(newLog, aiResult.actionTemplates);
  logs.push(newLog);
  writePersistedLogs(logs);
  await syncToCloudIfConnected(logs);
  return { log: newLog };
}

export async function fetchLogs(query = "") {
  const search = query.toLowerCase().trim();
  const page = parsePositiveInt(undefined, 1);
  const pageSize = 100;
  const logs = readPersistedLogs();
  const filtered = search
    ? logs.filter((log) =>
        [log.siteName, log.foreman, log.summary, ...(log.tags ?? []), JSON.stringify(log.structured ?? {})]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
    : logs;
  const sortedLogs = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    logs: sortedLogs.slice(0, pageSize),
    pagination: {
      page,
      pageSize,
      total: sortedLogs.length,
      totalPages: Math.max(1, Math.ceil(sortedLogs.length / pageSize))
    }
  };
}

export async function exportPdf(logId) {
  const logs = readPersistedLogs();
  const log = logs.find((item) => item.id === logId);
  if (!log) {
    throw new Error("Log not found.");
  }

  const doc = new jsPDF();
  const lines = [
    "Echo Compliance Daily Report",
    "",
    `Site: ${log.siteName}`,
    `Foreman: ${log.foreman}`,
    `Created: ${new Date(log.createdAt).toLocaleString()}`,
    "",
    "Summary:",
    log.summary,
    "",
    `Tags: ${(log.tags ?? []).join(", ")}`,
    "",
    "Structured Report:",
    formatStructuredReportText(log.structured),
    "",
    `Attachments: ${(log.attachments ?? []).map((item) => item.filename).join(", ") || "None"}`
  ];
  const wrapped = doc.splitTextToSize(lines.join("\n"), 180);
  doc.setFontSize(11);
  doc.text(wrapped, 10, 12);
  doc.save(`echo-compliance-${log.id}.pdf`);
}

export async function fetchEmailSummary(logId) {
  const logs = readPersistedLogs();
  const log = logs.find((item) => item.id === logId);
  if (!log) {
    throw new Error("Log not found.");
  }
  const subject = `Daily Site Report - ${log.siteName} - ${new Date(log.createdAt).toLocaleDateString()}`;
  const body = [
    `Site: ${log.siteName}`,
    `Foreman: ${log.foreman}`,
    "",
    "Summary:",
    log.summary,
    "",
    `Tags: ${(log.tags ?? []).join(", ")}`,
    "",
    "Structured Details:",
    formatStructuredReportText(log.structured)
  ].join("\n");
  return { subject, body };
}

export async function fetchDailyBrief(logId) {
  const logs = readPersistedLogs();
  const log = logs.find((item) => item.id === logId);
  if (!log) {
    throw new Error("Log not found.");
  }
  return { brief: formatDailyBrief(log) };
}

export async function fetchActions(params = {}) {
  const logs = readPersistedLogs();
  let actions = collectActions(logs, params.siteName ?? "");
  if (params.status) {
    actions = actions.filter((item) => item.status === params.status);
  }
  if (params.overdueOnly) {
    actions = actions.filter((item) => item.overdue);
  }
  actions.sort((a, b) => {
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1;
    }
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  return {
    actions,
    pagination: {
      page: 1,
      pageSize: actions.length || 1,
      total: actions.length,
      totalPages: 1
    }
  };
}

export async function updateAction(actionId, updates) {
  const logs = readPersistedLogs();
  let updatedAction = null;
  const updatedLogs = logs.map((log) => {
    const nextActionItems = (log.actionItems ?? []).map((action) => {
      if (action.id !== actionId) {
        return action;
      }
      const nextStatus = updates.status ?? action.status;
      const nextDueDate = updates.dueDate ?? action.dueDate;
      const nextOwner = updates.owner ?? action.owner;
      const nextEscalationAcknowledged =
        typeof updates.escalationAcknowledged === "boolean"
          ? updates.escalationAcknowledged
          : updates.dueDate
            ? false
            : action.escalationAcknowledged;
      const closeoutReminderLevel = getReminderLevel({
        ...action,
        status: action.status === "closed" ? "open" : action.status,
        dueDate: nextDueDate
      });
      const nextReminderLevel = getReminderLevel({
        ...action,
        status: nextStatus,
        dueDate: nextDueDate
      });

      if (nextStatus === "closed") {
        if (!nextOwner || !nextOwner.trim()) {
          throw new Error("Owner is required before closing an action.");
        }
        if (closeoutReminderLevel === "critical" && !Boolean(nextEscalationAcknowledged)) {
          throw new Error("Critical actions must be acknowledged before closure.");
        }
        if (closeoutReminderLevel !== "normal" && (log.structured?.photoCount ?? 0) === 0) {
          throw new Error("Photo evidence is required before closing high-risk actions.");
        }
      }

      updatedAction = {
        ...action,
        status: nextStatus,
        owner: nextOwner,
        dueDate: nextDueDate,
        escalationAcknowledged: nextEscalationAcknowledged,
        acknowledgedAt:
          typeof updates.escalationAcknowledged === "boolean"
            ? updates.escalationAcknowledged
              ? nowIso()
              : null
            : updates.dueDate
              ? null
              : action.acknowledgedAt ?? null,
        reminderLevel: nextReminderLevel
      };
      return updatedAction;
    });
    return { ...log, actionItems: nextActionItems };
  });

  if (!updatedAction) {
    throw new Error("Action not found.");
  }
  writePersistedLogs(updatedLogs);
  await syncToCloudIfConnected(updatedLogs);
  return { action: updatedAction };
}

export async function acknowledgeCriticalActions(siteName) {
  const logs = readPersistedLogs();
  let updatedCount = 0;
  const updatedLogs = logs.map((log) => {
    if (siteName && log.siteName.toLowerCase() !== siteName.toLowerCase()) {
      return log;
    }
    const nextActionItems = (log.actionItems ?? []).map((action) => {
      const reminderLevel = getReminderLevel(action);
      if (action.status === "closed" || reminderLevel !== "critical" || action.escalationAcknowledged) {
        return action;
      }
      updatedCount += 1;
      return { ...action, escalationAcknowledged: true, acknowledgedAt: nowIso(), reminderLevel };
    });
    return { ...log, actionItems: nextActionItems };
  });
  if (updatedCount > 0) {
    writePersistedLogs(updatedLogs);
    await syncToCloudIfConnected(updatedLogs);
  }
  return { updatedCount };
}

export async function fetchHandover(siteName) {
  const logs = readPersistedLogs();
  const exists = logs.some((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (!exists) {
    throw new Error("No logs found for this site.");
  }
  return buildHandover(logs, siteName);
}

export async function fetchToolboxTalk(siteName) {
  const logs = readPersistedLogs();
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    throw new Error("No logs found for this site.");
  }
  return buildToolboxTalk(siteLogs, siteName);
}

export async function fetchDailyDigest(siteName) {
  const logs = readPersistedLogs();
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    throw new Error("No logs found for this site.");
  }
  return buildDailyDigest(logs, siteName);
}

export async function fetchCompliancePulse(siteName) {
  const logs = readPersistedLogs();
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    throw new Error("No logs found for this site.");
  }
  return buildCompliancePulse(logs, siteName);
}

export async function fetchInsights() {
  const logs = readPersistedLogs();
  const recurringRisks = buildRecurringRisks(logs);
  const recurringTagsCount = new Map();
  logs.forEach((log) => {
    (log.tags ?? []).forEach((tag) => recurringTagsCount.set(tag, (recurringTagsCount.get(tag) ?? 0) + 1));
  });
  const recurringTags = [...recurringTagsCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
  const highPriorityWithoutPhotos = logs.filter(
    (log) => log.structured?.reportPriority === "High" && (log.structured?.photoCount ?? 0) === 0
  ).length;
  return { recurringRisks, recurringTags, highPriorityWithoutPhotos };
}

export async function getStorageStatus() {
  return {
    mode: "local-first",
    cloudSyncSupported: supportsCloudFileSync(),
    cloudConnected: Boolean(cloudFileHandle),
    lastSyncedAt
  };
}

export async function connectCloudStorageFile() {
  if (!supportsCloudFileSync()) {
    throw new Error("Cloud file sync requires a Chromium-based browser.");
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: "echo-compliance-data.json",
    types: [
      {
        description: "JSON files",
        accept: {
          "application/json": [".json"]
        }
      }
    ]
  });
  cloudFileHandle = handle;

  const file = await cloudFileHandle.getFile();
  if (file.size > 0) {
    const raw = await file.text();
    const parsed = parseJsonSafe(raw, null);
    if (parsed && Array.isArray(parsed.logs)) {
      writePersistedLogs(parsed.logs);
    }
  } else {
    await writeCloudSnapshot(readPersistedLogs());
  }
  return getStorageStatus();
}

export async function syncCloudStorageFile() {
  if (!cloudFileHandle) {
    throw new Error("No cloud storage file connected.");
  }
  await writeCloudSnapshot(readPersistedLogs());
  return getStorageStatus();
}

export async function disconnectCloudStorageFile() {
  cloudFileHandle = null;
  return getStorageStatus();
}

export async function exportLocalBackupFile() {
  const logs = readPersistedLogs();
  const backup = JSON.stringify({ version: 1, exportedAt: nowIso(), logs }, null, 2);
  triggerDownload(`echo-compliance-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([backup], { type: "application/json" }));
}

export async function importLocalBackupFile(file) {
  if (!file) {
    throw new Error("No backup file selected.");
  }
  const raw = await file.text();
  const parsed = parseJsonSafe(raw, null);
  if (!parsed || !Array.isArray(parsed.logs)) {
    throw new Error("Invalid backup file format.");
  }
  writePersistedLogs(parsed.logs);
  await syncToCloudIfConnected(parsed.logs);
  return { importedCount: parsed.logs.length };
}
