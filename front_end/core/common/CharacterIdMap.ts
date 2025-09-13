// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class CharacterIdMap<T> {
  readonly #elementToCharacter = new Map<T, string>();
  readonly #characterToElement = new Map<string, T>();
  #charCode = 33;

  toChar(object: T): string {
    let character = this.#elementToCharacter.get(object);
    if (!character) {
      if (this.#charCode >= 0xFFFF) {
        throw new Error('CharacterIdMap ran out of capacity!');
      }
      character = String.fromCharCode(this.#charCode++);
      this.#elementToCharacter.set(object, character);
      this.#characterToElement.set(character, object);
    }
    return character;
  }

  fromChar(character: string): T|null {
    const object = this.#characterToElement.get(character);
    if (object === undefined) {
      return null;
    }
    return object;
  }
}
