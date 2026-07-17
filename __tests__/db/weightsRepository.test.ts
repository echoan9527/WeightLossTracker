import { mockDb } from '../../__mocks__/expo-sqlite';
jest.mock('expo-sqlite');
jest.mock('../../src/db/database', () => ({ getDB: () => mockDb }));
import { insertWeight, updateWeight, deleteWeight, getAllWeights, getWeightByDate, getPreviousWeightByDate } from '../../src/db/weightsRepository';

beforeEach(() => jest.clearAllMocks());

test('insertWeight calls runAsync with date and weight', async () => {
  await insertWeight('2026-07-05', 75.5);
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    'INSERT INTO weights (date, weight, created_at) VALUES (?, ?, ?)',
    expect.arrayContaining(['2026-07-05', 75.5])
  );
});

test('updateWeight updates existing weight row', async () => {
  await updateWeight(2, 73);
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    'UPDATE weights SET weight = ? WHERE id = ?',
    [73, 2]
  );
});

test('deleteWeight removes row by id', async () => {
  await deleteWeight(7);
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    'DELETE FROM weights WHERE id = ?',
    [7]
  );
});

test('getAllWeights returns mapped Weight array', async () => {
  mockDb.getAllAsync.mockResolvedValueOnce([
    { id: 1, date: '2026-07-05', weight: 75.5, created_at: '2026-07-05T08:00:00' }
  ]);
  const result = await getAllWeights();
  expect(result[0].weight).toBe(75.5);
});

test('getWeightByDate returns latest weight for date', async () => {
  mockDb.getFirstAsync.mockResolvedValueOnce(
    { id: 2, date: '2026-07-05', weight: 75.2, created_at: '2026-07-05T10:00:00' }
  );
  const result = await getWeightByDate('2026-07-05');
  expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
    'SELECT * FROM weights WHERE date = ? ORDER BY id DESC LIMIT 1',
    ['2026-07-05']
  );
  expect(result?.weight).toBe(75.2);
});

test('getPreviousWeightByDate returns latest previous weight', async () => {
  mockDb.getFirstAsync.mockResolvedValueOnce(
    { id: 1, date: '2026-07-04', weight: 75.5, created_at: '2026-07-04T10:00:00' }
  );
  const result = await getPreviousWeightByDate('2026-07-05');
  expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
    'SELECT * FROM weights WHERE date < ? ORDER BY date DESC, id DESC LIMIT 1',
    ['2026-07-05']
  );
  expect(result?.weight).toBe(75.5);
});
