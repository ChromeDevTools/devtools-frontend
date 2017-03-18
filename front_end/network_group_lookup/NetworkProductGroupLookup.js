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
   * @return {?string}
   */
  lookup(request) {
    return ProductRegistry.nameForUrl(request.parsedURL);
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest} request
   * @return {string}
   */
  lookupColumnValue(request) {
    return this.lookup(request) || '';
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
