import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExcelCellValue } from '../src/utils/excelUtils.js';

test('normalizes legacy Date and current Excel serial time values identically', () => {
  const legacyValue = new Date('1899-12-30T16:00:00.000Z');
  const serialValue = 16 / 24;

  assert.equal(normalizeExcelCellValue(legacyValue, 'START TIME'), '16:00');
  assert.equal(normalizeExcelCellValue(serialValue, 'START TIME'), '16:00');
});

test('normalizes legacy Date and current Excel serial date values identically', () => {
  const legacyValue = new Date('2026-09-03T00:00:00.000Z');
  const serialValue = 46268;

  assert.equal(normalizeExcelCellValue(legacyValue, 'START DATE').toISOString(), legacyValue.toISOString());
  assert.equal(normalizeExcelCellValue(serialValue, 'START DATE').toISOString(), legacyValue.toISOString());
});