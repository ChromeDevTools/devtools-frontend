// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../generated/protocol.js';

import * as EmulationUtils from './utils.js';

const UserAgentMetadata = EmulationUtils.UserAgentMetadata;

const errParse = 'syntax error';
const errStruct = 'data form error';

function assertNotError(result: Protocol.Emulation.UserAgentBrandVersion[]|
                        string): Protocol.Emulation.UserAgentBrandVersion[] {
  if (typeof result === 'string') {
    assert.fail('Unexpected error');
    return [];
  }
  return result;
}

function assertError(result: Protocol.Emulation.UserAgentBrandVersion[]|string, expectedError: string): void {
  if (typeof result !== 'string') {
    assert.fail('Expected error, but got result');
    return;
  }
  assert.strictEqual(result, expectedError);
}

describe('UserAgentMetadata', () => {
  describe('parseBrandsList', () => {
    it('Parses a good example', () => {
      const result = UserAgentMetadata.parseBrandsList('"Chromium";v="42", "Ferrum"; v="42.a"', errParse, errStruct);
      const items = assertNotError(result);
      assert.lengthOf(items, 2);
      assert.strictEqual(items[0].brand, 'Chromium');
      assert.strictEqual(items[0].version, '42');
      assert.strictEqual(items[1].brand, 'Ferrum');
      assert.strictEqual(items[1].version, '42.a');
    });
    it('Parses empty list', () => {
      const result = UserAgentMetadata.parseBrandsList('', errParse, errStruct);
      const items = assertNotError(result);
      assert.lengthOf(items, 0);
    });
    it('Handles parse errors', () => {
      const result = UserAgentMetadata.parseBrandsList('"Chro', errParse, errStruct);
      assertError(result, errParse);
    });
    it('Handles data model errors', () => {
      const r1 = UserAgentMetadata.parseBrandsList('"Chromium"', errParse, errStruct);
      assertError(r1, errStruct);

      const r2 = UserAgentMetadata.parseBrandsList('Chromium; v="42"', errParse, errStruct);
      assertError(r2, errStruct);

      const r3 = UserAgentMetadata.parseBrandsList('"Chromium"; v="42"; q="huh"', errParse, errStruct);
      assertError(r3, errStruct);

      const r4 = UserAgentMetadata.parseBrandsList('"Chromium"; v=42', errParse, errStruct);
      assertError(r4, errStruct);

      const r5 = UserAgentMetadata.parseBrandsList('"Chromium"; q="42"', errParse, errStruct);
      assertError(r5, errStruct);

      const r6 = UserAgentMetadata.parseBrandsList('("Chromium" "Ferrum"); v="42"', errParse, errStruct);
      assertError(r6, errStruct);
    });
  });
  describe('serializeBrandsList', () => {
    it('Serializes a good example', () => {
      const result = UserAgentMetadata.serializeBrandsList(
          [{brand: 'Chromium', version: '42'}, {brand: 'Ferrum', version: '42.a'}]);
      assert.strictEqual(result, '"Chromium";v="42", "Ferrum";v="42.a"');
    });
    it('Character restrictions apply', () => {
      const result = UserAgentMetadata.serializeBrandsList(
          [{brand: 'Chromium', version: '42'}, {brand: 'Феррум', version: '42.a'}]);
      assert.strictEqual(result, '');
    });
  });
  describe('validateAsStructuredHeadersString', () => {
    it('Accepts valid value', () => {
      const result = UserAgentMetadata.validateAsStructuredHeadersString('Android', errParse);
      assert.isTrue(result.valid);
    });
    it('Rejects an invalid value', () => {
      const result = UserAgentMetadata.validateAsStructuredHeadersString('не АСКІІ', errParse);
      assert.isFalse(result.valid);
      assert.strictEqual(result.errorMessage, errParse);
    });
  });
});
