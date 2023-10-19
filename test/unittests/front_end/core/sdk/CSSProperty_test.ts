// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const {assert} = chai;
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('CSSProperty', () => {
  describe('formatStyle', () => {
    const formatStyle = (styleText: string, indentation = ' ', endIndentation = '') => SDK.CSSProperty.CSSProperty.formatStyle(styleText, indentation, endIndentation);
    it('formats a style declaration with a single trailing semicolon correctly', async () => {
      assert.strictEqual(await formatStyle('color: red;'), '\n color: red;\n');
    });
    it('formats a style declaration with multiple trailing semicolons correctly', async () => {
      assert.strictEqual(await formatStyle('color: red;;;'), '\n color: red;\n');
    });
    it('formats two style declarations correctly', async () => {
      assert.strictEqual(await formatStyle('color: red;;;color: blue'), '\n color: red;\n color: blue\n');
    });
    it('formats multiple style declarations correctly', async () => {
      assert.strictEqual(
          await formatStyle('color: var(-);margin: 0;padding:0'), '\n color: var(-);margin: 0;padding:0\n');
    });
    it('formats style declarations with comments correctly', async () => {
      assert.strictEqual(
          await formatStyle('color: red;/* a comment */;color: blue'), '\n color: red;/* a comment */\n color: blue\n');
    });
    it('formats an empty decalaration correctly', async () => {
      assert.strictEqual(await formatStyle(':; color: red; color: blue'), ':;\n color: red;\n color: blue\n');
    });
    it('formats an empty decalaration correctly and doesn\'t format comments', async () => {
      assert.strictEqual(
          await formatStyle('color: red;/* a comment;;; */ :; color: blue;'),
          '\n color: red;/* a comment;;; */ :;\n color: blue;\n');
    });
    it('formats a decalaration with line names correctly', async () => {
      assert.strictEqual(
          await formatStyle('grid: [first-row-start] "a a" 10px [first-row-end] [second-row-start] "b b" 20px / 100px'),
          '\n grid: [first-row-start] "a a" 10px [first-row-end] [second-row-start] "b b" 20px / 100px\n');
    });
    it('formats shorthand declaration with a variable correctly', async () => {
      assert.strictEqual(
          await formatStyle('border: 1px solid var(--border-color);;', '', ''),
          'border: 1px solid var(--border-color);');
    });
    it('formats shorthand declaration with a function correctly', async () => {
      assert.strictEqual(await formatStyle('border: 1px solid rgb(0,0,0);;', '', ''), 'border: 1px solid rgb(0,0,0);');
    });
    it('formats declaration with unknown property that contains a function correctly', async () => {
      assert.strictEqual(await formatStyle('unknownProperty: rgba(0,0,0,0);;', '', ''), 'unknownProperty: rgba(0,0,0,0);');
    });
    // Regression test for crbug/1392813
    it('formats complex CSS variable declaration', async () => {
      assert.strictEqual(
        await formatStyle('--_name: background var(--another-name)', '', ''),
        '--_name: background var(--another-name)',
      );
    });
  });

  it('should correctly construct new CSSProperty', () => {
    const stubStyle = {} as SDK.CSSStyleDeclaration.CSSStyleDeclaration;

    const property1 =
        new SDK.CSSProperty.CSSProperty(stubStyle, 0, 'display', 'block', false, false, true, false, 'display: block');
    assert.deepEqual(property1.getLonghandProperties(), []);

    const stubLonghands = [
      {name: 'margin-top', value: '1px'} as Protocol.CSS.CSSProperty,
      {name: 'margin-right', value: '1px'} as Protocol.CSS.CSSProperty,
      {name: 'margin-bottom', value: '1px'} as Protocol.CSS.CSSProperty,
      {name: 'margin-left', value: '1px'} as Protocol.CSS.CSSProperty,
    ];
    const property2 = new SDK.CSSProperty.CSSProperty(
        stubStyle, 1, 'margin', '1px', false, false, true, false, 'margin: 1px', undefined, stubLonghands);
    assert.deepEqual(
        property2.getLonghandProperties().map(property => property.propertyText),
        [
          'margin-top: 1px;',
          'margin-right: 1px;',
          'margin-bottom: 1px;',
          'margin-left: 1px;',
        ],
        'supplied longhand components should be added correctly');

    const property3 = new SDK.CSSProperty.CSSProperty(
        stubStyle, 1, 'margin', 'var(--margin)', false, false, true, false, 'margin: var(--margin)', undefined, []);
    assert.deepEqual(
        property3.getLonghandProperties().map(property => property.propertyText),
        [
          'margin-top: ;',
          'margin-right: ;',
          'margin-bottom: ;',
          'margin-left: ;',
        ],
        'locally added longhand components should be parsed with empty values');
  });

  it('should correctly disable CSS property', async () => {
    const stubStyle = {} as SDK.CSSStyleDeclaration.CSSStyleDeclaration;
    const setText = sinon.spy();

    const property =
        new SDK.CSSProperty.CSSProperty(stubStyle, 0, 'margin', '10px', false, false, true, false, 'margin: 10px');
    property.setText = setText;
    await property.setDisabled(true);
    assert.strictEqual(setText.firstCall.firstArg, '/* margin: 10px; */');

    const propertyWithComment = new SDK.CSSProperty.CSSProperty(
        stubStyle, 0, 'margin', '/* comment */ 10px', false, false, true, false, 'margin: /* comment */ 10px');
    propertyWithComment.setText = setText;
    await propertyWithComment.setDisabled(true);
    assert.strictEqual(setText.secondCall.firstArg, '/* margin:  10px; */');

    const propertyWithMultilineComment = new SDK.CSSProperty.CSSProperty(
        stubStyle, 0, 'margin', '/* com\nment */ 10px', false, false, true, false, 'margin: /* com\nment */ 10px');
    propertyWithMultilineComment.setText = setText;
    await propertyWithMultilineComment.setDisabled(true);
    assert.strictEqual(setText.thirdCall.firstArg, '/* margin:  10px; */');
  });
});
