// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';

describe('preciseMillisToString', () => {
  it('formats without a given precision', () => {
    const inputNumber = 7.84;
    const outputString = i18n.TimeUtilities.preciseMillisToString(inputNumber);
    assert.strictEqual(outputString, '8\xA0ms');
  });

  it('formats without a given precision', () => {
    const inputNumber = 7.84;
    const precision = 2;
    const outputString = i18n.TimeUtilities.preciseMillisToString(inputNumber, precision);
    assert.strictEqual(outputString, '7.84\xA0ms');
  });
});

describe('millisToString', () => {
  it('formats when number is infinite', () => {
    const inputNumber = Infinity;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '-');
  });

  it('formats when number is zero', () => {
    const inputNumber = 0;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '0');
  });

  it('formats with higher resolution and a number less that 0.1', () => {
    const inputNumber = 0.01;
    const higherResolution = true;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '10\xA0μs');
  });

  it('formats with higher resolution and a number less that 1000', () => {
    const inputNumber = 897.98;
    const higherResolution = true;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '897.98\xA0ms');
  });

  it('formats without higher resolution and a number less that 1000', () => {
    const inputNumber = 897.98;
    const higherResolution = false;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '898\xA0ms');
  });

  it('formats less than 60 seconds', () => {
    const inputNumber = 12345;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '12.35\xA0s');
  });

  it('formats less than 60 minutes', () => {
    const inputNumber = 265000;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '4.4\xA0min');
  });

  it('formats less than 24 hours', () => {
    const inputNumber = 20000000;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '5.6\xA0hrs');
  });

  it('formats days', () => {
    const inputNumber = 100000000;
    const outputString = i18n.TimeUtilities.millisToString(inputNumber);
    assert.strictEqual(outputString, '1.2\xA0days');
  });
});

describe('secondsToString', () => {
  it('formats infinte numbers correctly', () => {
    const inputNumber = Infinity;
    const outputString = i18n.TimeUtilities.secondsToString(inputNumber);
    assert.strictEqual(outputString, '-');
  });

  it('formats finite numbers correctly', () => {
    const inputNumber = 7.849;
    const outputString = i18n.TimeUtilities.secondsToString(inputNumber);
    assert.strictEqual(outputString, '7.85\xA0s');
  });
});
