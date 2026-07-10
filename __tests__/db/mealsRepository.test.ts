import { mockDb } from '../../__mocks__/expo-sqlite';
jest.mock('expo-sqlite');
jest.mock('../../src/db/database', () => ({ getDB: () => mockDb }));
import { insertMeal, getMealsByDate, updateMeal } from '../../src/db/mealsRepository';

beforeEach(() => jest.clearAllMocks());

test('insertMeal serializes photos to JSON', async () => {
  await insertMeal({ date: '2026-07-05', meal_type: 'lunch', description: 'rice',
    mode: 'A', photos: ['file://photo1.jpg'] });
  const call = mockDb.runAsync.mock.calls[0];
  expect(call[1]).toContain('["file://photo1.jpg"]');
});

test('getMealsByDate deserializes photos from JSON', async () => {
  mockDb.getAllAsync.mockResolvedValueOnce([
    { id: 1, date: '2026-07-05', meal_type: 'lunch', description: 'rice',
      mode: 'A', photos: '["file://photo1.jpg"]', created_at: '' }
  ]);
  const meals = await getMealsByDate('2026-07-05');
  expect(meals[0].photos).toEqual(['file://photo1.jpg']);
});

test('updateMeal updates existing row and serializes photos', async () => {
  await updateMeal({
    id: 1,
    date: '2026-07-05',
    meal_type: 'dinner',
    description: 'rice and fish',
    mode: 'C',
    calories: 520,
    protein: 30,
    carbs: 60,
    fat: 12,
    photos: ['file://photo1.jpg'],
  });
  const call = mockDb.runAsync.mock.calls[0];
  expect(call[0]).toContain('UPDATE meals');
  expect(call[1]).toContain('["file://photo1.jpg"]');
  expect(call[1]).toContain(1);
});
