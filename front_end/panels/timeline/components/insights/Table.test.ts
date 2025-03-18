// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Insights from './insights.js';
import type {RowLimitAggregator} from './Table.js';

const {createLimitedRows} = Insights.Table;

const {assert} = chai;

describe('rowLimitAggregate', () => {
  const aggregator: RowLimitAggregator<number> = {
    mapToRow: num => ({values: [num]}),
    createAggregatedTableRow: others => ({values: [`${others.length} others`]}),
  };

  it('handles empty array', () => {
    const rows = createLimitedRows([], aggregator);
    assert.deepEqual(rows, []);
  });

  it('respects limit 0', () => {
    const rows = createLimitedRows([1, 2], aggregator, 0);
    assert.deepEqual(rows, []);
  });

  it('respects limit 1', () => {
    const rows = createLimitedRows([1, 2, 3], aggregator, 1);
    assert.deepEqual(rows, [
      {values: ['3 others']},
    ]);
  });

  it('correctly limits rows', () => {
    const rows = createLimitedRows([1, 2, 3, 4, 5], aggregator, 3);
    assert.deepEqual(rows, [
      {values: [1]},
      {values: [2]},
      {values: ['3 others']},
    ]);
  });

  it('does not aggregate if input shorter than the limit', () => {
    const rows = createLimitedRows([1, 2], aggregator, 3);
    assert.deepEqual(rows, [
      {values: [1]},
      {values: [2]},
    ]);
  });

  it('does not aggregate if input is exactly at the limit', () => {
    const rows = createLimitedRows([1, 2, 3], aggregator, 3);
    assert.deepEqual(rows, [
      {values: [1]},
      {values: [2]},
      {values: [3]},
    ]);
  });
});
