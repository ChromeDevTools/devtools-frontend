/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Snippets.SnippetStorage = class extends Common.Object {
  constructor(settingPrefix, namePrefix) {
    super();
    /** @type {!Map<string,!Snippets.Snippet>} */
    this._snippets = new Map();

    this._lastSnippetIdentifierSetting = Common.settings.createSetting(settingPrefix + 'Snippets_lastIdentifier', 0);
    this._snippetsSetting = Common.settings.createSetting(settingPrefix + 'Snippets', []);
    this._namePrefix = namePrefix;

    this._loadSettings();
  }

  get namePrefix() {
    return this._namePrefix;
  }

  _saveSettings() {
    var savedSnippets = [];
    for (var snippet of this._snippets.values())
      savedSnippets.push(snippet.serializeToObject());
    this._snippetsSetting.set(savedSnippets);
  }

  /**
   * @return {!Array<!Snippets.Snippet>}
   */
  snippets() {
    return this._snippets.valuesArray();
  }

  /**
   * @param {string} id
   * @return {?Snippets.Snippet}
   */
  snippetForId(id) {
    return this._snippets.get(id);
  }

  /**
   * @param {string} name
   * @return {?Snippets.Snippet}
   */
  snippetForName(name) {
    for (var snippet of this._snippets.values()) {
      if (snippet.name === name)
        return snippet;
    }
    return null;
  }

  _loadSettings() {
    var savedSnippets = this._snippetsSetting.get();
    for (var i = 0; i < savedSnippets.length; ++i)
      this._snippetAdded(Snippets.Snippet.fromObject(this, savedSnippets[i]));
  }

  /**
   * @param {!Snippets.Snippet} snippet
   */
  deleteSnippet(snippet) {
    this._snippets.delete(snippet.id);
    this._saveSettings();
  }

  /**
   * @return {!Snippets.Snippet}
   */
  createSnippet() {
    var nextId = this._lastSnippetIdentifierSetting.get() + 1;
    var snippetId = String(nextId);
    this._lastSnippetIdentifierSetting.set(nextId);
    var snippet = new Snippets.Snippet(this, snippetId);
    this._snippetAdded(snippet);
    this._saveSettings();
    return snippet;
  }

  /**
   * @param {!Snippets.Snippet} snippet
   */
  _snippetAdded(snippet) {
    this._snippets.set(snippet.id, snippet);
  }
};

/**
 * @unrestricted
 */
Snippets.Snippet = class extends Common.Object {
  /**
   * @param {!Snippets.SnippetStorage} storage
   * @param {string} id
   * @param {string=} name
   * @param {string=} content
   */
  constructor(storage, id, name, content) {
    super();
    this._storage = storage;
    this._id = id;
    this._name = name || storage.namePrefix + id;
    this._content = content || '';
  }

  /**
   * @param {!Snippets.SnippetStorage} storage
   * @param {!Object} serializedSnippet
   * @return {!Snippets.Snippet}
   */
  static fromObject(storage, serializedSnippet) {
    return new Snippets.Snippet(storage, serializedSnippet.id, serializedSnippet.name, serializedSnippet.content);
  }

  /**
   * @return {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  get name() {
    return this._name;
  }

  /**
   * @param {string} name
   */
  set name(name) {
    if (this._name === name)
      return;

    this._name = name;
    this._storage._saveSettings();
  }

  /**
   * @return {string}
   */
  get content() {
    return this._content;
  }

  /**
   * @param {string} content
   */
  set content(content) {
    if (this._content === content)
      return;

    this._content = content;
    this._storage._saveSettings();
  }

  /**
   * @return {!Object}
   */
  serializeToObject() {
    var serializedSnippet = {};
    serializedSnippet.id = this.id;
    serializedSnippet.name = this.name;
    serializedSnippet.content = this.content;
    return serializedSnippet;
  }
};
