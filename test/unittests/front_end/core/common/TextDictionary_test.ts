// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';

const TextDictionary = Common.TextDictionary.TextDictionary;
const Trie = Common.Trie.Trie;

describe('Text Dictionary', () => {
  it('can be created with its basic attributes', () => {
    const textDic = new TextDictionary();
    assert.instanceOf(textDic.words, Map, 'did not create a Map named _words');
    assert.instanceOf(textDic.index, Trie, 'did not create a Trie named _index');
  });

  it('can add a word successfully', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    assert.isTrue(textDic.hasWord('test'), 'word was not added successfully');
  });

  it('can remove a word successfully', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    assert.isTrue(textDic.hasWord('test'), 'word was not added successfully');
    textDic.removeWord('test');
    assert.isFalse(textDic.hasWord('test'), 'word was not removed successfully');
  });

  it('returns nothing when trying to remove a word that does not exist', () => {
    const textDic = new TextDictionary();
    assert.isUndefined(
        textDic.removeWord('test'), 'removeWord function did not return Undefined for a word not in the dictionaty');
  });

  it('removes a word that was added twice', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    textDic.addWord('test');
    assert.isTrue(textDic.hasWord('test'), 'words were not added successfully');
    textDic.removeWord('test');
    assert.isTrue(textDic.hasWord('test'), 'both words were removed');
    textDic.removeWord('test');
    assert.isFalse(textDic.hasWord('test'), 'the second word was not removed successfully');
  });

  it('retrieve words with a certain prefix', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    textDic.addWord('ten');
    textDic.addWord('nine');
    const foundWords = textDic.wordsWithPrefix('te');
    assert.strictEqual(foundWords[0], 'test', 'first word was not retrieved');
    assert.strictEqual(foundWords[1], 'ten', 'second word was not retrieved');
  });

  it('retrieve the word count for a certain word', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    textDic.addWord('test');
    textDic.addWord('ten');
    assert.strictEqual(textDic.wordCount('test'), 2, 'word count is incorrect');
  });

  it('retrieve the word count for a certain word that is not in the dictionary', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    textDic.addWord('test');
    textDic.addWord('ten');
    assert.strictEqual(textDic.wordCount('testing'), 0, 'word count is incorrect');
  });

  it('reset the dictionary after adding words to it', () => {
    const textDic = new TextDictionary();
    textDic.addWord('test');
    textDic.addWord('test');
    textDic.addWord('ten');
    textDic.reset();
    assert.isFalse(textDic.hasWord('test'), 'first word still in the dictionary');
    assert.isFalse(textDic.hasWord('ten'), 'second word still in the dictionary');
    assert.strictEqual(textDic.wordCount('test'), 0, 'first word still has a count');
    assert.strictEqual(textDic.wordCount('ten'), 0, 'second word still has a count');
  });
});
