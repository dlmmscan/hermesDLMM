/**
 * GMGN Config — GMGN API screening parameters
 * Used by screening.js for anti-rug token filtering
 */
export const GMGN_CONFIG = {
  api: {
    baseUrl: 'https://openapi.gmgn.ai',
    endpoints: {
      tokenInfo: '/v1/token/info',
      tokenSecurity: '/v1/token/security',
      topHolders: '/v1/market/token_top_holders',
      topTraders: '/v1/market/token_top_traders',
      kline: '/v1/market/token_kline',
      rank: '/v1/market/rank',
      smartMoney: '/v1/user/smartmoney',
      trenches: '/v1/trenches',
    },
  },

  // ─── Anti-Rug Filters ──────────────────────────────────────
  filters: {
    minMcap: 200000,
    maxMcap: 5000000,
    minVolume: 5000,
    minTotalFeeSol: 30,
    minHolders: 500,
    maxRugRatio: 0.2,
    maxTop10HolderRate: 0.4,
    maxBundlerRate: 0.3,
    maxFreshWalletRate: 0.2,
    maxDevTeamHoldRate: 0.02,
    requireBullishSupertrend: true,
    minRsi: 30,
    maxRsi: 70,
    minSmartDegenCount: 1,
    preferredKolNames: [],
    dumpKolNames: [],
  },

  // ─── Indicators ────────────────────────────────────────────
  indicators: {
    supertrendPeriod: 10,
    supertrendMultiplier: 3,
    rsiLength: 2,
    indicatorFilter: 'supertrend',
  },
};
