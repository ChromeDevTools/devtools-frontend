// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {findMinMax} from '../../../../../../../front_end/panels/recorder/injected/selectors/CSSSelector.js';

describe('findMinMax', () => {
  it('should work', () => {
    const minmax = findMinMax([0, 10], {
      inc(index: number): number {
        return index + 1;
      },
      valueOf(index: number): number {
        return index;
      },
      gte(value: number, index: number): boolean {
        return value >= index;
      },
    });

    assert.strictEqual(minmax, 9);
  });

  it('should work, non trivial', () => {
    const minmax = findMinMax([0, 10], {
      inc(index: number): number {
        return index + 1;
      },
      valueOf(index: number): number {
        return index;
      },
      gte(value: number, index: number): boolean {
        return value >= Math.min(index, 5);
      },
    });

    assert.strictEqual(minmax, 5);
  });
});
