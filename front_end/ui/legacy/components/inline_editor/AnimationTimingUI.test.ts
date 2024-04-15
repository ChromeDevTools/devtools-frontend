// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from './inline_editor.js';

describe('AnimationTimingUI', () => {
  it('can be instantiated successfully', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('linear(0, 1)') as
        InlineEditor.AnimationTimingModel.AnimationTimingModel;
    const animationTimingUI = new InlineEditor.AnimationTimingUI.AnimationTimingUI({
      model,
      onChange: () => {},
    });

    animationTimingUI.draw();
    const bezierContainer = animationTimingUI.element().querySelector('.bezier-ui-container');
    const linearEasingContainer = animationTimingUI.element().querySelector('.linear-easing-ui-container');
    assert.exists(linearEasingContainer);
    assert.exists(bezierContainer);
  });

  it('should bezier-ui-container be hidden when linear-easing function is visualized', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('linear(0, 1)') as
        InlineEditor.AnimationTimingModel.AnimationTimingModel;
    const animationTimingUI = new InlineEditor.AnimationTimingUI.AnimationTimingUI({
      model,
      onChange: () => {},
    });

    animationTimingUI.draw();
    const bezierContainer = animationTimingUI.element().querySelector('.bezier-ui-container');
    const linearEasingContainer = animationTimingUI.element().querySelector('.linear-easing-ui-container');
    assert.exists(linearEasingContainer);
    assert.exists(bezierContainer);

    assert.isTrue(bezierContainer.classList.contains('hidden'));
    assert.isFalse(linearEasingContainer.classList.contains('hidden'));
  });

  it('should linear-easing-ui-container be hidden when cubic-bezier function is visualized', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('cubic-bezier(0, 0, 1, 1)') as
        InlineEditor.AnimationTimingModel.AnimationTimingModel;
    const animationTimingUI = new InlineEditor.AnimationTimingUI.AnimationTimingUI({
      model,
      onChange: () => {},
    });

    animationTimingUI.draw();
    const bezierContainer = animationTimingUI.element().querySelector('.bezier-ui-container');
    const linearEasingContainer = animationTimingUI.element().querySelector('.linear-easing-ui-container');
    assert.exists(linearEasingContainer);
    assert.exists(bezierContainer);

    assert.isFalse(bezierContainer.classList.contains('hidden'));
    assert.isTrue(linearEasingContainer.classList.contains('hidden'));
  });
});
