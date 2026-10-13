// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as InlineEditor from './inline_editor.js';

function testValidCase(input: string, output: string): void {
  const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse(input);
  assert.strictEqual(model!.asCSSText(), output, `Parsing is invalid for case "${input}"`);
}

function testInvalidCase(input: string): void {
  const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse(input);
  assert.isNull(model);
}

describe('CSSLinearEasingModel', () => {
  describe('valid WPT cases', () => {
    it('should parse valid cases from WPT', () => {
      testValidCase('linear(0 0%, 1 100%)', 'linear');
      testValidCase('linear(0 0% 50%, 1 50% 100%)', 'linear(0 0%, 0 50%, 1 50%, 1 100%)');
      testValidCase('linear(0, 0.5 25% 75%, 1 100% 100%)', 'linear(0 0%, 0.5 25%, 0.5 75%, 1 100%, 1 100%)');
      testValidCase(
          'linear(0, 1.3, 1, 0.92, 1, 0.99, 1, 1.004, 0.998, 1 100% 100%)',
          'linear(0 0%, 1.3 11.11%, 1 22.22%, 0.92 33.33%, 1 44.44%, 0.99 55.56%, 1 66.67%, 1 77.78%, 1 88.89%, 1 100%, 1 100%)');

      testValidCase('linear(0, 1)', 'linear');
      testValidCase('linear(0 0% 50%, 1 50% 100%)', 'linear(0 0%, 0 50%, 1 50%, 1 100%)');
      testValidCase('linear(0, 0.5 25% 75%, 1 100% 100%)', 'linear(0 0%, 0.5 25%, 0.5 75%, 1 100%, 1 100%)');
      testValidCase(
          'linear(0, 1.3, 1, 0.92, 1, 0.99, 1, 0.998, 1 100% 100%)',
          'linear(0 0%, 1.3 12.5%, 1 25%, 0.92 37.5%, 1 50%, 0.99 62.5%, 1 75%, 1 87.5%, 1 100%, 1 100%)');
    });

    // Even though these cases should be handled as well, in frontend we bail out when we see something
    // different than a number inside the arguments.
    it('should not parse cases that include non-numbers like calc function in arguments', () => {
      testInvalidCase('linear(0 calc(0%), 0 calc(100%))');
      testInvalidCase('linear(0 calc(50% - 50%), 0 calc(50% + 50%))');
      testInvalidCase('linear(0 calc(min(50%, 60%)), 0 100%)');
    });
  });

  it('should not parse invalid cases from WPT', () => {
    testInvalidCase('linear()');
    testInvalidCase('linear(0)');
    testInvalidCase('linear(100%)');
    testInvalidCase('linear(0% 1 50%)');
    testInvalidCase('linear(0 0% 100%)');
    testInvalidCase('linear(0% 100% 0)');
    testInvalidCase('linear(0 calc(50px - 50%), 0 calc(50em + 50em))');
    testInvalidCase('linear(0 calc(50%, 50%), 0 calc(50% + 50%))');
  });

  it('should parse "linear" as linear(0 0%, 1 100%) function', () => {
    const points = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear')!.points();
    assert.deepEqual(points, [{input: 0, output: 0}, {input: 100, output: 1}]);
  });

  it('linear(0 0%, 1 100%) is stringified as "linear"', () => {
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0 0%, 1 100%)');
    assert.strictEqual(model!.asCSSText(), 'linear');
  });

  it('should clamp point input when calling setPoint to prevent overshooting', () => {
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0 0%, 0.5 50%, 1 100%)')!;
    // Try to set Point 1 (index 1) to input = -10 (which is less than index 0's input, 0)
    model.setPoint(1, {input: -10, output: 0.5});
    assert.strictEqual(model.points()[1].input, 0);

    // Try to set Point 1 to input = 120 (which is greater than index 2's input, 100)
    model.setPoint(1, {input: 120, output: 0.5});
    assert.strictEqual(model.points()[1].input, 100);

    // Try to set index 0 (first point) to a negative input
    model.setPoint(0, {input: -10, output: 0});
    assert.strictEqual(model.points()[0].input, 0);

    // Try to set index 2 (last point) to an input greater than 100
    model.setPoint(2, {input: 110, output: 1});
    assert.strictEqual(model.points()[2].input, 100);
  });

  it('should clamp point input to intermediate neighboring points', () => {
    // Parse a model where the first point has input 20% and the last point has input 80%.
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0 20%, 0.5 50%, 1 80%)')!;

    // Try to set Point 1 (index 1) to input 10%. It should be clamped to its left neighbor's input (20%).
    model.setPoint(1, {input: 10, output: 0.5});
    assert.strictEqual(model.points()[1].input, 20);

    // Try to set Point 1 to input 90%. It should be clamped to its right neighbor's input (80%).
    model.setPoint(1, {input: 90, output: 0.5});
    assert.strictEqual(model.points()[1].input, 80);
  });
});
