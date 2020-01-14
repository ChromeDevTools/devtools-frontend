export default class CharacterIdMap{constructor(){this._elementToCharacter=new Map();this._characterToElement=new Map();this._charCode=33;}
toChar(object){let character=this._elementToCharacter.get(object);if(!character){if(this._charCode>=0xFFFF){throw new Error('CharacterIdMap ran out of capacity!');}
character=String.fromCharCode(this._charCode++);this._elementToCharacter.set(object,character);this._characterToElement.set(character,object);}
return character;}
fromChar(character){const object=this._characterToElement.get(character);if(object===undefined){return null;}
return object;}}
self.Common=self.Common||{};Common=Common||{};Common.CharacterIdMap=CharacterIdMap;