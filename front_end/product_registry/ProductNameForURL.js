// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @param {!Common.ParsedURL} parsedUrl
 * @return {?string}
 */
ProductRegistry.nameForUrl = function(parsedUrl) {
  if (parsedUrl.isDataURL())
    return null;
  // TODO(allada) This should be expanded to allow paths as as well as domain to find a product.
  var productsByDomain = ProductRegistry._productsByDomain;
  var domain = parsedUrl.domain();
  var domainParts = domain.split('.');
  while (domainParts.length > 1) {
    var subDomain = domainParts.join('.');
    var entry = productsByDomain.get(subDomain);
    if (entry && (!entry.exact || subDomain === domain))
      return entry.name;
    domainParts.shift();
  }
  return null;
};

/**
 * @param {!Array<!{url: string, name: string, exact: boolean}>} data
 */
ProductRegistry.register = function(data) {
  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    ProductRegistry._productsByDomain.set(entry.url, entry);
  }
};

/** @type {!Map<string, !{url: string, name: string, exact: boolean}>} */
ProductRegistry._productsByDomain = new Map();
