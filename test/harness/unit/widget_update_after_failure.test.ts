// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as UI from '../../../front_end/ui/legacy/legacy.js';

class CountingWidget extends UI.Widget.Widget {
  updateCount = 0;

  override performUpdate(): void {
    this.updateCount++;
  }
}

describe('Widget updates after a failed test', () => {
  it('fails synchronously after requesting a widget update', () => {
    new CountingWidget().requestUpdate();
    throw new Error('Intentional failure after requestUpdate()');
  });

  it('still runs widget updates in the next test', async () => {
    const widget = new CountingWidget();
    widget.requestUpdate();
    await widget.updateComplete;
    assert.strictEqual(widget.updateCount, 1);
  });
});
