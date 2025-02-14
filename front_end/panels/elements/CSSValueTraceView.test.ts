// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Elements from './elements.js';

describe('CSSValueTraceView', () => {
  it('works', async () => {
    const view = new Elements.CSSValueTraceView.CSSValueTraceView();
    view.showTrace(
        [[document.createTextNode('sub 1')], [document.createTextNode('sub 2')]],
        [[document.createTextNode('eval 1')], [document.createTextNode('eval 2')]], [document.createTextNode('final')]);
    const {performUpdate} = view;
    const performUpdatePromise = Promise.withResolvers<void>();
    sinon.stub(view, 'performUpdate').callsFake(function(this: unknown) {
      performUpdate.call(this);
      performUpdatePromise.resolve();
    });
    await performUpdatePromise.promise;
    assert.deepEqual(
        view.contentElement.textContent?.split('\n').map(l => l.trim()).filter(l => l),
        ['\u21B3sub 1\u21B3sub 2', '=eval 1', '=eval 2', '=final']);
  });
});
