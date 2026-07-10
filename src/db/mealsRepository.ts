import { getDB } from './database';
import { Meal, MealMode, MealType } from '../types';

type NewMeal = Omit<Meal, 'id' | 'created_at'>;
type MealUpdate = Omit<Meal, 'created_at'>;

export async function insertMeal(data: NewMeal): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `INSERT INTO meals (date,meal_type,description,mode,calories,protein,carbs,fat,photos,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [data.date, data.meal_type, data.description, data.mode,
     data.calories ?? null, data.protein ?? null, data.carbs ?? null, data.fat ?? null,
     data.photos ? JSON.stringify(data.photos) : null, new Date().toISOString()]
  );
}

export async function getMealsByDate(date: string): Promise<Meal[]> {
  const db = getDB();
  const rows = await db.getAllAsync<any>('SELECT * FROM meals WHERE date = ? ORDER BY id ASC', [date]);
  return rows.map(r => ({ ...r, photos: r.photos ? JSON.parse(r.photos) : [] }));
}

export async function updateMeal(data: MealUpdate): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `UPDATE meals
     SET date = ?, meal_type = ?, description = ?, mode = ?,
         calories = ?, protein = ?, carbs = ?, fat = ?, photos = ?
     WHERE id = ?`,
    [data.date, data.meal_type, data.description, data.mode,
     data.calories ?? null, data.protein ?? null, data.carbs ?? null, data.fat ?? null,
     data.photos ? JSON.stringify(data.photos) : null, data.id]
  );
}

export async function deleteMeal(id: number): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM meals WHERE id = ?', [id]);
}

export async function getMealsByDateRange(from: string, to: string): Promise<Meal[]> {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM meals WHERE date >= ? AND date <= ? ORDER BY date ASC', [from, to]
  );
  return rows.map(r => ({ ...r, photos: r.photos ? JSON.parse(r.photos) : [] }));
}
