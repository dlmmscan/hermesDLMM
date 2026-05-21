/**
 * Decision Log — Full audit trail for every deploy, close, claim, and error
 */
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const LOG_DIR = join(ROOT, 'logs');

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function logFile() {
  const d = new Date();
  return join(LOG_DIR, `decisions-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.log`);
}

export function logDecision(action, data) {
  const entry = JSON.stringify({
    ts: Date.now(),
    action,
    ...data,
  });
  appendFileSync(logFile(), entry + '\n');
}

export async function queryDecisions({ action, limit = 20 } = {}) {
  try {
    const { readFileSync } = await import('fs');
    if (!existsSync(logFile())) return [];
    const lines = readFileSync(logFile(), 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map(l => JSON.parse(l));
    const filtered = action ? entries.filter(e => e.action === action) : entries;
    return filtered.slice(-limit);
  } catch (e) { return []; }
}
