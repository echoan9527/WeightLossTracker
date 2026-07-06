import { getDB } from './database';
import { Goal } from '../types';

export async function upsertGoal(target_weight: number, target_date: string): Promise<void> {
  const db = getDB();
  await db.runAsync(
    'INSERT INTO goals (target_weight, target_date, created_at) VALUES (?, ?, ?)',
    [target_weight, target_date, new Date().toISOString()]
  );
}

export async function getLatestGoal(): Promise<Goal | null> {
  const db = getDB();
  return db.getFirstAsync<Goal>('SELECT * FROM goals ORDER BY id DESC LIMIT 1');
}
