// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from './sdk.js';

const {getPhysicalAxisFromQueryAxis, getQueryAxisFromContainerType, PhysicalAxis, QueryAxis} = SDK.CSSContainerQuery;

describe('CSSContainerQuery', () => {
  describe('getQueryAxisFromContainerType', () => {
    it('gets the query axis of no container-type correctly', () => {
      assert.strictEqual(getQueryAxisFromContainerType(''), QueryAxis.NONE);
      assert.strictEqual(getQueryAxisFromContainerType('normal'), QueryAxis.NONE);
    });

    it('gets the query axis of an inline container query correctly', () => {
      assert.strictEqual(getQueryAxisFromContainerType('inline-size'), QueryAxis.INLINE);
      assert.strictEqual(getQueryAxisFromContainerType('scroll-state inline-size'), QueryAxis.INLINE);
    });

    it('gets the query axis of size container query correctly', () => {
      assert.strictEqual(getQueryAxisFromContainerType('size'), QueryAxis.BOTH);
      assert.strictEqual(getQueryAxisFromContainerType('scroll-state size'), QueryAxis.BOTH);
    });
  });

  describe('getPhysicalAxisFromQueryAxis', () => {
    it('gets the physical axis of no containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.NONE, 'horizontal-tb'), PhysicalAxis.NONE);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.NONE, 'vertical-lr'), PhysicalAxis.NONE);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.NONE, 'vertical-rl'), PhysicalAxis.NONE);
    });

    it('gets the physical axis of horizontal containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.INLINE, 'horizontal-tb'), PhysicalAxis.HORIZONTAL);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BLOCK, 'vertical-lr'), PhysicalAxis.HORIZONTAL);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BLOCK, 'vertical-rl'), PhysicalAxis.HORIZONTAL);
    });

    it('gets the physical axis of vertical containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BLOCK, 'horizontal-tb'), PhysicalAxis.VERTICAL);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.INLINE, 'vertical-lr'), PhysicalAxis.VERTICAL);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.INLINE, 'vertical-rl'), PhysicalAxis.VERTICAL);
    });

    it('gets the physical axis both-axes containment correctly', () => {
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BOTH, 'horizontal-tb'), PhysicalAxis.BOTH);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BOTH, 'vertical-lr'), PhysicalAxis.BOTH);
      assert.strictEqual(getPhysicalAxisFromQueryAxis(QueryAxis.BOTH, 'vertical-rl'), PhysicalAxis.BOTH);
    });
  });
});
