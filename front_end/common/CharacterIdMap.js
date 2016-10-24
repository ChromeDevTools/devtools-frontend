// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @template T
 */
WebInspector.CharacterIdMap = function()
{
    /** @type {!Map<T, string>} */
    this._elementToCharacter = new Map();
    /** @type {!Map<string, T>} */
    this._characterToElement = new Map();
    this._charCode = 33;
};

WebInspector.CharacterIdMap.prototype = {
    /**
     * @param {T} object
     * @return {string}
     */
    toChar: function(object)
    {
        var character = this._elementToCharacter.get(object);
        if (!character) {
            if (this._charCode >= 0xFFFF)
                throw new Error("CharacterIdMap ran out of capacity!");
            character = String.fromCharCode(this._charCode++);
            this._elementToCharacter.set(object, character);
            this._characterToElement.set(character, object);
        }
        return character;
    },

    /**
     * @param {string} character
     * @return {?T}
     */
    fromChar: function(character)
    {
        return this._characterToElement.get(character) || null;
    }
};
