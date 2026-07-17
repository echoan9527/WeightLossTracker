import * as SQLite from 'expo-sqlite';
import {
  LEGACY_MEAL_IMPORT_KEY,
  LEGACY_MEAL_SEEDS,
} from '../data/legacyMealSeeds';

let db: SQLite.SQLiteDatabase;

export async function initDB(): Promise<void> {
  db = await SQLite.openDatabaseAsync('weightloss.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, meal_type TEXT NOT NULL,
      description TEXT NOT NULL, mode TEXT NOT NULL,
      calories INTEGER, protein REAL, carbs REAL, fat REAL,
      photos TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_weight REAL NOT NULL,
      target_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS import_history (
      key TEXT PRIMARY KEY,
      imported_at TEXT NOT NULL
    );
  `);
  await importLegacyMealSeeds();
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB not initialized');
  return db;
}

async function importLegacyMealSeeds(): Promise<void> {
  const imported = await db.getFirstAsync<{ key: string }>(
    'SELECT key FROM import_history WHERE key = ?',
    [LEGACY_MEAL_IMPORT_KEY],
  );
  if (imported) return;

  const now = new Date().toISOString();
  for (const meal of LEGACY_MEAL_SEEDS) {
    await db.runAsync(
      `INSERT INTO meals (date,meal_type,description,mode,calories,protein,carbs,fat,photos,created_at)
       SELECT ?,?,?,?,?,?,?,?,?,?
       WHERE NOT EXISTS (
         SELECT 1 FROM meals WHERE date = ? AND meal_type = ? AND description = ?
       )`,
      [
        meal.date,
        meal.meal_type,
        meal.description,
        'A',
        null,
        null,
        null,
        null,
        null,
        now,
        meal.date,
        meal.meal_type,
        meal.description,
      ],
    );
  }

  await db.runAsync(
    'INSERT INTO import_history (key, imported_at) VALUES (?, ?)',
    [LEGACY_MEAL_IMPORT_KEY, now],
  );
}
