import { create } from 'zustand';
import { Meal, Weight, Goal } from '../types';

interface AppState {
  todayMeals: Meal[];
  todayWeight: Weight | null;
  currentGoal: Goal | null;
  allWeights: Weight[];
  setTodayMeals: (meals: Meal[]) => void;
  setTodayWeight: (w: Weight | null) => void;
  setCurrentGoal: (g: Goal | null) => void;
  setAllWeights: (ws: Weight[]) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (id: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  todayMeals: [], todayWeight: null, currentGoal: null, allWeights: [],
  setTodayMeals: (meals) => set({ todayMeals: meals }),
  setTodayWeight: (w) => set({ todayWeight: w }),
  setCurrentGoal: (g) => set({ currentGoal: g }),
  setAllWeights: (ws) => set({ allWeights: ws }),
  addMeal: (meal) => set((s) => ({ todayMeals: [...s.todayMeals, meal] })),
  removeMeal: (id) => set((s) => ({ todayMeals: s.todayMeals.filter(m => m.id !== id) })),
}));
