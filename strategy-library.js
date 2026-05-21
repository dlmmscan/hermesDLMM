/**
 * Strategy Library — LP Strategy Templates
 * 
 * Each strategy encodes entry/exit/range behaviors.
 * Active strategy guides the screening cycle and position config.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const STRATEGY_PATH = join(ROOT, 'strategy-library.json');

const DEFAULT_STRATEGIES = [
  {
    id: 'bid_ask',
    name: 'Bid-Ask Spread',
    description: 'Safety-first. Narrow spread, both sides. Best for stable/mid-volatility pools.',
    best_for: 'stable pools, mid volatility, consistent fees',
    entry: { require_fee_tvl: 0.3, require_volume: 5000, require_organic: 72 },
    range: { bins_below: 40, bins_above: 40, strategy_type: 'bid_ask' },
    exit: { tp_fee_pct: 20, sl_pct: -12, hard_sl: -15, trailing: true, trailing_trigger: 5, trailing_drop: 2.5 },
    position: { single_side_x: false, single_side_y: false },
  },
  {
    id: 'spot_recovery',
    name: 'Spot Recovery (Dip Buy)',
    description: 'Single-side SOL, dip buy after ATH drop. Best for recovery plays.',
    best_for: 'post-dump recovery, smart money entry',
    entry: { require_fee_tvl: 0.5, require_volume: 10000, require_ath_drop: -30, require_smart_wallet: true },
    range: { bins_below: 50, bins_above: 0, strategy_type: 'spot' },
    exit: { tp_fee_pct: 50, sl_pct: -12, hard_sl: -15, trailing: true, trailing_trigger: 8, trailing_drop: 3 },
    position: { single_side_x: false, single_side_y: true },
  },
  {
    id: 'curve_play',
    name: 'Curve Play (Volatile)',
    description: 'Wide range, both sides. Best for new high-volume, volatile tokens.',
    best_for: 'new tokens <24h, high volume, volatile',
    entry: { require_fee_tvl: 0.4, require_volume: 20000, require_token_age_max: 24 },
    range: { bins_below: 60, bins_above: 60, strategy_type: 'curve' },
    exit: { tp_fee_pct: 50, sl_pct: -15, hard_sl: -20, trailing: true, trailing_trigger: 10, trailing_drop: 4 },
    position: { single_side_x: false, single_side_y: false },
  },
  {
    id: 'fee_compounding',
    name: 'Fee Compounding',
    description: 'Claim fees >$5, add liquidity back. Reinvest, don\'t withdraw.',
    best_for: 'high-fee pools, long-term hold',
    entry: { require_fee_tvl: 0.5, require_volume: 15000, require_token_age_min: 6 },
    range: { bins_below: 45, bins_above: 45, strategy_type: 'bid_ask' },
    exit: { tp_fee_pct: 100, sl_pct: -10, hard_sl: -12, trailing: true, trailing_trigger: 3, trailing_drop: 1.5 },
    position: { single_side_x: false, single_side_y: false, auto_compound: true },
  },
  {
    id: 'partial_harvest',
    name: 'Partial Harvest',
    description: 'At 10% return, withdraw 50% and let rest run.',
    best_for: 'profitable positions, risk management',
    entry: { require_fee_tvl: 0.3, require_volume: 5000, require_organic: 60 },
    range: { bins_below: 40, bins_above: 40, strategy_type: 'bid_ask' },
    exit: { tp_fee_pct: 10, sl_pct: -12, hard_sl: -15, partial_harvest: { trigger: 10, sell_pct: 50 } },
    position: { single_side_x: false, single_side_y: false },
  },
];

let strategies = [];

export function loadStrategies() {
  if (existsSync(STRATEGY_PATH)) {
    try {
      strategies = JSON.parse(readFileSync(STRATEGY_PATH, 'utf-8'));
    } catch (e) {
      strategies = [...DEFAULT_STRATEGIES];
      saveStrategies();
    }
  } else {
    strategies = [...DEFAULT_STRATEGIES];
    saveStrategies();
  }
  return strategies;
}

export function saveStrategies() {
  writeFileSync(STRATEGY_PATH, JSON.stringify(strategies, null, 2));
}

export function getStrategy(id) {
  return strategies.find(s => s.id === id);
}

export function addStrategy(strategy) {
  strategies.push(strategy);
  saveStrategies();
  return strategy;
}

export function getStrategyForPrompt() {
  const active = strategies.find(s => s.id === (process.env.ACTIVE_STRATEGY || 'bid_ask'));
  if (!active) return strategies[0];
  return active;
}

// Init
loadStrategies();
