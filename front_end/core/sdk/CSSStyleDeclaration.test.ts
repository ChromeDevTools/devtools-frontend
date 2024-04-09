// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

function assertPropertValues<T>(object: T, expectedKeyValuePairs: [key: string, value: unknown][]): void {
  for (const [key, value] of expectedKeyValuePairs) {
    assert.propertyVal(object, key, value);
  }
}

describeWithMockConnection('CSSStyleDeclaration', () => {
  it('should correctly construct new CSSStyleDeclaration', () => {
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const stubCSSStyle = {
      styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
      cssProperties: [
        {
          name: 'margin',
          value: '1px',
          disabled: false,
          implicit: false,
          longhandProperties: [
            {name: 'margin-top', value: '1px'},
            {name: 'margin-right', value: '1px'},
            {name: 'margin-bottom', value: '1px'},
            {name: 'margin-left', value: '1px'},
          ],
          range: {startLine: 1, startColumn: 4, endLine: 1, endColumn: 16},
          text: 'margin: 1px;',
        },
        {
          name: 'margin-top',
          value: '5px',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 2, startColumn: 4, endLine: 2, endColumn: 20},
          text: 'margin-top: 5px;',
        },
      ],
      shorthandEntries: [],
      cssText: '\n    margin: 1px;\n    margin-top: 5px;\n',
      range: {startLine: 0, startColumn: 0, endLine: 3, endColumn: 0},
    } as Protocol.CSS.CSSStyle;

    const style = new SDK.CSSStyleDeclaration.CSSStyleDeclaration(
        cssModel, null, stubCSSStyle, SDK.CSSStyleDeclaration.Type.Regular);
    assertPropertValues(style.allProperties()[0], [
      ['name', 'margin'],
      ['value', '1px'],
      ['implicit', false],
      ['index', 0],
    ]);
    assert.strictEqual(style.allProperties()[0].activeInStyle(), true);

    assertPropertValues(style.allProperties()[1], [
      ['name', 'margin-top'],
      ['value', '5px'],
      ['implicit', false],
      ['index', 1],
    ]);
    assert.strictEqual(style.allProperties()[1].activeInStyle(), true);

    assertPropertValues(style.allProperties()[2], [
      ['name', 'margin-top'],
      ['value', '1px'],
      ['implicit', true],
      ['index', 2],
    ]);
    assert.strictEqual(style.allProperties()[2].activeInStyle(), false);

    assertPropertValues(style.allProperties()[3], [
      ['name', 'margin-right'],
      ['value', '1px'],
      ['implicit', true],
      ['index', 3],
    ]);
    assert.strictEqual(style.allProperties()[3].activeInStyle(), true);

    assertPropertValues(style.allProperties()[4], [
      ['name', 'margin-bottom'],
      ['value', '1px'],
      ['implicit', true],
      ['index', 4],
    ]);
    assert.strictEqual(style.allProperties()[4].activeInStyle(), true);

    assertPropertValues(style.allProperties()[5], [
      ['name', 'margin-left'],
      ['value', '1px'],
      ['implicit', true],
      ['index', 5],
    ]);
    assert.strictEqual(style.allProperties()[5].activeInStyle(), true);
  });

  it('should correctly compute active and inactive declarations', () => {
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const stubCSSStyle = {
      styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
      cssProperties: [
        {
          name: 'margin-top',
          value: '5px',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 1, startColumn: 4, endLine: 1, endColumn: 20},
          text: 'margin-top: 5px;',
        },
        {
          name: 'margin',
          value: '1px',
          disabled: false,
          implicit: false,
          longhandProperties: [
            {name: 'margin-top', value: '1px'},
            {name: 'margin-right', value: '1px'},
            {name: 'margin-bottom', value: '1px'},
            {name: 'margin-left', value: '1px'},
          ],
          range: {startLine: 2, startColumn: 4, endLine: 2, endColumn: 16},
          text: 'margin: 1px;',
        },
        {
          name: 'margin-left',
          value: '30px',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 3, startColumn: 4, endLine: 3, endColumn: 22},
          text: 'margin-left: 30px;',
        },
        {
          name: 'margin',
          value: '42px',
          disabled: true,
          longhandProperties: [
            {name: 'margin-top', value: '42px'},
            {name: 'margin-right', value: '42px'},
            {name: 'margin-bottom', value: '42px'},
            {name: 'margin-left', value: '42px'},
          ],
          range: {startLine: 4, startColumn: 4, endLine: 4, endColumn: 23},
          text: '/* margin: 42px; */',
        },
        {
          name: 'margin-top',
          value: '35px',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 5, startColumn: 4, endLine: 5, endColumn: 21},
          text: 'margin-top: 35px;',
        },
      ],
      shorthandEntries: [],
      cssText:
          '\n    margin-top: 5px;\n    margin: 1px;\n    margin-left: 30px;\n    /* margin: 42px; */\n    margin-top: 35px;\n',
      range: {startLine: 0, startColumn: 0, endLine: 6, endColumn: 0},
    } as Protocol.CSS.CSSStyle;

    const style = new SDK.CSSStyleDeclaration.CSSStyleDeclaration(
        cssModel, null, stubCSSStyle, SDK.CSSStyleDeclaration.Type.Regular);
    assert.strictEqual(style.getPropertyValue('margin'), '1px');
    assert.strictEqual(style.getPropertyValue('margin-top'), '35px');
    assert.strictEqual(style.getPropertyValue('margin-right'), '1px');
    assert.strictEqual(style.getPropertyValue('margin-bottom'), '1px');
    assert.strictEqual(style.getPropertyValue('margin-left'), '30px');
  });

  it('correclty computes inactive variable properties in the presence of properties that failed to parse', () => {
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const stubCSSStyle = {
      styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
      cssProperties: [
        {
          name: '--a',
          value: '5px',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 1, startColumn: 4, endLine: 1, endColumn: 20},
          text: '--a 5px;',
        },
        {
          name: '--a',
          value: '10',
          disabled: false,
          implicit: false,
          parsedOk: false,
          longhandProperties: [],
          range: {startLine: 1, startColumn: 4, endLine: 1, endColumn: 20},
          text: '--a 10;',
        },
      ],
      shorthandEntries: [],
      cssText: '\n    --a: 5px;\n    --a: 10\n',
    } as Protocol.CSS.CSSStyle;

    const style = new SDK.CSSStyleDeclaration.CSSStyleDeclaration(
        cssModel, null, stubCSSStyle, SDK.CSSStyleDeclaration.Type.Regular);
    assert.isFalse(style.hasActiveProperty('--a'));
  });

  it('should use ranged declaration as the active one', () => {
    const target = createTarget();
    const cssModel = new SDK.CSSModel.CSSModel(target);
    const stubCSSStyle = {
      styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
      cssProperties: [
        {
          name: '-webkit-background-clip',
          value: 'border-box',
          disabled: false,
          implicit: false,
          longhandProperties: [],
          range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 36},
          text: '-webkit-background-clip: border-box;',
        },
        {
          name: 'background-clip',
          value: 'border-box',
        },
      ],
      shorthandEntries: [],
      cssText: '-webkit-background-clip: border-box;',
      range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 36},
    } as Protocol.CSS.CSSStyle;

    const style = new SDK.CSSStyleDeclaration.CSSStyleDeclaration(
        cssModel, null, stubCSSStyle, SDK.CSSStyleDeclaration.Type.Regular);
    assert.strictEqual(style.allProperties().length, 1);
    assertPropertValues(style.allProperties()[0], [
      ['name', '-webkit-background-clip'],
      ['value', 'border-box'],
      ['implicit', false],
      ['index', 0],
    ]);
    assert.strictEqual(style.getPropertyValue('-webkit-background-clip'), 'border-box');
  });
});
