// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from './sdk.js';

describe('CSSMetadata', () => {
  it('retrieves margin longhands', () => {
    const marginLonghands = SDK.CSSMetadata.cssMetadata().getLonghands('margin');
    assert.exists(marginLonghands);
    if (marginLonghands) {
      assert.deepEqual(marginLonghands.slice().sort(), ['margin-bottom', 'margin-left', 'margin-right', 'margin-top']);
    }
  });

  it('retrieves shorthands for margin-left', () => {
    const marginShorthands = SDK.CSSMetadata.cssMetadata().getShorthands('margin-left');
    assert.exists(marginShorthands);
    if (marginShorthands) {
      assert.deepEqual(marginShorthands.slice().sort(), ['all', 'margin']);
    }
  });

  it('identifies color-aware properties', () => {
    const cssMetadata = SDK.CSSMetadata.cssMetadata();
    assert.isTrue(cssMetadata.isColorAwareProperty('color'));
    assert.isTrue(cssMetadata.isColorAwareProperty('background-color'));
    assert.isFalse(cssMetadata.isColorAwareProperty('width'));
  });

  it('identifies custom properties', () => {
    const cssMetadata = SDK.CSSMetadata.cssMetadata();
    assert.isTrue(cssMetadata.isCustomProperty('--foo'));
    assert.isFalse(cssMetadata.isCustomProperty('color'));
  });

  it('returns canonical property name', () => {
    const cssMetadata = SDK.CSSMetadata.cssMetadata();
    assert.strictEqual(cssMetadata.canonicalPropertyName('-webkit-transition'), 'transition');
    assert.strictEqual(cssMetadata.canonicalPropertyName('color'), 'color');
  });

  it('identifies mixed-case color-aware properties case-insensitively', () => {
    const cssMetadata = SDK.CSSMetadata.cssMetadata();
    assert.isTrue(cssMetadata.isColorAwareProperty('CoLoR'));
    assert.isTrue(cssMetadata.isColorAwareProperty('bAckground-ColoR'));
    assert.isTrue(cssMetadata.isColorAwareProperty('BOX-SHADOW'));
    assert.isTrue(cssMetadata.isColorAwareProperty('Border-Top-Color'));
    assert.isFalse(cssMetadata.isColorAwareProperty('WiDtH'));
  });
});
