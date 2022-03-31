// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as utils from '../../../../../front_end/panels/utils/utils.js';
import * as Diff from '../../../../../front_end/third_party/diff/diff.js';

const {assert} = chai;

describe('panels/utils', async () => {
  it('formats CSS changes from diff arrays', async () => {
    const original = `
      .container {
        width: 10px;
        height: 10px;
      }

      .child {
        display: grid;
      }
      `;
    const current = `
      .container {
        width: 15px;
        margin: 0;
      }

      .child {
        display: grid;
        padding: 10px;
      }`;
    const diff = Diff.Diff.DiffWrapper.lineDiff(original.split('\n'), current.split('\n'));
    const changes = await utils.formatCSSChangesFromDiff(diff);
    assert.strictEqual(
        changes, `.container {
  /* width: 10px; */
  /* height: 10px; */
  width: 15px;
  margin: 0;
}

.child {
  padding: 10px;
}`,
        'formatted CSS changes are not correct');
  });
});
