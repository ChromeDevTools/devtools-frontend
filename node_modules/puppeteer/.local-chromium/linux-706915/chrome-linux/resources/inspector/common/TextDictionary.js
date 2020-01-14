export default class TextDictionary{constructor(){this._words=new Map();this._index=new Common.Trie();}
addWord(word){let count=this._words.get(word)||0;++count;this._words.set(word,count);this._index.add(word);}
removeWord(word){let count=this._words.get(word)||0;if(!count){return;}
if(count===1){this._words.delete(word);this._index.remove(word);return;}
--count;this._words.set(word,count);}
wordsWithPrefix(prefix){return this._index.words(prefix);}
hasWord(word){return this._words.has(word);}
wordCount(word){return this._words.get(word)||0;}
reset(){this._words.clear();this._index.clear();}}
self.Common=self.Common||{};Common=Common||{};Common.TextDictionary=TextDictionary;