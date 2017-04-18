// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Network.NetworkColumnExtensionInterface}
 * @implements {Network.NetworkGroupLookupInterface}
 */
NetworkGroupLookup.NetworkProductGroupLookup = class {
  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {?*}
   */
  groupForRequest(request) {
    var productName = ProductRegistry.nameForUrl(request.parsedURL);
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

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {string}
   */
  lookupColumnValue(request) {
    return ProductRegistry.nameForUrl(request.parsedURL) || '';
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} aRequest
   * @param {!SDK.NetworkRequest} bRequest
   * @return {number}
   */
  requestComparator(aRequest, bRequest) {
    var aValue = this.lookupColumnValue(aRequest);
    var bValue = this.lookupColumnValue(bRequest);
    if (aValue === bValue)
      return aRequest.indentityCompare(bRequest);
    return aValue > bValue ? 1 : -1;
  }
};

/**
 * @implements {Network.NetworkGroupLookupInterface}
 */
NetworkGroupLookup.NetworkProductFrameGroupLookup = class {
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
    var name;
    var frameParsedURL = new Common.ParsedURL(frame.url);
    if (frame.url)
      name = ProductRegistry.nameForUrl(frameParsedURL);
    if (name)
      return name;
    // We are not caching the frame url result because it may change.
    var symbol = NetworkGroupLookup.NetworkProductFrameGroupLookup._productFrameGroupNameSymbol;
    if (frame[symbol])
      return frame[symbol];
    frame[symbol] = this._lookupFrameStacktraceName(frame) || frameParsedURL.host || frame.name || '<iframe>';
    return frame[symbol];
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   * @return {?string}
   */
  _lookupFrameStacktraceName(frame) {
    // TODO(allada) This probably belongs in another shared module with some lookup that console will use for execution
    // context name lookup.
    var stackTrace = frame.creationStackTrace();
    var name;
    while (stackTrace) {
      for (var stack of stackTrace.callFrames) {
        if (stack.url)
          name = ProductRegistry.nameForUrl(new Common.ParsedURL(stack.url));
        if (name)
          return name;
      }
      stackTrace = frame.parent;
    }
    return null;
  }
};

/**
 * @implements {Network.NetworkRowDecorator}
 */
NetworkGroupLookup.NetworkProductTypeGroupLookup = class {
  /**
   * @override
   * @param {!Network.NetworkNode} node
   */
  decorate(node) {
    var request = node.request();
    var element = node.existingElement();
    if (!request || !element)
      return;
    var typeName = ProductRegistry.typeForUrl(request.parsedURL);
    if (typeName === null)
      return;
    var icon = UI.Icon.create('smallicon-network-product');
    if (typeName === 1)
      icon.style.filter = 'hue-rotate(220deg) brightness(1.5)';
    if (typeName === 2)
      icon.style.filter = 'hue-rotate(-90deg) brightness(1.5)';
    node.setIconForColumn('product-extension', icon);
  }
};

NetworkGroupLookup.NetworkProductFrameGroupLookup._productFrameGroupNameSymbol = Symbol('ProductFrameGroupName');
