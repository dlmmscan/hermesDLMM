/**
 * Signal Tracker — In-memory staging area for screening signals
 * Stored per-pool, consumed by LLM during deploy decision
 * 10-minute TTL to prevent stale signals
 */
const signalStore = new Map();
const TTL_MS = 10 * 60 * 1000;

export function stageSignals(poolAddress, signals = {}) {
  const existing = signalStore.get(poolAddress) || {};
  signalStore.set(poolAddress, {
    ...existing,
    ...signals,
    _updatedAt: Date.now(),
  });
}

export function getStagedSignals(poolAddress) {
  const entry = signalStore.get(poolAddress);
  if (!entry) return null;
  if (Date.now() - entry._updatedAt > TTL_MS) {
    signalStore.delete(poolAddress);
    return null;
  }
  return { ...entry };
}

export function getAndClearStagedSignals(poolAddress) {
  const signals = getStagedSignals(poolAddress);
  if (signals) signalStore.delete(poolAddress);
  return signals;
}

export function clearExpiredSignals() {
  const now = Date.now();
  for (const [key, entry] of signalStore) {
    if (now - entry._updatedAt > TTL_MS) signalStore.delete(key);
  }
}
