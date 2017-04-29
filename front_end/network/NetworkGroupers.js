// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Network.GroupLookupInterface}
 */
Network.ProductGrouper = class {
  constructor() {
    /** @type {?ProductRegistry.Registry} */
    this._productRegistry = null;
  }

  /**
   * @override
   * @return {!Promise}
   */
  initialize() {
    return ProductRegistry.instance().then(productRegistry => this._productRegistry = productRegistry);
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {?*}
   */
  groupForRequest(request) {
    if (!this._productRegistry)
      return null;
    var productName = this._productRegistry.nameForUrl(request.parsedURL);
    if (!productName)
      return null;
    return productName;
  }

  /**
   * @override
   * @param {!*} key
   * @return {string}
   */
  groupName(key) {
    return /** @type {string} */ (key);
  }
};

/**
 * @implements {Network.GroupLookupInterface}
 */
Network.FrameGrouper = class {
  constructor() {
    /** @type {?ProductRegistry.Registry} */
    this._productRegistry = null;
  }

  /**
   * @override
   * @return {!Promise}
   */
  initialize() {
    return ProductRegistry.instance().then(productRegistry => this._productRegistry = productRegistry);
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {?*}
   */
  groupForRequest(request) {
    var resourceTreeModel = request.networkManager().target().model(SDK.ResourceTreeModel);
    if (!resourceTreeModel)
      return null;
    var frame = resourceTreeModel.frameForId(request.frameId);
    if (!frame || frame.isMainFrame())
      return null;
    return frame;
  }

  /**
   * @override
   * @param {!*} frameArg
   * @return {string}
   */
  groupName(frameArg) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (frameArg);
    var entry = this._productRegistry ? this._productRegistry.entryForFrame(frame) : null;
    if (entry)
      return entry.name;
    return (new Common.ParsedURL(frame.url)).host || frame.name || '<iframe>';
  }
};
