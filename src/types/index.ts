export type MealMode = 'A' | 'B' | 'C';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Weight {
  id: number;
  date: string;
  weight: number;
  created_at: string;
}

export interface Meal {
  id: number;
  date: string;
  meal_type: MealType;
  description: string;
  mode: MealMode;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  photos?: string[];
  created_at: string;
}

export interface Goal {
  id: number;
  target_weight: number;
  target_date: string;
  created_at: string;
}
