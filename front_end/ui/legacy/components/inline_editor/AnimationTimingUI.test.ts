// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as InlineEditor from './inline_editor.js';

describeWithEnvironment('AnimationTimingUI', () => {
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

  it('should install "Double-click to delete" tooltip on control points', () => {
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0, 1)')!;
    const animationTimingUI = new InlineEditor.AnimationTimingUI.AnimationTimingUI({
      model,
      onChange: () => {},
    });
    animationTimingUI.draw();
    const controlCircles = animationTimingUI.element().querySelectorAll('.bezier-control-circle');
    assert.lengthOf(controlCircles, 2);
    for (const circle of controlCircles) {
      const titleElement = circle.querySelector('title');
      assert.exists(titleElement);
      assert.strictEqual(titleElement.textContent, 'Double-click to delete');
    }
  });

  it('should update model points correctly on drag', () => {
    let updatedModel: InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel|null = null;
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0 0%, 1 100%)')!;
    const animationTimingUI = new InlineEditor.AnimationTimingUI.AnimationTimingUI({
      model,
      onChange: m => {
        updatedModel = m as InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel;
      },
    });
    animationTimingUI.draw();
    const controlCircles = animationTimingUI.element().querySelectorAll('.bezier-control-circle');
    assert.lengthOf(controlCircles, 2);

    const secondCircle = controlCircles[1];
    // Start drag on the second control point (index 1)
    const mousedownEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: 143,
      clientY: 7,
    });
    secondCircle.dispatchEvent(mousedownEvent);

    const doc = secondCircle.ownerDocument;

    // Drag mouse left to clientX = 120
    const mousemoveEvent = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 7,
    });
    doc.dispatchEvent(mousemoveEvent);

    // Drag mouse end
    const mouseupEvent = new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 7,
    });
    doc.dispatchEvent(mouseupEvent);

    assert.exists(updatedModel);
    // The second point's input should be updated to around 83%
    const points = (updatedModel as InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel).points();
    assert.closeTo(points[1].input, 83, 1);
  });
});
