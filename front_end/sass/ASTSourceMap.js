// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.SourceMap}
 * @unrestricted
 */
Sass.ASTSourceMap = class {
  /**
   * @param {string} compiledURL
   * @param {string} sourceMapURL
   * @param {!Map<string, !Sass.SASSSupport.AST>} models
   * @param {?function(!Sass.ASTSourceMap, !Array<!Common.TextRange>, !Array<string>):!Promise<?SDK.SourceMap.EditResult>} editCallback
   */
  constructor(compiledURL, sourceMapURL, models, editCallback) {
    this._editCallback = editCallback;
    this._compiledURL = compiledURL;
    this._sourceMapURL = sourceMapURL;
    /** @type {!Map<string, !Sass.SASSSupport.AST>} */
    this._models = models;
    /** @type {!Map<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} */
    this._compiledToSource = new Map();
    /** @type {!Multimap<!Sass.SASSSupport.TextNode, !Sass.SASSSupport.TextNode>} */
    this._sourceToCompiled = new Multimap();
  }

  /**
   * @override
   * @return {string}
   */
  compiledURL() {
    return this._compiledURL;
  }

  /**
   * @override
   * @return {string}
   */
  url() {
    return this._sourceMapURL;
  }

  /**
   * @override
   * @return {!Array<string>}
   */
  sourceURLs() {
    return this._models.keysArray().filter(url => url !== this._compiledURL);
  }

  /**
   * @override
   * @param {string} sourceURL
   * @param {!Common.ResourceType} contentType
   * @return {!Common.ContentProvider}
   */
  sourceContentProvider(sourceURL, contentType) {
    var model = this.modelForURL(sourceURL);
    var sourceContent = model ? model.document.text.value() : '';
    return Common.StaticContentProvider.fromString(sourceURL, contentType, sourceContent);
  }

  /**
   * @override
   * @param {string} sourceURL
   * @return {?string}
   */
  embeddedContentByURL(sourceURL) {
    var model = this.modelForURL(sourceURL);
    return model ? model.document.text.value() : '';
  }

  /**
   * @override
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {?SDK.SourceMapEntry}
   */
  findEntry(lineNumber, columnNumber) {
    columnNumber = columnNumber || 0;
    var compiledNode = this.compiledModel().findNodeForPosition(lineNumber, columnNumber);
    if (!compiledNode)
      return null;
    var sourceNode = this.toSourceNode(compiledNode);
    if (!sourceNode)
      return null;
    return new SDK.SourceMapEntry(
        lineNumber, columnNumber, sourceNode.document.url, sourceNode.range.startLine, sourceNode.range.startColumn);
  }

  /**
   * @override
   * @return {boolean}
   */
  editable() {
    return !!this._editCallback;
  }

  /**
   * @override
   * @param {!Array<!Common.TextRange>} ranges
   * @param {!Array<string>} texts
   * @return {!Promise<?SDK.SourceMap.EditResult>}
   */
  editCompiled(ranges, texts) {
    return this._editCallback.call(null, this, ranges, texts);
  }

  /**
   * @return {!Sass.SASSSupport.AST}
   */
  compiledModel() {
    return /** @type {!Sass.SASSSupport.AST} */ (this._models.get(this._compiledURL));
  }

  /**
   * @return {!Map<string, !Sass.SASSSupport.AST>}
   */
  sourceModels() {
    var sourceModels = /** @type {!Map<string, !Sass.SASSSupport.AST>} */ (new Map(this._models));
    sourceModels.delete(this._compiledURL);
    return sourceModels;
  }

  /**
   * @return {!Map<string, !Sass.SASSSupport.AST>}
   */
  models() {
    return /** @type {!Map<string, !Sass.SASSSupport.AST>} */ (new Map(this._models));
  }

  /**
   * @param {string} url
   * @return {?Sass.SASSSupport.AST}
   */
  modelForURL(url) {
    return this._models.get(url) || null;
  }

  /**
   * @param {!Sass.SASSSupport.TextNode} compiled
   * @param {!Sass.SASSSupport.TextNode} source
   */
  addMapping(compiled, source) {
    this._compiledToSource.set(compiled, source);
    this._sourceToCompiled.set(source, compiled);
  }

  /**
   * @param {!Sass.SASSSupport.TextNode} compiled
   * @param {!Sass.SASSSupport.TextNode} source
   */
  removeMapping(compiled, source) {
    this._compiledToSource.delete(compiled);
    this._sourceToCompiled.remove(source, compiled);
  }

  /**
   * @param {!Sass.SASSSupport.TextNode} compiled
   * @return {?Sass.SASSSupport.TextNode}
   */
  toSourceNode(compiled) {
    return this._compiledToSource.get(compiled) || null;
  }

  /**
   * @param {!Sass.SASSSupport.TextNode} source
   * @return {!Array<!Sass.SASSSupport.TextNode>}
   */
  toCompiledNodes(source) {
    var compiledNodes = this._sourceToCompiled.get(source);
    return compiledNodes ? compiledNodes.valuesArray() : [];
  }

  /**
   * @param {!Array<!Sass.SASSSupport.AST>} updated
   * @param {!Map<!Sass.SASSSupport.Node, !Sass.SASSSupport.Node>=} outNodeMapping
   * @return {?Sass.ASTSourceMap}
   */
  rebase(updated, outNodeMapping) {
    outNodeMapping = outNodeMapping || new Map();
    outNodeMapping.clear();

    var models = /** @type {!Map<string, !Sass.SASSSupport.AST>} */ (new Map(this._models));
    for (var newAST of updated) {
      var oldAST = models.get(newAST.document.url);
      if (!oldAST.match(newAST, outNodeMapping))
        return null;
      models.set(newAST.document.url, newAST);
    }

    var newMap = new Sass.ASTSourceMap(this._compiledURL, this._sourceMapURL, models, this._editCallback);
    var compiledNodes = this._compiledToSource.keysArray();
    for (var i = 0; i < compiledNodes.length; ++i) {
      var compiledNode = compiledNodes[i];
      var sourceNode = /** @type {!Sass.SASSSupport.TextNode} */ (this._compiledToSource.get(compiledNode));
      var mappedCompiledNode =
          /** @type {!Sass.SASSSupport.TextNode} */ (outNodeMapping.get(compiledNode) || compiledNode);
      var mappedSourceNode =
          /** @type {!Sass.SASSSupport.TextNode} */ (outNodeMapping.get(sourceNode) || sourceNode);
      newMap.addMapping(mappedCompiledNode, mappedSourceNode);
    }
    return newMap;
  }
};
