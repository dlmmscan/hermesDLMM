# 🧠 Hermes DLMM
### Autonomous LP Bot for Meteora Pools — Enhanced Edition

> Fork of Bravonoid/meridian + Mavour/meridian with anti-rug hardening, Darwinian learning, whale guard, and GMGN integration.

## ⚡ Quick Start

```bash
git clone https://github.com/dlmmscan/hermesDLMM.git
cd hermesDLMM
cp .env.example .env   # fill your keys
cp user-config.example.json user-config.json
npm install
npm start              # production mode
# npm run dev           # dry-run mode
```

## 🏗️ Architecture

```
index.js                Main: REPL + cron + Telegram polling
agent.js                ReAct loop (OpenRouter): LLM → tool → repeat
├── config.js           Anti-rug optimized config (hot-reloadable)
├── prompt.js           Role-based system prompts (SCREENER/MANAGER/GENERAL)
├── state.js            Position registry + OOR tracking
├── lessons.js          Auto-learning from closed positions
├── signal-weights.js   ⭐ Darwinian evolution: weights auto-tune every 5 closes
├── signal-tracker.js   ⭐ Signal staging before LLM decision
├── strategy-library.js ⭐ 5 LP strategies (bid-ask, spot, curve, compound, harvest)
├── gmgn-config.js      GMGN API filter parameters
├── decision-log.js     Full audit trail
├── telegram.js         Telegram bot: notifications, commands

tools/
├── dlmm.js             Meteora DLMM SDK wrapper
├── screening.js        Pool discovery + enrichment (Meteora → Jupiter → GMGN → OKX)
├── executor.js         Tool dispatch + safety checks + hardcode close queue
├── whale-guard.js      ⭐ TVL monitoring, auto-close on whale dump
├── wallet.js           SOL/token balances + Jupiter swap
├── token.js            Token info + bundler detection
├── study.js            Top LPer analysis
```

## ⭐ Key Features

### 🛡️ Anti-Rug Hardening
| Rule | Value | Why |
|------|-------|-----|
| `minFeeActiveTvlRatio` | **0.3** | Pool must generate 30%+ fee/TVL (default: 0.05) |
| `stopLossPct` | **-12%** | Tight stop (default: -50%) |
| `hardStopPct` | **-15%** | Bypass LLM, instant close |
| `athFilterPct` | **-30%** | Don't deploy at ATH |
| `maxVolatility` | **4** | Reduce IL risk |
| `minTokenFeesSol` | **40** | Signature rug filter |
| `minTokenAgeHours` | **2** | Skip fresh tokens |
| `blockedLaunchpads` | `pump.fun` | Avoid scam launchpads |
| `blockPvpSymbols` | yes | Filter copycat tokens |

### 🧬 Darwinian Signal Weights
Weights **auto-evolve** after every 5 position closes:
- Signals that predicted wins → boosted (×1.05, max 2.5×)
- Signals that predicted losses → decayed (×0.95, min 0.3×)
- Tracks: `organic_score`, `fee_tvl_ratio`, `volume`, `mcap`, `holder_count`, `smart_wallets_present`, `narrative_quality`, `volatility`

### 🐋 Whale Guard
Monitors Meteora pool TVL every cycle. If whale dumps >$12K TVL with 18%+ drop in 5min:
- Auto-closes position (bypasses LLM)
- Logs alert
- 10-minute cooldown prevents re-entry

### 📐 Strategy Library (5 built-in)
| Strategy | Use Case |
|----------|----------|
| **Bid-Ask Spread** | Safety-first, stable pools |
| **Spot Recovery** | Dip buy after ATH drop |
| **Curve Play** | Volatile new tokens |
| **Fee Compounding** | Reinvest fees, long-term hold |
| **Partial Harvest** | Take profit at 10%, let rest run |

### 🧠 Hardcode Close Queue (bypass LLM)
Priority-based — no LLM needed for exits:
```
1. HARD STOP (-15%) → close NOW
2. STOP LOSS (-12%) → close
3. TRAILING TP (peak -2.5%) → close
4. SLOW BLEED (low fee + flat) → close
5. OOR (out of range) → close
6. STAY → nothing triggered
```

### 📊 GMGN Integration
Token screening via GMGN API:
- Supertrend + RSI indicators
- Smart money / KOL wallet tracking
- Rug ratio, bundler rate, dev team hold rate
- Fresh wallet detection

## 📱 Telegram Commands

| Command | Action |
|---------|--------|
| `/positions` | List open positions |
| `/close <n>` | Close position #n |
| `/set <n> <note>` | Set note on position |
| `/history` | Recent closes + PnL |
| `/config` | Show current config |
| `/strategy <id>` | Switch strategy |
| `/whales` | Recent whale events |
| `/update` | Git pull + restart |
| `/help` | All commands |

## ⚙️ Config Reference

See `user-config.example.json` for all parameters. Key sections:
- `screening.*` — Pool quality gates
- `management.*` — Position lifecycle (SL/TP/trailing)
- `risk.*` — Safety limits
- `strategy.*` — LP strategy config
- `schedule.*` — Cron intervals
- `llm.*` — Model selection
- `whaleGuard.*` — Whale dump detection

## 🧪 Development

```bash
npm run dev              # dry-run mode
npm run test:screen      # test pool screening
npm run test:agent       # test agent loop
npm run dashboard        # LPGoose dashboard
```

## 📜 License

MIT — Forked from [Bravonoid/meridian](https://github.com/Bravonoid/meridian) + [Mavour/meridian](https://github.com/Mavour/meridian/). Enhanced by Hermes DLMM team.
