/**
 * Whale Guard — Meteora Pool TVL Monitoring
 * Auto-closes positions when whale dumps cause TVL crash
 */
import axios from 'axios';
import { config } from '../config.js';
import { dlmm } from './dlmm.js';

const WHALE_EVENTS = [];

export async function checkWhaleActivity(position) {
  if (!config.whaleGuard?.enabled) return null;
  
  const threshold = config.whaleGuard?.minQuoteDrainUsd || 12000;
  const minDrop = config.whaleGuard?.minTvlDropPct || 18;
  const windowMin = config.whaleGuard?.windowMinutes || 5;
  
  try {
    const poolData = await dlmm.getPool(position.pool_address);
    const currentTvl = Number(poolData?.tvl || 0);
    const prevTvl = Number(position._lastTvl || currentTvl);
    
    const dropPct = prevTvl > 0 ? ((prevTvl - currentTvl) / prevTvl) * 100 : 0;
    const drainUsd = prevTvl - currentTvl;
    
    position._lastTvl = currentTvl;
    
    if (drainUsd >= threshold && dropPct >= minDrop) {
      WHALE_EVENTS.push({
        position_id: position.id,
        pool: position.pool_address,
        drainUsd,
        dropPct,
        timestamp: Date.now(),
      });
      return {
        whaleDetected: true,
        drainUsd,
        dropPct,
        reason: `Whale drain: ${drainUsd.toFixed(0)} USD (${dropPct.toFixed(1)}%)`,
        action: config.whaleGuard?.autoClose !== false ? 'close' : 'alert',
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getWhaleEvents(since = Date.now() - 3600000) {
  return WHALE_EVENTS.filter(e => e.timestamp >= since);
}
