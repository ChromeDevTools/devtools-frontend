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
  var productsByDomainHash = ProductRegistry._productsByDomainHash;
  // Remove leading www. if it is the only subdomain.
  var domain = parsedUrl.domain().replace(/^www\.(?=[^.]+\.[^.]+$)/, '');

  var previousIndex = -1;
  var index = -1;
  // Ensure we loop with full domain first, but do not loop over last part (ie: ".com").
  for (var nextIndex = domain.indexOf('.'); nextIndex !== -1; nextIndex = domain.indexOf('.', nextIndex + 1)) {
    var previousSubdomain = domain.substring(previousIndex + 1, index);
    var subDomain = domain.substring(index + 1);
    var prefixes = productsByDomainHash.get(ProductRegistry._hashForDomain(subDomain));
    previousIndex = index;
    index = nextIndex;
    if (!prefixes)
      continue;
    // Exact match domains are always highest priority.
    if ('' in prefixes && domain === subDomain)
      return prefixes[''];
    if (previousSubdomain) {
      for (var prefix in prefixes) {
        var domainPrefix = previousSubdomain.substr(0, prefix.length);
        if (domainPrefix === prefix && prefix !== '')
          return prefixes[prefix];
      }
    }
    // Process wildcard subdomain if no better match found.
    if (prefixes && '*' in prefixes)
      return prefixes['*'];
  }
  return null;
};

/**
 * @param {string} domain
 * @return {string}
 */
ProductRegistry._hashForDomain = function(domain) {
  return ProductRegistry.sha1(domain).substr(0, 16);
};

/**
 * @param {!Array<string>} productNames
 * @param {!Array<!{hash: string, prefixes: !Object<string, number>}>} data
 */
ProductRegistry.register = function(productNames, data) {
  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    var prefixes = {};
    for (var prefix in entry.prefixes) {
      var productNameIndex = entry.prefixes[prefix];
      prefixes[prefix] = productNames[productNameIndex];
    }
    ProductRegistry._productsByDomainHash.set(entry.hash, prefixes);
  }
};

/** @type {!Map<string, !Object<string, string>>}} */
ProductRegistry._productsByDomainHash = new Map();
