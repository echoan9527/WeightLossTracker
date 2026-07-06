import { Weight } from '../types';

export function calculateProgress(current: number, start: number, target: number): number {
  if (start === target) return 100;
  const pct = ((start - current) / (start - target)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function estimateCompletionDate(
  current: number, target: number, recentWeights: Weight[]
): Date | null {
  if (recentWeights.length < 2) return null;
  const sorted = [...recentWeights].sort((a, b) => a.date.localeCompare(b.date));
  const days = sorted.length - 1;
  const dailyLoss = (sorted[0].weight - sorted[days].weight) / days;
  if (dailyLoss <= 0) return null;
  const daysLeft = Math.ceil((current - target) / dailyLoss);
  const result = new Date();
  result.setDate(result.getDate() + daysLeft);
  return result;
}
