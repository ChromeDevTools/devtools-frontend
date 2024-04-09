// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Elements from './elements.js';

describeWithEnvironment('StylePropertyUtils', () => {
  it('convert CSS declaration to JS property', () => {
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: 'display', value: 'flex'} as SDK.CSSProperty.CSSProperty),
        'display: \'flex\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: 'box-sizing', value: 'border-box'} as SDK.CSSProperty.CSSProperty),
        'boxSizing: \'border-box\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: 'background-color', value: 'var(--color-background-elevation-1)'} as SDK.CSSProperty.CSSProperty),
        'backgroundColor: \'var(--color-background-elevation-1)\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: '--monospace-font-size', value: '12px'} as SDK.CSSProperty.CSSProperty),
        '\'--monospace-font-size\': \'12px\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: 'mask-position', value: 'bottom'} as SDK.CSSProperty.CSSProperty),
        'maskPosition: \'bottom\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: '-webkit-mask-position', value: 'bottom'} as SDK.CSSProperty.CSSProperty),
        'WebkitMaskPosition: \'bottom\'');
    assert.strictEqual(
        Elements.StylePropertyUtils.getCssDeclarationAsJavascriptProperty(
            {name: 'background-image', value: 'url("paper.gif")'} as SDK.CSSProperty.CSSProperty),
        'backgroundImage: \'url("paper.gif")\'');
  });
});
