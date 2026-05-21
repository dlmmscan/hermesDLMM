/**
 * Darwinian Signal Weights — Evolutionary Learning System
 * 
 * After every 5 position closes, recalculate signal importance:
 * - Signals that predicted wins get boosted (x1.05)
 * - Signals that predicted losses get decayed (x0.95)
 * - Range: [0.3, 2.5]
 * 
 * Weights are injected into the LLM prompt for awareness.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const WEIGHTS_PATH = join(ROOT, 'signal-weights.json');

const DEFAULT_WEIGHTS = {
  organic_score: 1.0,
  fee_tvl_ratio: 1.0,
  volume: 1.0,
  mcap: 1.0,
  holder_count: 1.0,
  smart_wallets_present: 1.0,
  narrative_quality: 1.0,
  study_win_rate: 1.0,
  volatility: 1.0,
};

const NUMERIC_SIGNALS = ['organic_score', 'fee_tvl_ratio', 'volume', 'mcap', 'holder_count', 'volatility'];
const BOOLEAN_SIGNALS = ['smart_wallets_present'];
const CATEGORICAL_SIGNALS = ['narrative_quality'];

let weights = { ...DEFAULT_WEIGHTS };
let history = [];

export function loadWeights() {
  if (existsSync(WEIGHTS_PATH)) {
    try {
      const data = JSON.parse(readFileSync(WEIGHTS_PATH, 'utf-8'));
      weights = { ...DEFAULT_WEIGHTS, ...data.weights };
      history = data.history || [];
    } catch (e) { /* use defaults */ }
  }
  return weights;
}

export function saveWeights() {
  writeFileSync(WEIGHTS_PATH, JSON.stringify({ weights, history }, null, 2));
}

export function getWeights() {
  return { ...weights };
}

export function getWeightsSummary() {
  const bars = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => {
      const bar = '█'.repeat(Math.round(val * 8));
      return `${key.padEnd(20)} ${bar} ${val.toFixed(2)}x`;
    }).join('\n');
  return `📊 Signal Weights\n━━━━━━━━━━━━━━━\n${bars}`;
}

export function recalculateWeights(performances) {
  if (performances.length < 5) return;
  
  const wins = performances.filter(p => p.pnl_pct > 0);
  const losses = performances.filter(p => p.pnl_pct <= 0);
  if (wins.length < 2 || losses.length < 2) return;
  
  const changes = {};
  
  // Numeric signals: compare win mean vs loss mean
  for (const signal of NUMERIC_SIGNALS) {
    if (!weights[signal]) continue;
    const winVals = wins.map(p => p.signals?.[signal]).filter(v => v != null);
    const lossVals = losses.map(p => p.signals?.[signal]).filter(v => v != null);
    if (winVals.length < 2 || lossVals.length < 2) continue;
    
    const winMean = winVals.reduce((a, b) => a + b, 0) / winVals.length;
    const lossMean = lossVals.reduce((a, b) => a + b, 0) / lossVals.length;
    const lift = winMean > 0 ? (winMean - lossMean) / Math.abs(winMean) : 0;
    
    changes[signal] = lift > 0.1 ? 1.05 : lift < -0.1 ? 0.95 : 1.0;
  }
  
  // Boolean signals: compare win rate when present vs absent
  for (const signal of BOOLEAN_SIGNALS) {
    if (!weights[signal]) continue;
    const presentWins = wins.filter(p => p.signals?.[signal]).length;
    const presentLosses = losses.filter(p => p.signals?.[signal]).length;
    const absentWins = wins.filter(p => !p.signals?.[signal]).length;
    const absentLosses = losses.filter(p => !p.signals?.[signal]).length;
    
    const presentRate = presentWins + presentLosses > 0
      ? presentWins / (presentWins + presentLosses) : 0;
    const absentRate = absentWins + absentLosses > 0
      ? absentWins / (absentWins + absentLosses) : 0;
    
    changes[signal] = presentRate > absentRate ? 1.05 : 0.95;
  }
  
  // Apply changes clamped to [0.3, 2.5]
  for (const [key, mult] of Object.entries(changes)) {
    weights[key] = Math.max(0.3, Math.min(2.5, weights[key] * mult));
  }
  
  history.push({
    at: Date.now(),
    performances: performances.length,
    changes,
    weights: { ...weights },
  });
  
  saveWeights();
}

// Init
loadWeights();
