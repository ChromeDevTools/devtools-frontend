// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';

const {assert} = chai;

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
    assertNotNullOrUndefined(linearEasingContainer);
    assertNotNullOrUndefined(bezierContainer);
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
    assertNotNullOrUndefined(linearEasingContainer);
    assertNotNullOrUndefined(bezierContainer);

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
    assertNotNullOrUndefined(linearEasingContainer);
    assertNotNullOrUndefined(bezierContainer);

    assert.isFalse(bezierContainer.classList.contains('hidden'));
    assert.isTrue(linearEasingContainer.classList.contains('hidden'));
  });
});
