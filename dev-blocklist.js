/**
 * Dev blocklist — developer addresses the agent should never deploy into.
 *
 * Agent can block devs via Telegram ("block this dev, he rugged").
 * Screening filters blocked devs before passing pools to the LLM.
 */

import fs from "fs";
import { log } from "./logger.js";

const BLOCKLIST_FILE = "./dev-blocklist.json";

function load() {
  if (!fs.existsSync(BLOCKLIST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BLOCKLIST_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(BLOCKLIST_FILE, JSON.stringify(data, null, 2));
}

// ─── Check ─────────────────────────────────────────────────────

/**
 * Returns true if the dev address is on the blocklist.
 * Used in screening.js before returning pools to the LLM.
 */
export function isDevBlocked(devAddress) {
  if (!devAddress) return false;
  const db = load();
  return !!db[devAddress];
}

/**
 * Returns all blocked devs.
 */
export function getBlockedDevs() {
  const db = load();
  return Object.entries(db).map(([address, info]) => ({
    address,
    ...info,
  }));
}

// ─── Tool Handlers ─────────────────────────────────────────────

/**
 * Tool handler: block_dev
 */
export function blockDev({ address, symbol, reason }) {
  if (!address) return { error: "address required" };

  const db = load();

  if (db[address]) {
    return {
      already_blocked: true,
      address,
      symbol: db[address].symbol,
      reason: db[address].reason,
    };
  }

  db[address] = {
    symbol: symbol || "UNKNOWN",
    reason: reason || "no reason provided",
    added_at: new Date().toISOString(),
    added_by: "agent",
  };

  save(db);
  log("blocklist", `Blocked dev ${symbol || address}: ${reason}`);
  return { blocked: true, address, symbol, reason };
}

/**
 * Tool handler: unblock_dev
 */
export function unblockDev({ address }) {
  if (!address) return { error: "address required" };

  const db = load();

  if (!db[address]) {
    return { error: `Dev ${address} not found on blocklist` };
  }

  const entry = db[address];
  delete db[address];
  save(db);
  log("blocklist", `Removed ${entry.symbol || address} from dev blocklist`);
  return { unblocked: true, address, was: entry };
}

/**
 * Tool handler: list_blocked_devs
 */
export function listBlockedDevs() {
  const db = load();
  return {
    count: Object.keys(db).length,
    blocked_devs: getBlockedDevs(),
  };
}
