import { getDB } from './database';
import { Weight } from '../types';

export async function insertWeight(date: string, weight: number): Promise<void> {
  const db = getDB();
  await db.runAsync(
    'INSERT INTO weights (date, weight, created_at) VALUES (?, ?, ?)',
    [date, weight, new Date().toISOString()]
  );
}

export async function updateWeight(id: number, weight: number): Promise<void> {
  const db = getDB();
  await db.runAsync(
    'UPDATE weights SET weight = ? WHERE id = ?',
    [weight, id]
  );
}

export async function getAllWeights(): Promise<Weight[]> {
  const db = getDB();
  return db.getAllAsync<Weight>('SELECT * FROM weights ORDER BY date ASC');
}

export async function getWeightByDate(date: string): Promise<Weight | null> {
  const db = getDB();
  return db.getFirstAsync<Weight>(
    'SELECT * FROM weights WHERE date = ? ORDER BY id DESC LIMIT 1',
    [date]
  );
}

export async function getWeightsByDateRange(from: string, to: string): Promise<Weight[]> {
  const db = getDB();
  return db.getAllAsync<Weight>(
    'SELECT * FROM weights WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [from, to]
  );
}
