// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {CharacterIdMap} from '../../../../front_end/common/CharacterIdMap.js';

describe('CharacterIdMap class', () => {
  it('is able to be instantiated successfully', () => {
    const characterIdMap = new CharacterIdMap();
    assert.instanceOf(characterIdMap._elementToCharacter, Map, 'elementToCharacter is not of type Map');
    assert.instanceOf(characterIdMap._characterToElement, Map, 'characterToElement is not of type Map');
    assert.equal(characterIdMap._charCode, 33, 'charCode is not equal to 33');
  });

  it('is able to convert an element to a character', () => {
    const testElement = document.createElement('p');
    const characterIdMap = new CharacterIdMap();
    assert.equal(characterIdMap.toChar(testElement), '!', 'element was not converted correctly');
  });

  it('is able to convert a character to an element', () => {
    const testElement = document.createElement('p');
    const characterIdMap = new CharacterIdMap();
    assert.equal(characterIdMap.toChar(testElement), '!', 'element was not converted correctly');
    assert.equal(characterIdMap.fromChar('!'), testElement, 'character was not converted correctly');
  });

  it('returns the same character when trying to convert an element that was already converted', () => {
    const testElement = document.createElement('p');
    const characterIdMap = new CharacterIdMap();
    assert.equal(characterIdMap.toChar(testElement), '!', 'element was not converted correctly');
    assert.equal(characterIdMap.toChar(testElement), '!', 'element was not converted correctly');
  });

  it('throws an error when trying to convert a number when there is no capacity left', () => {
    const characterIdMap = new CharacterIdMap();
    for (let index = 0; index < 65502; index++) {
      const el = document.createElement('div');
      el.setAttribute('id', 'Div' + index);
      characterIdMap.toChar(el);
    }
    const testElement = document.createElement('p');
    assert.throws(() => characterIdMap.toChar(testElement), 'CharacterIdMap ran out of capacity!');
  });

  it('returns null when trying to convert  a character that does not exist in the Map', () => {
    const characterIdMap = new CharacterIdMap();
    assert.equal(characterIdMap.fromChar('!'), null, 'character was not converted correctly');
  });
});
