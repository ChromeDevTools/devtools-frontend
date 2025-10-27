"use strict";
export class CharacterIdMap {
  #elementToCharacter = /* @__PURE__ */ new Map();
  #characterToElement = /* @__PURE__ */ new Map();
  #charCode = 33;
  toChar(object) {
    let character = this.#elementToCharacter.get(object);
    if (!character) {
      if (this.#charCode >= 65535) {
        throw new Error("CharacterIdMap ran out of capacity!");
      }
      character = String.fromCharCode(this.#charCode++);
      this.#elementToCharacter.set(object, character);
      this.#characterToElement.set(character, object);
    }
    return character;
  }
  fromChar(character) {
    const object = this.#characterToElement.get(character);
    if (object === void 0) {
      return null;
    }
    return object;
  }
}
//# sourceMappingURL=CharacterIdMap.js.map
