import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ─── Config System ───────────────────────────────────────────────
// Load: user-config.json → .env → defaults
// Runtime mutations via update_config tool persist back to user-config.json

const DEFAULT_CONFIG = {
  // ═══════════ RISK ═══════════
  risk: {
    maxPositions: 3,
    maxDeployAmount: 50,
  },

  // ═══════════ ANTI-RUG SCREENING ═══════════
  screening: {
    minFeeActiveTvlRatio: 0.3,       // [0.3+] Pool must generate 30%+ fee/TVL (Bravonoid default: 0.05)
    minTvl: 10000,
    maxTvl: 150000,
    minVolume: 5000,                  // [5000+] Avoid dead pools
    minOrganic: 72,                   // [72+] Filter scam tokens (Bravonoid default: 60)
    minHolders: 500,
    minMcap: 150000,
    maxMcap: 10000000,
    minBinStep: 80,
    maxBinStep: 125,
    timeframe: '5m',
    category: 'trending',
    minTokenFeesSol: 40,              // [40+] Signature rug filter
    maxBundlersPct: 30,
    maxBotHoldersPct: 30,
    maxTop10Pct: 60,
    blockedLaunchpads: ['pump.fun', 'letsbonk.fun'],
    minTokenAgeHours: 2,              // [2] Skip fresh tokens
    maxTokenAgeHours: null,
    athFilterPct: -30,                // [-30] Only deploy if >=30% below ATH
    maxVolatility: 4,                 // [4] Reduce IL risk (Bravonoid default: none)
    blockPvpSymbols: true,
    pvpSymbols: ['PvP', 'pvp', 'PVP', 'CTO', 'cto', 'Cto'],
  },

  // ═══════════ STRATEGY (LP mode) ═══════════
  strategy: {
    strategy: 'bid_ask',
    binsBelow: 69,
    minBinsBelow: 35,
    maxBinsBelow: 69,
    spotMinVolume: 10000,
    spotMinFeeActiveTvlRatio: 0.5,
  },

  // ═══════════ POSITION MANAGEMENT ═══════════
  management: {
    minClaimAmount: 5,
    autoSwapAfterClaim: true,
    outOfRangeBinsToClose: 10,
    outOfRangeWaitMinutes: 30,
    minVolumeToRebalance: 1000,
    stopLossPct: -12,                 // [-12] Tighter stop (Bravonoid default: -50)
    hardStopPct: -15,                 // [-15] Bypass LLM, instant close (NEW)
    takeProfitPct: 8,                 // [8] Let winners run
    trailingTakeProfit: true,
    trailingTriggerPct: 5,            // [5%] Don't trail at 3%, too tight
    trailingDropPct: 2.5,             // [2.5%] More room than 1.5%
    minFeePerTvl24h: 7,
    minAgeBeforeYieldCheck: 60,
    minSolToOpen: 0.55,
    deployAmountSol: 0.5,
    gasReserve: 0.2,
    positionSizePct: 0.3,            // [0.3] 30% of deployable SOL
    solMode: false,
    maxHoldHours: 72,                 // [72] Force close after 3 days (NEW)
  },

  // ═══════════ SCHEDULE ═══════════
  schedule: {
    managementIntervalMin: 10,
    screeningIntervalMin: 45,         // [45] Less frequent = fewer bad decisions
    healthCheckIntervalMin: 60,
  },

  // ═══════════ LLM ═══════════
  llm: {
    temperature: 0.2,                // [0.2] More deterministic (Bravonoid default: 0.373)
    maxTokens: 4096,
    maxSteps: 20,
    managementModel: 'openrouter/owl-alpha',
    screeningModel: 'openrouter/owl-alpha',
    generalModel: 'openrouter/owl-alpha',
  },
};

// ─── Runtime config ──────────────────────────────────────────────
let config = {};

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

export function loadConfig() {
  console.error('[config] ROOT:', ROOT);
  let fileConfig = {};
  const configPath = join(ROOT, 'user-config.json');
  console.error('[config] configPath:', configPath);
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      console.error('[config] raw (first 200 chars):', raw.slice(0, 200));
      console.error('[config] fileConfig keys:', Object.keys(JSON.parse(readFileSync(configPath, 'utf-8'))));
      fileConfig = JSON.parse(raw);
    } catch (e) {
      console.error('[config] parse error, using defaults');
    }
  }
  console.error('[config] fileConfig.management:', fileConfig.management);
  config = deepMerge(DEFAULT_CONFIG, fileConfig);
  computeDerived();
  return config;
}

function computeDerived() {
  if (!config.management) {
    console.error('[config] management missing — skipping computeDerived');
    return;
  }
  const minSol = config.management.minSolToOpen;
  const deployAmt = config.management.deployAmountSol;
  config.management.computeDeployAmount = (walletSol) => {
    const deployable = Math.max(0, walletSol - config.management.gasReserve);
    const pct = config.management.positionSizePct;
    const raw = deployable * pct;
    return Math.max(deployAmt, Math.min(raw, config.risk.maxDeployAmount));
  };
}

export function saveConfig() {
  writeFileSync(join(ROOT, 'user-config.json'), JSON.stringify(config, null, 2));
}

export function updateConfig(key, value) {
  const parts = key.split('.');
  let target = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
  saveConfig();
  computeDerived();
}

export function reloadScreeningThresholds() {
  const path = join(ROOT, 'user-config.json');
  if (existsSync(path)) {
    try {
      const fileConfig = JSON.parse(readFileSync(path, 'utf-8'));
      config = deepMerge(DEFAULT_CONFIG, fileConfig);
    } catch (e) { /* keep current config */ }
  }
}

// ─── Env overrides ───────────────────────────────────────────────
import 'dotenv/config';
const ENV_KEYS = {
  LLM_BASE_URL: 'llm.baseUrl',
  LLM_API_KEY: 'llm.apiKey',
  SOLANA_RPC_URL: 'solana.rpcUrl',
  SOLANA_WS_URL: 'solana.wsUrl',
  HELIUS_API_KEY: 'solana.heliusKey',
  JUPITER_API_KEY: 'jupiter.apiKey',
  GMGN_API_KEY: 'gmgn.apiKey',
  OKX_API_KEY: 'okx.apiKey',
  OKX_SECRET: 'okx.secret',
  OKX_PASSPHRASE: 'okx.passphrase',
};

for (const [env, cfgPath] of Object.entries(ENV_KEYS)) {
  if (process.env[env]) { updateConfig(cfgPath, process.env[env]); }
}

// ─── Init ────────────────────────────────────────────────────────
loadConfig();  // Load base config first

// Apply env overrides after config is loaded
for (const [env, cfgPath] of Object.entries(ENV_KEYS)) {
  if (process.env[env]) { updateConfig(cfgPath, process.env[env]); }
}

export { config, DEFAULT_CONFIG };
export default config;
