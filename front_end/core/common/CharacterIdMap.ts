// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export class CharacterIdMap<T> {
  _elementToCharacter: Map<T, string>;
  _characterToElement: Map<string, T>;
  _charCode: number;

  constructor() {
    this._elementToCharacter = new Map();
    this._characterToElement = new Map();
    this._charCode = 33;
  }

  toChar(object: T): string {
    let character = this._elementToCharacter.get(object);
    if (!character) {
      if (this._charCode >= 0xFFFF) {
        throw new Error('CharacterIdMap ran out of capacity!');
      }
      character = String.fromCharCode(this._charCode++);
      this._elementToCharacter.set(object, character);
      this._characterToElement.set(character, object);
    }
    return character;
  }

  fromChar(character: string): T|null {
    const object = this._characterToElement.get(character);
    if (object === undefined) {
      return null;
    }
    return object;
  }
}
