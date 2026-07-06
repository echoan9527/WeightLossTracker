import { calculateProgress, estimateCompletionDate } from '../../src/utils/goalCalculations';
import { Weight } from '../../src/types';

test('calculateProgress returns 50 when halfway to goal', () => {
  expect(calculateProgress(72.5, 75, 70)).toBe(50);
});

test('calculateProgress returns 100 when at target', () => {
  expect(calculateProgress(70, 75, 70)).toBe(100);
});

test('calculateProgress clamps to 0 when weight exceeds start', () => {
  expect(calculateProgress(76, 75, 70)).toBe(0);
});

test('estimateCompletionDate returns null with fewer than 2 records', () => {
  const weights: Weight[] = [{ id: 1, date: '2026-07-05', weight: 75, created_at: '' }];
  expect(estimateCompletionDate(75, 70, weights)).toBeNull();
});

test('estimateCompletionDate returns a future date given steady loss', () => {
  const weights: Weight[] = [
    { id: 1, date: '2026-07-01', weight: 76, created_at: '' },
    { id: 2, date: '2026-07-05', weight: 75, created_at: '' },
  ];
  const result = estimateCompletionDate(75, 70, weights);
  expect(result).toBeInstanceOf(Date);
  expect(result!.getTime()).toBeGreaterThan(Date.now());
});
