import { mockDb } from '../../__mocks__/expo-sqlite';
jest.mock('expo-sqlite');
jest.mock('../../src/db/database', () => ({ getDB: () => mockDb }));
import { upsertGoal, getLatestGoal } from '../../src/db/goalsRepository';

beforeEach(() => jest.clearAllMocks());

test('upsertGoal inserts a new goal record', async () => {
  await upsertGoal(65, '2026-12-31');
  expect(mockDb.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO goals'),
    expect.arrayContaining([65, '2026-12-31'])
  );
});

test('getLatestGoal returns null when no goals exist', async () => {
  mockDb.getFirstAsync.mockResolvedValueOnce(null);
  const result = await getLatestGoal();
  expect(result).toBeNull();
});
