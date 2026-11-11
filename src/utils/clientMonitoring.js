/**
 * Helper utilities for aggregating client data, Task Board tasks,
 * and daily reports on the Client Monitoring page.
 * Task statuses and overdue rules match TasksPage (Task Board) directly.
 */

export function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeText(value) {
  return String(value ?? "").toLowerCase().trim();
}

export function stripApprovalComment(notes) {
  return String(notes ?? "")
    .replace(/<!--\s*APPROVALS:.*?-->/g, "")
    .trim();
}

export function isSafeHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

export function splitPicTokens(picString) {
  if (!picString) return [];
  return String(picString)
    .split(/[,/&\-–—]|\bdan\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isPicMatched(picString, userName) {
  if (!picString || !userName) return false;
  const target = normalizeText(userName);
  const tokens = splitPicTokens(picString).map((t) => t.toLowerCase());

  return tokens.some((token) => {
    if (token === target) return true;
    const tokenWords = token.split(/\s+/);
    if (tokenWords.includes(target)) return true;
    const targetWords = target.split(/\s+/);
    if (targetWords.includes(token)) return true;
    return tokenWords.some((tw) => tw.length > 2 && targetWords.includes(tw));
  });
}

export function resolveClientPics(clientPic, users = []) {
  if (!clientPic) return "";
  const staffUsers = (users || []).filter((u) => {
    const lowerName = normalizeText(u.name);
    return (
      u.role !== "owner" &&
      u.role !== "magang" &&
      lowerName !== "tegar" &&
      lowerName !== "owner" &&
      lowerName !== "magang"
    );
  });

  const matched = staffUsers.filter((u) => isPicMatched(clientPic, u.name));
  return matched.length > 0 ? matched.map((u) => u.name).join(", ") : clientPic;
}

/**
 * Difference in calendar days: targetDateStr - baseDateStr.
 * Positive means future, negative means past/overdue.
 */
export function getCalendarDayDiff(targetDateStr, baseDateStr) {
  if (!targetDateStr || !baseDateStr) return null;
  const [ty, tm, td] = targetDateStr.slice(0, 10).split("-").map(Number);
  const [by, bm, bd] = baseDateStr.slice(0, 10).split("-").map(Number);
  if (!ty || !tm || !td || !by || !bm || !bd) return null;
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const baseUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((targetUtc - baseUtc) / (1000 * 60 * 60 * 24));
}

export function formatDeadlineRelative(diffDays) {
  if (diffDays === null || diffDays === undefined) return "";
  if (diffDays < 0) return `Terlambat ${Math.abs(diffDays)} hari`;
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  return `${diffDays} hari lagi`;
}

export function isTaskDone(task) {
  return normalizeText(task?.status) === "done";
}

export function isTaskInProgress(task) {
  const status = normalizeText(task?.status);
  return status === "progress" || status === "review" || status === "in_progress";
}

export function isTaskOverdue(task, todayStr) {
  return (
    !isTaskDone(task) &&
    Boolean(task?.deadline && task.deadline.slice(0, 10) < todayStr)
  );
}

const OBLIGATION_DEFINITIONS = [
  {
    key: "pph_25",
    label: "PPh 25",
    matchTerms: ["pph 25", "pph25"],
  },
  {
    key: "pph_final",
    label: "PPh Final",
    matchTerms: ["pph final", "pphfinal"],
  },
  {
    key: "ppn",
    label: "PPN",
    matchTerms: ["ppn"],
  },
  {
    key: "pph_21",
    label: "PPh 21",
    matchTerms: ["pph 21", "pph21", "pph 21/26"],
  },
];

export function getClientObligations(client) {
  const obligations = [];
  for (const def of OBLIGATION_DEFINITIONS) {
    if (client?.[def.key]) {
      obligations.push(def);
    }
  }

  const isTahunan = normalizeText(client?.kontrak).includes("tahun");
  if (isTahunan) {
    const isBadan = normalizeText(client?.type || "Badan").includes("badan");
    obligations.push({
      key: "spt_tahunan",
      label: isBadan ? "SPT Badan" : "SPT OP",
      matchTerms: ["spt tahunan", "spt badan", "spt orang pribadi", "spt op"],
    });
  }

  return obligations;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholeClientName(haystack, target) {
  if (!haystack || !target) return false;
  const pattern = new RegExp(
    `(?:^|[\\s\\]\\[(,;:/-])${escapeRegExp(target)}(?:$|[\\s\\]\\[(,;:/-])`,
    "i",
  );
  return pattern.test(haystack);
}

function matchesTaskClient(taskClientText, clientName) {
  const target = normalizeText(clientName);
  const rec = normalizeText(taskClientText);
  if (!target || !rec) return false;
  if (rec === target) return true;
  const tokens = rec
    .split(/[,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.includes(target);
}

function matchesDailyReportClient(reportClientText, tasksSummary, clientName) {
  const target = normalizeText(clientName);
  if (!target) return false;

  const rec = normalizeText(reportClientText);
  if (rec) {
    if (rec === target) return true;
    const tokens = rec
      .split(/[,;|/]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return tokens.includes(target);
  }

  if (tasksSummary && target.length >= 5) {
    return containsWholeClientName(tasksSummary, target);
  }
  return false;
}

function isReportInPeriod(reportDate, periodFilter, todayStr) {
  if (periodFilter === "all") return true;
  if (!reportDate) return false;
  if (periodFilter === "month") {
    return reportDate.startsWith(todayStr.slice(0, 7));
  }
  if (periodFilter === "30days") {
    const diff = getCalendarDayDiff(todayStr, reportDate);
    return diff !== null && diff >= 0 && diff <= 30;
  }
  return true;
}

function isTaskInPeriod(task, periodFilter, todayStr) {
  if (periodFilter === "all") return true;
  const deadline = task?.deadline || "";
  const done = isTaskDone(task);

  if (!deadline) {
    return !done;
  }

  if (periodFilter === "month") {
    return deadline.startsWith(todayStr.slice(0, 7));
  }

  if (periodFilter === "30days") {
    const diff = getCalendarDayDiff(deadline, todayStr);
    return diff !== null && diff >= -30 && diff <= 30;
  }

  return true;
}

function evaluateObligationStatus(obligation, clientTasks, todayStr) {
  const matched = clientTasks.filter((task) => {
    const haystack = normalizeText(
      `${task.title || ""} ${stripApprovalComment(task.notes)}`,
    );
    return obligation.matchTerms.some((term) => haystack.includes(term));
  });

  if (matched.length === 0) return "none";
  if (matched.every(isTaskDone)) return "done";
  if (matched.some((task) => isTaskOverdue(task, todayStr))) return "overdue";
  if (matched.some(isTaskInProgress)) return "progress";
  return "todo";
}

export const HEALTH_META = {
  overdue: {
    label: "Terlambat",
    tone: "red",
    priority: 0,
  },
  progress: {
    label: "In Progress",
    tone: "blue",
    priority: 1,
  },
  todo: {
    label: "To Do",
    tone: "amber",
    priority: 2,
  },
  idle: {
    label: "Belum Ada Task",
    tone: "slate",
    priority: 3,
  },
  done: {
    label: "Selesai",
    tone: "green",
    priority: 4,
  },
};

/**
 * Combines clients strictly with Task Board (`tasks`) and `dailyReports`
 * so status, progress, and overdue counts match the Task Board 1-to-1.
 */
export function buildClientMonitoringRows({
  clients = [],
  tasks = [],
  dailyReports = [],
  users = [],
  periodFilter = "all",
  todayStr = getTodayLocalDate(),
}) {
  return clients.map((client) => {
    const clientTasks = tasks
      .filter(
        (t) =>
          matchesTaskClient(t.client, client.name) &&
          isTaskInPeriod(t, periodFilter, todayStr),
      )
      .sort((a, b) =>
        (a.deadline || "9999-99-99").localeCompare(b.deadline || "9999-99-99"),
      );

    const clientReports = dailyReports
      .filter(
        (r) =>
          matchesDailyReportClient(r.clientName, r.tasksSummary, client.name) &&
          isReportInPeriod(r.reportDate, periodFilter, todayStr),
      )
      .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));

    const totalWork = clientTasks.length;
    const doneWork = clientTasks.filter(isTaskDone).length;
    const inProgressWork = clientTasks.filter(isTaskInProgress).length;
    const todoWork = Math.max(0, totalWork - doneWork - inProgressWork);

    const overdueItems = clientTasks.filter((t) => isTaskOverdue(t, todayStr));
    const overdueWork = overdueItems.length;

    const pendingDeadlines = clientTasks
      .filter((t) => !isTaskDone(t) && t.deadline)
      .map((t) => t.deadline.slice(0, 10))
      .sort();

    const nearestDeadline = pendingDeadlines[0] || null;
    const nearestDeadlineDiff = nearestDeadline
      ? getCalendarDayDiff(nearestDeadline, todayStr)
      : null;

    const completionRate =
      totalWork > 0 ? Math.round((doneWork / totalWork) * 100) : 0;

    const obligations = getClientObligations(client);
    const obligationsWithStatus = obligations.map((ob) => ({
      ...ob,
      status: evaluateObligationStatus(ob, clientTasks, todayStr),
    }));

    const resolvedPic = resolveClientPics(client.pic, users);
    const isActiveClient = ![
      "non-aktif",
      "nonaktif",
      "tidak aktif",
      "berhenti",
      "inactive",
    ].includes(normalizeText(client.status));

    const contractDaysLeft = client.tanggal_akhir_kontrak
      ? getCalendarDayDiff(client.tanggal_akhir_kontrak, todayStr)
      : null;
    const contractExpired =
      isActiveClient && contractDaysLeft !== null && contractDaysLeft < 0;
    const contractExpiringSoon =
      isActiveClient &&
      contractDaysLeft !== null &&
      contractDaysLeft >= 0 &&
      contractDaysLeft <= 30;

    const obstacleReportsCount = clientReports.filter(
      (r) => r.obstacles && r.obstacles.trim().length > 0,
    ).length;

    const lastReportDate = clientReports[0]?.reportDate || null;

    const warnings = [];
    if (contractExpired) {
      warnings.push("Masa kontrak sudah berakhir");
    } else if (contractExpiringSoon) {
      warnings.push(`Kontrak berakhir ${contractDaysLeft} hari lagi`);
    }
    if (isActiveClient && !resolvedPic) {
      warnings.push("Belum memiliki PIC");
    }
    if (obstacleReportsCount > 0) {
      warnings.push(`${obstacleReportsCount} laporan mencatat kendala`);
    }

    const healthReasons = [];
    if (overdueWork > 0) {
      healthReasons.push(`${overdueWork} task di Task Board melewati deadline`);
    }
    healthReasons.push(...warnings);

    let healthStatus = "idle";
    if (overdueWork > 0) {
      healthStatus = "overdue";
    } else if (totalWork > 0 && doneWork === totalWork) {
      healthStatus = "done";
    } else if (inProgressWork > 0 || (doneWork > 0 && todoWork > 0)) {
      healthStatus = "progress";
    } else if (todoWork > 0) {
      healthStatus = "todo";
    } else {
      healthStatus = "idle";
    }

    return {
      client,
      resolvedPic,
      isActiveClient,
      obligationsWithStatus,
      tasks: clientTasks,
      dailyReports: clientReports,
      totalWork,
      doneWork,
      inProgressWork,
      todoWork,
      overdueWork,
      completionRate,
      nearestDeadline,
      nearestDeadlineDiff,
      lastReportDate,
      obstacleReportsCount,
      contractDaysLeft,
      contractExpired,
      contractExpiringSoon,
      warnings,
      hasWarning: warnings.length > 0,
      healthStatus,
      healthReasons,
    };
  });
}
