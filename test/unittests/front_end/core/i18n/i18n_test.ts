// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';

describe('serializeUIString', () => {
  it('serializes strings without placeholders', () => {
    const output = i18n.i18n.serializeUIString('foo');
    assert.deepEqual(output, JSON.stringify({
      string: 'foo',
      values: {},
    }));
  });

  it('serializes strings with placeholder values', () => {
    const output = i18n.i18n.serializeUIString('a string', {PH1: 'value1', PH2: 'value2'});
    assert.deepEqual(output, JSON.stringify({
      string: 'a string',
      values: {PH1: 'value1', PH2: 'value2'},
    }));
  });
});

describe('deserializeUIString', () => {
  it('returns an empty object for an empty string input', () => {
    const output = i18n.i18n.deserializeUIString('');
    assert.deepEqual(output, {string: '', values: {}});
  });

  it('deserializes correctly for a string with no placeholders', () => {
    const output = i18n.i18n.deserializeUIString('{"string":"foo", "values":{}}');
    assert.deepEqual(output, {string: 'foo', values: {}});
  });

  it('deserializes correctly for a string with placeholders', () => {
    const output = i18n.i18n.deserializeUIString('{"string":"foo", "values":{"PH1": "value1"}}');
    assert.deepEqual(output, {string: 'foo', values: {PH1: 'value1'}});
  });
});

describe('serialize/deserialize round-trip', () => {
  it('returns a matching input/output', () => {
    const inputString = 'a string';
    const serializedString = i18n.i18n.serializeUIString(inputString);
    const deserializedString = i18n.i18n.deserializeUIString(serializedString);
    assert.deepEqual(deserializedString, {
      string: inputString,
      values: {},
    });
  });
});

describe('getLocalizedLanguageRegion', () => {
  it('build the correct language/region string', () => {
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('de-AT', {locale: 'en-US'}), 'German (Austria) - Deutsch (Österreich)');
    assert.strictEqual(i18n.i18n.getLocalizedLanguageRegion('de', {locale: 'en-US'}), 'German - Deutsch');
    assert.strictEqual(i18n.i18n.getLocalizedLanguageRegion('en-US', {locale: 'de'}), 'Englisch (USA) - English (US)');
  });

  it('uses english for the target locale if the languages match', () => {
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('de-AT', {locale: 'de'}), 'Deutsch (Österreich) - German (Austria)');
    assert.strictEqual(i18n.i18n.getLocalizedLanguageRegion('de', {locale: 'de'}), 'Deutsch - German');
  });
});

describe('preciseMillisToString', () => {
  it('formats without a given precision', () => {
    const inputNumber = 7.84;
    const outputString = i18n.i18n.preciseMillisToString(inputNumber);
    assert.strictEqual(outputString, '8\xA0ms');
  });

  it('formats without a given precision', () => {
    const inputNumber = 7.84;
    const precision = 2;
    const outputString = i18n.i18n.preciseMillisToString(inputNumber, precision);
    assert.strictEqual(outputString, '7.84\xA0ms');
  });
});

describe('millisToString', () => {
  it('formats when number is infinite', () => {
    const inputNumber = Infinity;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '-');
  });

  it('formats when number is zero', () => {
    const inputNumber = 0;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '0');
  });

  it('formats with higher resolution and a number less that 0.1', () => {
    const inputNumber = 0.01;
    const higherResolution = true;
    const outputString = i18n.i18n.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '10\xA0μs');
  });

  it('formats with higher resolution and a number less that 1000', () => {
    const inputNumber = 897.98;
    const higherResolution = true;
    const outputString = i18n.i18n.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '897.98\xA0ms');
  });

  it('formats without higher resolution and a number less that 1000', () => {
    const inputNumber = 897.98;
    const higherResolution = false;
    const outputString = i18n.i18n.millisToString(inputNumber, higherResolution);
    assert.strictEqual(outputString, '898\xA0ms');
  });

  it('formats less than 60 seconds', () => {
    const inputNumber = 12345;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '12.35\xA0s');
  });

  it('formats less than 60 minutes', () => {
    const inputNumber = 265000;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '4.4\xA0min');
  });

  it('formats less than 24 hours', () => {
    const inputNumber = 20000000;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '5.6\xA0hrs');
  });

  it('formats days', () => {
    const inputNumber = 100000000;
    const outputString = i18n.i18n.millisToString(inputNumber);
    assert.strictEqual(outputString, '1.2\xA0days');
  });
});

describe('secondsToString', () => {
  it('formats infinte numbers correctly', () => {
    const inputNumber = Infinity;
    const outputString = i18n.i18n.secondsToString(inputNumber);
    assert.strictEqual(outputString, '-');
  });

  it('formats finite numbers correctly', () => {
    const inputNumber = 7.849;
    const outputString = i18n.i18n.secondsToString(inputNumber);
    assert.strictEqual(outputString, '7.85\xA0s');
  });
});
