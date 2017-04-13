// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @param {!Common.ParsedURL} parsedUrl
 * @return {?string}
 */
ProductRegistry.nameForUrl = function(parsedUrl) {
  var entry = ProductRegistry.entryForUrl(parsedUrl);
  if (entry)
    return entry.name;
  return null;
};

/**
 * @param {!Common.ParsedURL} parsedUrl
 * @return {?ProductRegistry.ProductEntry}
 */
ProductRegistry.entryForUrl = function(parsedUrl) {
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
 * @param {!Common.ParsedURL} parsedUrl
 * @return {?string}
 */
ProductRegistry.typeForUrl = function(parsedUrl) {
  var entry = ProductRegistry.entryForUrl(parsedUrl);
  if (entry)
    return entry.type;
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
 * @param {!Array<string>} productTypes
 * @param {!Array<string>} productNames
 * @param {!Array<!{hash: string, prefixes: !Object<string, !{product: number, type: (number|undefined)}>}>} data
 */
ProductRegistry.register = function(productTypes, productNames, data) {
  var typesMap = /** @type {!Map<number, string>} */ (new Map());
  for (var i = 0; i < productTypes.length; i++)
    typesMap.set(i, productTypes[i]);

  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    var prefixes = {};
    for (var prefix in entry.prefixes) {
      var prefixEntry = entry.prefixes[prefix];
      var type = prefixEntry.type !== undefined ? (typesMap.get(prefixEntry.type) || null) : null;
      prefixes[prefix] = {name: productNames[prefixEntry.product], type: type};
    }
    ProductRegistry._productsByDomainHash.set(entry.hash, prefixes);
  }
};

/** @typedef {!{name: string, type: ?string}} */
ProductRegistry.ProductEntry;

/** @type {!Map<string, !Object<string, !ProductRegistry.ProductEntry>>}} */
ProductRegistry._productsByDomainHash = new Map();
