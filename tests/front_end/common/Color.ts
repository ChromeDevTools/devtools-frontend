// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import { default as Color } from '../../../front_end/common/Color.js';

describe('Color', () => {
  describe('parse', () => {
    it('parses hex values', () => {
      assert.deepEqual(Color.parse('#FF00FF').rgba(), [1, 0, 1, 1]);
      assert.deepEqual(Color.parse('#F0F').rgba(), [1, 0, 1, 1]);
      assert.deepEqual(Color.parse('#F0F0').rgba(), [1, 0, 1, 0]);
      assert.deepEqual(Color.parse('#FF00FF00').rgba(), [1, 0, 1, 0]);
    });

    it('parses nickname values', () => {
      assert.deepEqual(Color.parse('red').rgba(), [1, 0, 0, 1]);
    });

    it('parses rgb(a) values', () => {
      const colorOne = Color.parse('rgb(255, 255, 0)');
      assert.deepEqual(colorOne.rgba(), [1, 1, 0, 1]);

      const colorTwo = Color.parse('rgba(0, 255, 255, 0.5)');
      assert.deepEqual(colorTwo.rgba(), [0, 1, 1, 0.5]);

      const colorThree = Color.parse('rgb(255 255 255)');
      assert.deepEqual(colorThree.rgba(), [1, 1, 1, 1]);

      const colorFour = Color.parse('rgb(10% 10% 10%)');
      assert.deepEqual(colorFour.rgba(), [0.1, 0.1, 0.1, 1]);

      const colorFive = Color.parse('rgb(10% 10% 10% / 0.4)');
      assert.deepEqual(colorFive.rgba(), [0.1, 0.1, 0.1, 0.4]);
    });

    it('parses hsl(a) values', () => {
      const colorOne = Color.parse('hsl(0, 100%, 50%)');
      assert.deepEqual(colorOne.rgba(), [1, 0, 0, 1]);

      const colorTwo = Color.parse('hsla(0, 100%, 50%, 0.5)');
      assert.deepEqual(colorTwo.rgba(), [1, 0, 0, 0.5]);

      const colorThree = Color.parse('hsla(50deg 100% 100% / 50%)');
      assert.deepEqual(colorThree.rgba(), [1, 1, 1, 0.5]);
    });

    it('handles invalid values', () => {
      assert.isNull(Color.parse('#FAFAFA       Trailing'));
      assert.isNull(Color.parse('#FAFAFG'));
      assert.isNull(Color.parse('gooseberry'));
      assert.isNull(Color.parse('rgb(10% 10% 10% /)'));
      assert.isNull(Color.parse('rgb(10% 10% 10% 0.4 40)'));
      assert.isNull(Color.parse('hsl(0, carrot, 30%)'));
      assert.isNull(Color.parse('hsl(0)'));
      assert.isNull(Color.parse('rgb(255)'));
      assert.isNull(Color.parse('rgba(1 golf 30)'));
    });
  });
});
