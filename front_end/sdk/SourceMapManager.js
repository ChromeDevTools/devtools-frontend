// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @template T
 */
SDK.SourceMapManager = class extends SDK.SDKObject {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    this._isEnabled = true;

    /** @type {!Map<!T, string>} */
    this._relativeSourceURL = new Map();
    /** @type {!Map<!T, string>} */
    this._relativeSourceMapURL = new Map();
    /** @type {!Map<!T, string>} */
    this._resolvedSourceMapURL = new Map();

    /** @type {!Map<string, !SDK.SourceMap>} */
    this._sourceMapByURL = new Map();
    /** @type {!Multimap<string, !T>} */
    this._sourceMapURLToLoadingClients = new Multimap();
    /** @type {!Multimap<string, !T>} */
    this._sourceMapURLToClients = new Multimap();

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }

  /**
   * @param {boolean} isEnabled
   */
  setEnabled(isEnabled) {
    if (isEnabled === this._isEnabled)
      return;
    this._isEnabled = isEnabled;
    var clients = Array.from(this._resolvedSourceMapURL.keys());
    for (var client of clients) {
      var relativeSourceURL = this._relativeSourceURL.get(client);
      var relativeSourceMapURL = this._relativeSourceMapURL.get(client);
      this.detachSourceMap(client);
      if (isEnabled)
        this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectedURLChanged(event) {
    if (event.data !== this.target())
      return;

    var clients = Array.from(this._resolvedSourceMapURL.keys());
    for (var client of clients) {
      var relativeSourceURL = this._relativeSourceURL.get(client);
      var relativeSourceMapURL = this._relativeSourceMapURL.get(client);
      var resolvedSourceMapURL = this._resolvedSourceMapURL.get(client);
      var sourceMapURL = this._resolveRelativeURLs(relativeSourceURL, relativeSourceMapURL).sourceMapURL;
      if (sourceMapURL !== resolvedSourceMapURL) {
        this.detachSourceMap(client);
        this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
      }
    }
  }

  /**
   * @param {!T} client
   * @return {?SDK.SourceMap}
   */
  sourceMapForClient(client) {
    var sourceMapURL = this._resolvedSourceMapURL.get(client);
    return sourceMapURL ? this._sourceMapByURL.get(sourceMapURL) || null : null;
  }

  /**
   * @param {!SDK.SourceMap} sourceMap
   * @return {!Array<!T>}
   */
  clientsForSourceMap(sourceMap) {
    if (this._sourceMapURLToClients.has(sourceMap.url()))
      return this._sourceMapURLToClients.get(sourceMap.url()).valuesArray();
    return this._sourceMapURLToLoadingClients.get(sourceMap.url()).valuesArray();
  }

  /**
   * @param {!SDK.SourceMap.EditResult} editResult
   */
  applySourceMapEdit(editResult) {
    console.assert(
        this._sourceMapByURL.has(editResult.map.url()), 'Cannot apply edit result for non-existing source map');
    this._sourceMapByURL.set(editResult.map.url(), editResult.map);
    this.dispatchEventToListeners(
        SDK.SourceMapManager.Events.SourceMapChanged, {sourceMap: editResult.map, newSources: editResult.newSources});
  }

  /**
   * @param {string} sourceURL
   * @param {string} sourceMapURL
   * @return {!{sourceURL: ?string, sourceMapURL: ?string}}
   */
  _resolveRelativeURLs(sourceURL, sourceMapURL) {
    // |sourceURL| can be a random string, but is generally an absolute path.
    // Complete it to inspected page url for relative links.
    var resolvedSourceURL = Common.ParsedURL.completeURL(this.target().inspectedURL(), sourceURL);
    var resolvedSourceMapURL = resolvedSourceURL ? Common.ParsedURL.completeURL(resolvedSourceURL, sourceMapURL) : null;
    return {sourceURL: resolvedSourceURL, sourceMapURL: resolvedSourceMapURL};
  }

  /**
   * @param {!T} client
   * @param {string} sourceURL
   * @param {?string} sourceMapURL
   */
  attachSourceMap(client, sourceURL, sourceMapURL) {
    if (!sourceMapURL)
      return;
    console.assert(!this._resolvedSourceMapURL.has(client), 'SourceMap is already attached to client');
    var resolvedURLs = this._resolveRelativeURLs(sourceURL, sourceMapURL);
    if (!resolvedURLs.sourceURL || !resolvedURLs.sourceMapURL)
      return;
    this._relativeSourceURL.set(client, sourceURL);
    this._relativeSourceMapURL.set(client, sourceMapURL);
    this._resolvedSourceMapURL.set(client, resolvedURLs.sourceMapURL);

    sourceURL = resolvedURLs.sourceURL;
    sourceMapURL = resolvedURLs.sourceMapURL;
    if (!this._isEnabled)
      return;

    if (this._sourceMapByURL.has(sourceMapURL)) {
      attach.call(this, sourceMapURL, client);
      return;
    }
    if (!this._sourceMapURLToLoadingClients.has(sourceMapURL)) {
      SDK.TextSourceMap.load(sourceMapURL, sourceURL)
          .then(onTextSourceMapLoaded.bind(this, sourceMapURL))
          .then(onSourceMap.bind(this, sourceMapURL));
    }
    this._sourceMapURLToLoadingClients.set(sourceMapURL, client);

    /**
     * @param {string} sourceMapURL
     * @param {?SDK.TextSourceMap} sourceMap
     * @return {!Promise<?SDK.SourceMap>}
     * @this {SDK.SourceMapManager}
     */
    function onTextSourceMapLoaded(sourceMapURL, sourceMap) {
      if (!sourceMap)
        return Promise.resolve(/** @type {?SDK.SourceMap} */ (null));
      var factoryExtension = this._factoryForSourceMap(sourceMap);
      if (!factoryExtension)
        return Promise.resolve(/** @type {?SDK.SourceMap} */ (sourceMap));
      return factoryExtension.instance()
          .then(factory => factory.editableSourceMap(this.target(), sourceMap))
          .then(map => map || sourceMap)
          .catchException(/** @type {?SDK.SourceMap} */ (null));
    }

    /**
     * @param {string} sourceMapURL
     * @param {?SDK.SourceMap} sourceMap
     * @this {SDK.SourceMapManager}
     */
    function onSourceMap(sourceMapURL, sourceMap) {
      this._sourceMapLoadedForTest();
      var clients = this._sourceMapURLToLoadingClients.get(sourceMapURL);
      this._sourceMapURLToLoadingClients.removeAll(sourceMapURL);
      if (!sourceMap || !clients.size)
        return;
      this._sourceMapByURL.set(sourceMapURL, sourceMap);
      for (var client of clients)
        attach.call(this, sourceMapURL, client);
    }

    /**
     * @param {string} sourceMapURL
     * @param {!T} client
     * @this {SDK.SourceMapManager}
     */
    function attach(sourceMapURL, client) {
      this._sourceMapURLToClients.set(sourceMapURL, client);
      this.dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached, client);
    }
  }

  /**
   * @param {!SDK.SourceMap} sourceMap
   * @return {?Runtime.Extension}
   */
  _factoryForSourceMap(sourceMap) {
    var sourceExtensions = new Set();
    for (var url of sourceMap.sourceURLs())
      sourceExtensions.add(Common.ParsedURL.extractExtension(url));
    for (var runtimeExtension of self.runtime.extensions(SDK.SourceMapFactory)) {
      var supportedExtensions = new Set(runtimeExtension.descriptor()['extensions']);
      if (supportedExtensions.containsAll(sourceExtensions))
        return runtimeExtension;
    }
    return null;
  }

  /**
   * @param {!T} client
   */
  detachSourceMap(client) {
    var sourceMapURL = this._resolvedSourceMapURL.get(client);
    this._relativeSourceURL.delete(client);
    this._relativeSourceMapURL.delete(client);
    this._resolvedSourceMapURL.delete(client);

    if (!sourceMapURL)
      return;
    if (!this._sourceMapURLToClients.hasValue(sourceMapURL, client)) {
      this._sourceMapURLToLoadingClients.remove(sourceMapURL, client);
      return;
    }
    this._sourceMapURLToClients.remove(sourceMapURL, client);
    if (!this._sourceMapURLToClients.has(sourceMapURL))
      this._sourceMapByURL.delete(sourceMapURL);
    this.dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapDetached, client);
  }

  _sourceMapLoadedForTest() {
  }

  dispose() {
    SDK.targetManager.removeEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }
};

SDK.SourceMapManager.Events = {
  SourceMapAttached: Symbol('SourceMapAttached'),
  SourceMapDetached: Symbol('SourceMapDetached'),
  SourceMapChanged: Symbol('SourceMapChanged')
};
