// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {CheckSource, formatCheckTable, scoreChecks} from './scorer.js';

describe('scorer', () => {
  describe('formatCheckTable', () => {
    it('formats score, pass/fail, M/P/N summary and aligned Markdown check rows', () => {
      const grading = scoreChecks([
        {
          id: 'names_image',
          source: CheckSource.JUDGE,
          verdict: true,
          weight: 5,
          critical: false,
          reason: 'Names img#hero | verified\nin styles.',
        },
        {
          id: 'blames_other',
          source: CheckSource.JUDGE,
          verdict: true,
          weight: -2,
          critical: true,
          reason: 'Blames fonts.',
        },
      ]);

      assert.strictEqual(
          formatCheckTable(grading),
          [
            'Score: 0.6000 (fail)',
            'M=5 P=5 N=2, critical: blames_other',
            '',
            '| id           | source | verdict | weight        | reason |',
            '| ------------ | ------ | ------- | ------------- | ------------------------------------- |',
            '| names_image  | judge  | true    | 5             | Names img#hero \\| verified in styles. |',
            '| blames_other | judge  | true    | -2 (critical) | Blames fonts. |',
          ].join('\n'),
      );
    });

    it('formats grading errors and ungraded tasks with a null score', () => {
      assert.strictEqual(
          formatCheckTable(scoreChecks([], 'Missing weights.json')),
          'Score: null (grading error: Missing weights.json)\nM=0 P=0 N=0, critical: none',
      );
      assert.strictEqual(
          formatCheckTable(scoreChecks([])),
          'Score: null (ungraded)\nM=0 P=0 N=0, critical: none',
      );
    });
  });
});
