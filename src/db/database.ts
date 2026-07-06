import * as SQLite from 'expo-sqlite';

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
  `);
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB not initialized');
  return db;
}
