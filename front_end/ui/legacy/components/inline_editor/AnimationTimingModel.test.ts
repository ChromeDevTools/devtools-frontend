// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from './inline_editor.js';

describe('AnimationTimingModel', () => {
  it('should parse `linear` as linear easing function', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('linear');
    assert.instanceOf(model, InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel);
    assert.strictEqual(model!.asCSSText(), 'linear');
  });

  it('should parse a valid cubic bezier curve', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('cubic-bezier(0, 0.5, 1, 1)');
    assert.strictEqual(model!.asCSSText(), 'cubic-bezier(0, 0.5, 1, 1)');
  });

  it('should parse a valid linear easing function', () => {
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse('linear(0, 1)');
    assert.strictEqual(model!.asCSSText(), 'linear');
  });
});
