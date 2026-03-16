import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { readLogs, writeLogs } from "./storage.js";
import { formatDailyBrief, formatStructuredReportText, structureDailyLog } from "./summarizer.js";
import { createPdfForLog } from "./pdf.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const uploadDir =
  process.env.VERCEL === "1" ? path.resolve("/tmp/echo-compliance/uploads") : path.resolve(__dirname, "../data/uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

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

function normalizeStructured(log) {
  const structured = log.structured ?? {};
  const riskWatchlist = structured.riskWatchlist ?? structured.potentialRisks ?? [];
  const progressPoints = structured.progressPoints ?? structured.keyActivities ?? [];

  return {
    siteName: log.siteName,
    foreman: log.foreman,
    reportHeadline: structured.reportHeadline ?? `Daily Compliance Brief - ${log.siteName}`,
    reportPriority: structured.reportPriority ?? "Low",
    executiveSummary: structured.executiveSummary ?? log.summary,
    progressPoints,
    riskWatchlist,
    recommendedActions: structured.recommendedActions ?? [],
    handoverNotes: structured.handoverNotes ?? [],
    keyActivities: structured.keyActivities ?? progressPoints,
    potentialRisks: structured.potentialRisks ?? riskWatchlist,
    photoCount: structured.photoCount ?? log.attachments?.length ?? 0,
    complianceNotes: structured.complianceNotes ?? "No compliance note."
  };
}

function normalizeActionItems(log) {
  if (Array.isArray(log.actionItems) && log.actionItems.length) {
    return log.actionItems.map((item, index) => {
      const normalizedAction = {
        id: item.id ?? `${log.id}-a${index + 1}`,
        description: item.description ?? "Unspecified action",
        owner: item.owner ?? log.foreman,
        dueDate: item.dueDate ?? resolveDueDate(log.createdAt, 1),
        status: item.status ?? "open",
        escalationAcknowledged: Boolean(item.escalationAcknowledged),
        acknowledgedAt: item.acknowledgedAt ?? null
      };
      return {
        ...normalizedAction,
        reminderLevel: getReminderLevel(normalizedAction)
      };
    });
  }

  const sourceActions = [
    ...(log.structured?.recommendedActions ?? []),
    ...((log.structured?.potentialRisks ?? []).map(
      (risk) => `Review and mitigate: ${risk.toLowerCase()}`
    ) ?? [])
  ];
  const uniqueActions = [...new Set(sourceActions)].slice(0, 4);

  const templates = uniqueActions.map((description, index) => ({
    description,
    owner: log.foreman,
    dueInDays: index === 0 ? 1 : 2,
    status: "open"
  }));
  return createActionItemsForLog(log, templates);
}

function normalizeLog(log) {
  const normalized = {
    ...log,
    attachments: Array.isArray(log.attachments) ? log.attachments : [],
    tags: Array.isArray(log.tags) && log.tags.length ? log.tags : ["general"]
  };
  normalized.structured = normalizeStructured(normalized);
  normalized.actionItems = normalizeActionItems(normalized);
  return normalized;
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
      log.actionItems.map((action) => ({
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
    generatedAt: new Date().toISOString(),
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
    generatedAt: new Date().toISOString(),
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

  return {
    trend,
    recentMentions,
    previousMentions,
    delta: recentMentions - previousMentions
  };
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
      count: rule.keywords.reduce(
        (total, keyword) => total + (sourceText.includes(keyword) ? 1 : 0),
        0
      )
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
  const scorePenalty =
    criticalPending * 18 +
    overdueOpen * 9 +
    dueIn48Hours * 6 +
    evidenceGapHighPriority * 8 +
    trendPenalty;
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
    generatedAt: new Date().toISOString(),
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

function isValidActionStatus(status) {
  return ["open", "in_progress", "closed"].includes(status);
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/logs", async (req, res) => {
  const search = (req.query.search ?? "").toString().toLowerCase().trim();
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 20), 100);
  const logs = (await readLogs()).map(normalizeLog);

  const filteredLogs = search
    ? logs.filter((log) =>
        [log.siteName, log.foreman, log.summary, ...log.tags, JSON.stringify(log.structured ?? {})]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
    : logs;

  const sortedLogs = filteredLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const start = (page - 1) * pageSize;
  const pagedLogs = sortedLogs.slice(start, start + pageSize);

  res.json({
    logs: pagedLogs,
    pagination: {
      page,
      pageSize,
      total: sortedLogs.length,
      totalPages: Math.max(1, Math.ceil(sortedLogs.length / pageSize))
    }
  });
});

app.post("/api/logs", upload.array("photos", 6), async (req, res) => {
  const { siteName = "", foreman = "", updateText = "" } = req.body;
  if (!siteName || !foreman || !updateText) {
    return res.status(400).json({ error: "siteName, foreman and updateText are required." });
  }

  const attachments = (req.files ?? []).map((file) => ({
    filename: file.originalname,
    storedAs: file.filename,
    mimetype: file.mimetype,
    size: file.size
  }));

  const aiResult = structureDailyLog({ siteName, foreman, updateText, attachments });
  const logs = (await readLogs()).map(normalizeLog);
  const newLogId = uuidv4();
  const createdAt = new Date().toISOString();
  const newLog = {
    id: newLogId,
    createdAt,
    siteName,
    foreman,
    updateText,
    attachments,
    summary: aiResult.summary,
    tags: aiResult.tags,
    structured: aiResult.structured,
    actionItems: createActionItemsForLog({ id: newLogId, createdAt, foreman }, aiResult.actionTemplates ?? [])
  };

  logs.push(newLog);
  await writeLogs(logs);
  return res.status(201).json({ log: newLog });
});

app.get("/api/logs/:id/export-pdf", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const log = logs.find((item) => item.id === req.params.id);

  if (!log) {
    return res.status(404).json({ error: "Log not found." });
  }

  createPdfForLog(log, res);
  return undefined;
});

app.get("/api/logs/:id/email-summary", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const log = logs.find((item) => item.id === req.params.id);

  if (!log) {
    return res.status(404).json({ error: "Log not found." });
  }

  const subject = `Daily Site Report - ${log.siteName} - ${new Date(log.createdAt).toLocaleDateString()}`;
  const body = [
    `Site: ${log.siteName}`,
    `Foreman: ${log.foreman}`,
    "",
    "Summary:",
    log.summary,
    "",
    `Tags: ${log.tags.join(", ")}`,
    "",
    "Structured Details:",
    formatStructuredReportText(log.structured)
  ].join("\n");

  return res.json({ subject, body });
});

app.get("/api/logs/:id/daily-brief", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const log = logs.find((item) => item.id === req.params.id);

  if (!log) {
    return res.status(404).json({ error: "Log not found." });
  }

  const brief = formatDailyBrief(log);
  return res.json({ brief });
});

app.get("/api/actions", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = (req.query.siteName ?? "").toString();
  const status = (req.query.status ?? "").toString();
  const overdueOnly = (req.query.overdueOnly ?? "false").toString().toLowerCase() === "true";
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 25), 100);

  let actions = collectActions(logs, siteName);
  if (status) {
    actions = actions.filter((item) => item.status === status);
  }
  if (overdueOnly) {
    actions = actions.filter((item) => item.overdue);
  }
  actions.sort((a, b) => {
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1;
    }
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const start = (page - 1) * pageSize;
  const pagedActions = actions.slice(start, start + pageSize);

  return res.json({
    actions: pagedActions,
    pagination: {
      page,
      pageSize,
      total: actions.length,
      totalPages: Math.max(1, Math.ceil(actions.length / pageSize))
    }
  });
});

app.patch("/api/actions/:id", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const actionId = req.params.id;
  const updates = req.body ?? {};
  if (updates.status && !isValidActionStatus(updates.status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  if (updates.dueDate && !isValidIsoDate(updates.dueDate)) {
    return res.status(400).json({ error: "dueDate must be YYYY-MM-DD." });
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, "escalationAcknowledged") &&
    typeof updates.escalationAcknowledged !== "boolean"
  ) {
    return res.status(400).json({ error: "escalationAcknowledged must be boolean." });
  }
  try {
    let updatedAction = null;
    const updatedLogs = logs.map((log) => {
      const nextActionItems = log.actionItems.map((action) => {
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
                ? new Date().toISOString()
                : null
              : updates.status || updates.dueDate
                ? null
                : action.acknowledgedAt ?? null,
          reminderLevel: nextReminderLevel
        };
        return updatedAction;
      });
      return { ...log, actionItems: nextActionItems };
    });

    if (!updatedAction) {
      return res.status(404).json({ error: "Action not found." });
    }

    await writeLogs(updatedLogs);
    return res.json({ action: updatedAction });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/actions/acknowledge-critical", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = (req.body?.siteName ?? "").toString().trim();
  let updatedCount = 0;

  const updatedLogs = logs.map((log) => {
    if (siteName && log.siteName.toLowerCase() !== siteName.toLowerCase()) {
      return log;
    }

    const nextActionItems = log.actionItems.map((action) => {
      const reminderLevel = getReminderLevel(action);
      if (action.status === "closed" || reminderLevel !== "critical" || action.escalationAcknowledged) {
        return action;
      }

      updatedCount += 1;
      return {
        ...action,
        escalationAcknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        reminderLevel
      };
    });

    return {
      ...log,
      actionItems: nextActionItems
    };
  });

  if (updatedCount > 0) {
    await writeLogs(updatedLogs);
  }

  return res.json({ updatedCount });
});

app.get("/api/sites/:siteName/handover", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = req.params.siteName;
  const hasSiteLogs = logs.some((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (!hasSiteLogs) {
    return res.status(404).json({ error: "No logs found for this site." });
  }

  return res.json(buildHandover(logs, siteName));
});

app.get("/api/sites/:siteName/toolbox-talk", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = req.params.siteName;
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    return res.status(404).json({ error: "No logs found for this site." });
  }

  return res.json(buildToolboxTalk(siteLogs, siteName));
});

app.get("/api/sites/:siteName/daily-digest", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = req.params.siteName;
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    return res.status(404).json({ error: "No logs found for this site." });
  }

  return res.json(buildDailyDigest(logs, siteName));
});

app.get("/api/sites/:siteName/compliance-pulse", async (req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const siteName = req.params.siteName;
  const siteLogs = logs.filter((log) => log.siteName.toLowerCase() === siteName.toLowerCase());
  if (siteLogs.length === 0) {
    return res.status(404).json({ error: "No logs found for this site." });
  }

  return res.json(buildCompliancePulse(logs, siteName));
});

app.get("/api/insights", async (_req, res) => {
  const logs = (await readLogs()).map(normalizeLog);
  const recurringRisks = buildRecurringRisks(logs);
  const recurringTagsCount = new Map();
  logs.forEach((log) => {
    (log.tags ?? []).forEach((tag) => {
      recurringTagsCount.set(tag, (recurringTagsCount.get(tag) ?? 0) + 1);
    });
  });

  const recurringTags = [...recurringTagsCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
  const highPriorityWithoutPhotos = logs
    .filter((log) => log.structured?.reportPriority === "High" && (log.structured?.photoCount ?? 0) === 0)
    .length;

  return res.json({
    recurringRisks,
    recurringTags,
    highPriorityWithoutPhotos
  });
});

const port = process.env.PORT || 4000;
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Echo Compliance API running on http://localhost:${port}`);
  });
}

export default app;
