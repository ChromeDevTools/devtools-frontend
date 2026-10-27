// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {execFileSync} from 'node:child_process';
import * as path from 'node:path';

describe('MetricCompareStrings generator', () => {
  it('generates strings without trailing periods for single-sentence messages', () => {
    const scriptPath = path.resolve(import.meta.dirname, '../../generate_metric_compare_strings.js');
    const output = execFileSync(process.execPath, [scriptPath], {encoding: 'utf-8'});

    const hasTrailingPeriod =
        /experience\.',/.test(output) || /\{PH2\} (is good|needs improvement|is poor)\.',/.test(output);
    assert.isFalse(
        hasTrailingPeriod,
        'The generator script outputs trailing periods in single-sentence string templates',
    );
  });
});
