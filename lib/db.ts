import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { AlertRecord, MetricSnapshot } from "@/types/metrics";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.MONITOR_DB_PATH ?? path.join(dataDir, "stripe-monitor.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = `
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  successful INTEGER NOT NULL,
  declined INTEGER NOT NULL,
  dispute_count INTEGER NOT NULL,
  dispute_amount_cents INTEGER NOT NULL,
  payout_failures INTEGER NOT NULL,
  decline_rate REAL NOT NULL,
  chargeback_rate REAL NOT NULL,
  decline_rate_spike REAL NOT NULL,
  chargeback_rate_spike REAL NOT NULL,
  risk_score REAL NOT NULL,
  risk_level TEXT NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  purchased_at TEXT NOT NULL,
  claimed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
`;

db.exec(schema);

function toSnapshot(row: Record<string, unknown>): MetricSnapshot {
  return {
    id: Number(row.id),
    capturedAt: String(row.captured_at),
    attempts: Number(row.attempts),
    successful: Number(row.successful),
    declined: Number(row.declined),
    disputeCount: Number(row.dispute_count),
    disputeAmountCents: Number(row.dispute_amount_cents),
    payoutFailures: Number(row.payout_failures),
    declineRate: Number(row.decline_rate),
    chargebackRate: Number(row.chargeback_rate),
    declineRateSpike: Number(row.decline_rate_spike),
    chargebackRateSpike: Number(row.chargeback_rate_spike),
    riskScore: Number(row.risk_score),
    riskLevel: row.risk_level as MetricSnapshot["riskLevel"],
    note: String(row.note),
  };
}

export function saveMetricSnapshot(snapshot: MetricSnapshot): number {
  const stmt = db.prepare(`
    INSERT INTO metric_snapshots (
      captured_at,
      attempts,
      successful,
      declined,
      dispute_count,
      dispute_amount_cents,
      payout_failures,
      decline_rate,
      chargeback_rate,
      decline_rate_spike,
      chargeback_rate_spike,
      risk_score,
      risk_level,
      note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    snapshot.capturedAt,
    snapshot.attempts,
    snapshot.successful,
    snapshot.declined,
    snapshot.disputeCount,
    snapshot.disputeAmountCents,
    snapshot.payoutFailures,
    snapshot.declineRate,
    snapshot.chargebackRate,
    snapshot.declineRateSpike,
    snapshot.chargebackRateSpike,
    snapshot.riskScore,
    snapshot.riskLevel,
    snapshot.note,
  );

  return Number(result.lastInsertRowid);
}

export function getMetricSnapshots(limit = 120): MetricSnapshot[] {
  const stmt = db.prepare(
    "SELECT * FROM metric_snapshots ORDER BY datetime(captured_at) DESC LIMIT ?",
  );
  const rows = stmt.all(limit) as Record<string, unknown>[];
  return rows.map(toSnapshot);
}

export function getLatestMetricSnapshot(): MetricSnapshot | null {
  const stmt = db.prepare(
    "SELECT * FROM metric_snapshots ORDER BY datetime(captured_at) DESC LIMIT 1",
  );
  const row = stmt.get() as Record<string, unknown> | undefined;
  return row ? toSnapshot(row) : null;
}

export function saveAlert(input: {
  type: string;
  severity: AlertRecord["severity"];
  message: string;
  payload: Record<string, unknown>;
}): number {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(
    "INSERT INTO alerts (type, severity, message, payload, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const result = stmt.run(
    input.type,
    input.severity,
    input.message,
    JSON.stringify(input.payload),
    createdAt,
  );
  return Number(result.lastInsertRowid);
}

export function getRecentAlerts(limit = 30): AlertRecord[] {
  const stmt = db.prepare(
    "SELECT * FROM alerts ORDER BY datetime(created_at) DESC LIMIT ?",
  );
  const rows = stmt.all(limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: Number(row.id),
    type: String(row.type),
    severity: row.severity as AlertRecord["severity"],
    message: String(row.message),
    payload: safeJsonParse(row.payload, {}),
    createdAt: String(row.created_at),
  }));
}

export function setSetting(key: string, value: unknown): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(key, JSON.stringify(value), new Date().toISOString());
}

export function getSetting<T>(key: string, fallback: T): T {
  const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const row = stmt.get(key) as { value: string } | undefined;
  if (!row) {
    return fallback;
  }

  return safeJsonParse(row.value, fallback);
}

export function savePurchase(input: {
  email: string;
  sessionId: string;
  purchasedAt: string;
}): void {
  const normalizedEmail = input.email.trim().toLowerCase();
  const stmt = db.prepare(`
    INSERT INTO purchases (email, session_id, purchased_at)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id) DO NOTHING
  `);
  stmt.run(normalizedEmail, input.sessionId, input.purchasedAt);
}

export function findPurchaseByEmail(email: string): {
  id: number;
  email: string;
  purchasedAt: string;
  claimedAt: string | null;
} | null {
  const normalizedEmail = email.trim().toLowerCase();
  const stmt = db.prepare(
    "SELECT id, email, purchased_at, claimed_at FROM purchases WHERE email = ? ORDER BY datetime(purchased_at) DESC LIMIT 1",
  );

  const row = stmt.get(normalizedEmail) as
    | {
        id: number;
        email: string;
        purchased_at: string;
        claimed_at: string | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    purchasedAt: row.purchased_at,
    claimedAt: row.claimed_at,
  };
}

export function markPurchaseClaimed(id: number): void {
  const stmt = db.prepare("UPDATE purchases SET claimed_at = ? WHERE id = ?");
  stmt.run(new Date().toISOString(), id);
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
