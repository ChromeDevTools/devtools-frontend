// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.SourceMapFactory}
 * @unrestricted
 */
Sass.SASSSourceMapFactory = class {
  constructor() {
    this._astService = new Sass.ASTService();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!SDK.SourceMap} sourceMap
   * @return {!Promise<?SDK.SourceMap>}
   */
  editableSourceMap(target, sourceMap) {
    var cssModel = target.model(SDK.CSSModel);
    if (!cssModel)
      return Promise.resolve(/** @type {?SDK.SourceMap} */ (null));

    var header =
        cssModel.styleSheetHeaders().find(styleSheetHeader => styleSheetHeader.sourceMapURL === sourceMap.url());
    if (!header)
      return Promise.resolve(/** @type {?SDK.SourceMap} */ (null));

    /** @type {!Map<string, !Sass.SASSSupport.AST>} */
    var models = new Map();
    var promises = [];
    for (let url of sourceMap.sourceURLs()) {
      var contentProvider = sourceMap.sourceContentProvider(url, Common.resourceTypes.SourceMapStyleSheet);
      var sassPromise = contentProvider.requestContent()
                            .then(text => this._astService.parseSCSS(url, text || ''))
                            .then(ast => models.set(ast.document.url, ast));
      promises.push(sassPromise);
    }
    var cssURL = sourceMap.compiledURL();
    var cssPromise = header.originalContentProvider()
                         .requestContent()
                         .then(text => this._astService.parseCSS(cssURL, text || ''))
                         .then(ast => models.set(ast.document.url, ast));
    promises.push(cssPromise);

    return Promise.all(promises)
        .then(this._onSourcesParsed.bind(this, sourceMap, models))
        .catchException(/** @type {?SDK.SourceMap} */ (null));
  }

  /**
   * @param {!SDK.SourceMap} sourceMap
   * @param {!Map<string, !Sass.SASSSupport.AST>} models
   * @return {?SDK.SourceMap}
   */
  _onSourcesParsed(sourceMap, models) {
    var editCallback = Sass.SASSProcessor.processCSSEdits.bind(Sass.SASSProcessor, this._astService);
    var map = new Sass.ASTSourceMap(sourceMap.compiledURL(), sourceMap.url(), models, editCallback);
    var valid = true;
    map.compiledModel().visit(onNode);
    return valid ? map : null;

    /**
     * @param {!Sass.SASSSupport.Node} cssNode
     */
    function onNode(cssNode) {
      if (!valid)
        return;
      if (!(cssNode instanceof Sass.SASSSupport.TextNode))
        return;
      var entry = sourceMap.findEntry(cssNode.range.startLine, cssNode.range.startColumn);
      if (!entry || !entry.sourceURL || typeof entry.sourceLineNumber === 'undefined' ||
          typeof entry.sourceColumnNumber === 'undefined')
        return;
      var sassAST = models.get(entry.sourceURL);
      if (!sassAST)
        return;
      var sassNode = sassAST.findNodeForPosition(entry.sourceLineNumber, entry.sourceColumnNumber);
      if (!sassNode)
        return;
      if (cssNode.parent && (cssNode.parent instanceof Sass.SASSSupport.Property) && cssNode === cssNode.parent.name &&
          cssNode.text.trim() !== sassNode.text.trim()) {
        valid = false;
        reportError(cssNode, sassNode);
        return;
      }
      map.addMapping(cssNode, sassNode);
    }

    /**
     * @param {!Sass.SASSSupport.TextNode} cssNode
     * @param {!Sass.SASSSupport.TextNode} sassNode
     */
    function reportError(cssNode, sassNode) {
      var text = Common.UIString('LiveSASS failed to start: %s', sourceMap.url());
      text += Common.UIString('\nSourceMap is misaligned: %s != %s', cssNode.text.trim(), sassNode.text.trim());
      text += '\ncompiled: ' + cssNode.document.url + ':' + (cssNode.range.startLine + 1) + ':' +
          (cssNode.range.startColumn + 1);
      text += '\nsource: ' + sassNode.document.url + ':' + (sassNode.range.startLine + 1) + ':' +
          (sassNode.range.startColumn + 1);
      Common.console.error(text);
    }
  }
};
