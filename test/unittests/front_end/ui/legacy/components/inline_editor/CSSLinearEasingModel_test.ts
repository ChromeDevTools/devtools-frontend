// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';

const {assert} = chai;

function testValidCase(input: string, output: string): void {
  const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse(input);
  assertNotNullOrUndefined(model);
  assert.strictEqual(model.asCSSText(), output, `Parsing is invalid for case "${input}"`);
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
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear');

    assertNotNullOrUndefined(model);

    assert.strictEqual(model.points().length, 2);
    assert.deepEqual({input: 0, output: 0}, model.points()[0]);
    assert.deepEqual({input: 100, output: 1}, model.points()[1]);
  });

  it('linear(0 0%, 1 100%) is stringified as "linear"', () => {
    const model = InlineEditor.CSSLinearEasingModel.CSSLinearEasingModel.parse('linear(0 0%, 1 100%)');

    assertNotNullOrUndefined(model);

    assert.strictEqual(model.asCSSText(), 'linear');
  });
});
