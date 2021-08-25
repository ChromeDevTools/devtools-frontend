// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

const {getPhysicalAxisFromQueryAxis, getQueryAxis, PhysicalAxis, QueryAxis} = SDK.CSSContainerQuery;

describe('CSSContainerQuery', () => {
  describe('getQueryAxis', () => {
    it('gets the query axis of no containment correctly', () => {
      assert.strictEqual(getQueryAxis(''), QueryAxis.None);
      assert.strictEqual(getQueryAxis('style layout'), QueryAxis.None);
    });

    it('gets the query axis of an inline container query correctly', () => {
      assert.strictEqual(getQueryAxis('inline-size layout style'), QueryAxis.Inline);
      assert.strictEqual(getQueryAxis('layout inline-size style inline-size'), QueryAxis.Inline);
    });

    it('gets the query axis of a block container query correctly', () => {
      assert.strictEqual(getQueryAxis('block-size layout style'), QueryAxis.Block);
      assert.strictEqual(getQueryAxis('layout block-size style block-size'), QueryAxis.Block);
    });

    it('gets the query axis of inline-block container query correctly', () => {
      assert.strictEqual(getQueryAxis('inline-size layout style block-size'), QueryAxis.Both);
      assert.strictEqual(getQueryAxis('layout size style'), QueryAxis.Both);
      assert.strictEqual(getQueryAxis('size'), QueryAxis.Both);
    });
  });

  describe('getPhysicalAxisFromQueryAxis', () => {
    it('gets the physical axis of no containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.None, 'horizontal-tb'), PhysicalAxis.None);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.None, 'vertical-lr'), PhysicalAxis.None);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.None, 'vertical-rl'), PhysicalAxis.None);
    });

    it('gets the physical axis of horizontal containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Inline, 'horizontal-tb'), PhysicalAxis.Horizontal);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Block, 'vertical-lr'), PhysicalAxis.Horizontal);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Block, 'vertical-rl'), PhysicalAxis.Horizontal);
    });

    it('gets the physical axis of vertical containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Block, 'horizontal-tb'), PhysicalAxis.Vertical);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Inline, 'vertical-lr'), PhysicalAxis.Vertical);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Inline, 'vertical-rl'), PhysicalAxis.Vertical);
    });

    it('gets the physical axis both-axes containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Both, 'horizontal-tb'), PhysicalAxis.Both);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Both, 'vertical-lr'), PhysicalAxis.Both);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.Both, 'vertical-rl'), PhysicalAxis.Both);
    });
  });
});
