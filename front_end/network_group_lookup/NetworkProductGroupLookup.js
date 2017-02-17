// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
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
};
