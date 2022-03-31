// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

const {assert} = chai;

describe('LongClickController', () => {
  it('does not invoke callback when disposed', () => {
    const el = document.createElement('div');
    const callback = sinon.spy();
    const controller = new UI.UIUtils.LongClickController(el, callback);
    // @ts-ignore
    const setTimeout = sinon.stub(window, 'setTimeout').callsFake(cb => cb());

    el.dispatchEvent(new PointerEvent('pointerdown'));
    assert.isTrue(callback.calledOnce);

    controller.dispose();

    el.dispatchEvent(new PointerEvent('pointerdown'));
    assert.isTrue(callback.calledOnce);

    setTimeout.restore();
  });
});
