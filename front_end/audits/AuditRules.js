/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Audits.AuditRules.IPAddressRegexp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

Audits.AuditRules.CacheableResponseCodes = {
  200: true,
  203: true,
  206: true,
  300: true,
  301: true,
  410: true,

  304: true  // Underlying request is cacheable
};

/**
 * @param {!Array.<!SDK.NetworkRequest>} requests
 * @param {?Array.<!Common.ResourceType>} types
 * @param {boolean} needFullResources
 * @return {!Object.<string, !Array.<!SDK.NetworkRequest|string>>}
 */
Audits.AuditRules.getDomainToResourcesMap = function(requests, types, needFullResources) {
  /** @type {!Object<string, !Array<!SDK.NetworkRequest|string>>} */
  var domainToResourcesMap = {};
  for (var i = 0, size = requests.length; i < size; ++i) {
    var request = requests[i];
    if (types && types.indexOf(request.resourceType()) === -1)
      continue;
    var parsedURL = request.url().asParsedURL();
    if (!parsedURL)
      continue;
    var domain = parsedURL.host;
    var domainResources = domainToResourcesMap[domain];
    if (domainResources === undefined) {
      domainResources = /** @type {!Array<!SDK.NetworkRequest|string>} */ ([]);
      domainToResourcesMap[domain] = domainResources;
    }
    domainResources.push(needFullResources ? request : request.url());
  }
  return domainToResourcesMap;
};

/**
 * @unrestricted
 */
Audits.AuditRules.GzipRule = class extends Audits.AuditRule {
  constructor() {
    super('network-gzip', Common.UIString('Enable gzip compression'));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var totalSavings = 0;
    var summary = result.addChild('', true);
    for (var i = 0, length = requests.length; i < length; ++i) {
      var request = requests[i];
      if (request.cached() || request.statusCode === 304)
        continue;  // Do not test cached resources.
      if (this._shouldCompress(request)) {
        var size = request.resourceSize;
        if (this._isCompressed(request))
          continue;
        var savings = 2 * size / 3;
        totalSavings += savings;
        summary.addFormatted('%r could save ~%s', request.url(), Number.bytesToString(savings));
        result.violationCount++;
      }
    }
    if (!totalSavings) {
      callback(null);
      return;
    }
    summary.value = Common.UIString(
        'Compressing the following resources with gzip could reduce their transfer size by about two thirds (~%s):',
        Number.bytesToString(totalSavings));
    callback(result);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _isCompressed(request) {
    var encodingHeader = request.responseHeaderValue('Content-Encoding');
    if (!encodingHeader)
      return false;

    return /\b(?:gzip|deflate)\b/.test(encodingHeader);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _shouldCompress(request) {
    return request.resourceType().isTextType() && request.parsedURL.host && request.resourceSize !== undefined &&
        request.resourceSize > 150;
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CombineExternalResourcesRule = class extends Audits.AuditRule {
  /**
   * @param {string} id
   * @param {string} name
   * @param {!Common.ResourceType} type
   * @param {string} resourceTypeName
   * @param {boolean} allowedPerDomain
   */
  constructor(id, name, type, resourceTypeName, allowedPerDomain) {
    super(id, name);
    this._type = type;
    this._resourceTypeName = resourceTypeName;
    this._allowedPerDomain = allowedPerDomain;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var domainToResourcesMap = Audits.AuditRules.getDomainToResourcesMap(requests, [this._type], false);
    var penalizedResourceCount = 0;
    // TODO: refactor according to the chosen i18n approach
    var summary = result.addChild('', true);
    for (var domain in domainToResourcesMap) {
      var domainResources = domainToResourcesMap[domain];
      var extraResourceCount = domainResources.length - this._allowedPerDomain;
      if (extraResourceCount <= 0)
        continue;
      penalizedResourceCount += extraResourceCount - 1;
      summary.addChild(Common.UIString(
          '%d %s resources served from %s.', domainResources.length, this._resourceTypeName,
          Audits.AuditRuleResult.resourceDomain(domain)));
      result.violationCount += domainResources.length;
    }
    if (!penalizedResourceCount) {
      callback(null);
      return;
    }

    summary.value = Common.UIString(
        'There are multiple resources served from same domain. Consider combining them into as few files as possible.');
    callback(result);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CombineJsResourcesRule = class extends Audits.AuditRules.CombineExternalResourcesRule {
  constructor(allowedPerDomain) {
    super(
        'page-externaljs', Common.UIString('Combine external JavaScript'), Common.resourceTypes.Script, 'JavaScript',
        allowedPerDomain);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CombineCssResourcesRule = class extends Audits.AuditRules.CombineExternalResourcesRule {
  constructor(allowedPerDomain) {
    super(
        'page-externalcss', Common.UIString('Combine external CSS'), Common.resourceTypes.Stylesheet, 'CSS',
        allowedPerDomain);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.MinimizeDnsLookupsRule = class extends Audits.AuditRule {
  constructor(hostCountThreshold) {
    super('network-minimizelookups', Common.UIString('Minimize DNS lookups'));
    this._hostCountThreshold = hostCountThreshold;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var summary = result.addChild('');
    var domainToResourcesMap = Audits.AuditRules.getDomainToResourcesMap(requests, null, false);
    for (var domain in domainToResourcesMap) {
      if (domainToResourcesMap[domain].length > 1)
        continue;
      var parsedURL = domain.asParsedURL();
      if (!parsedURL)
        continue;
      if (!parsedURL.host.search(Audits.AuditRules.IPAddressRegexp))
        continue;  // an IP address
      summary.addSnippet(domain);
      result.violationCount++;
    }
    if (!summary.children || summary.children.length <= this._hostCountThreshold) {
      callback(null);
      return;
    }

    summary.value = Common.UIString(
        'The following domains only serve one resource each. If possible, avoid the extra DNS lookups by serving these resources from existing domains.');
    callback(result);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.ParallelizeDownloadRule = class extends Audits.AuditRule {
  constructor(optimalHostnameCount, minRequestThreshold, minBalanceThreshold) {
    super('network-parallelizehosts', Common.UIString('Parallelize downloads across hostnames'));
    this._optimalHostnameCount = optimalHostnameCount;
    this._minRequestThreshold = minRequestThreshold;
    this._minBalanceThreshold = minBalanceThreshold;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    /**
     * @param {string} a
     * @param {string} b
     */
    function hostSorter(a, b) {
      var aCount = domainToResourcesMap[a].length;
      var bCount = domainToResourcesMap[b].length;
      return (aCount < bCount) ? 1 : (aCount === bCount) ? 0 : -1;
    }

    var domainToResourcesMap = Audits.AuditRules.getDomainToResourcesMap(
        requests, [Common.resourceTypes.Stylesheet, Common.resourceTypes.Image], true);

    var hosts = [];
    for (var url in domainToResourcesMap)
      hosts.push(url);

    if (!hosts.length) {
      callback(null);  // no hosts (local file or something)
      return;
    }

    hosts.sort(hostSorter);

    var optimalHostnameCount = this._optimalHostnameCount;
    if (hosts.length > optimalHostnameCount)
      hosts.splice(optimalHostnameCount);

    var busiestHostResourceCount = domainToResourcesMap[hosts[0]].length;
    var requestCountAboveThreshold = busiestHostResourceCount - this._minRequestThreshold;
    if (requestCountAboveThreshold <= 0) {
      callback(null);
      return;
    }

    var avgResourcesPerHost = 0;
    for (var i = 0, size = hosts.length; i < size; ++i)
      avgResourcesPerHost += domainToResourcesMap[hosts[i]].length;

    // Assume optimal parallelization.
    avgResourcesPerHost /= optimalHostnameCount;
    avgResourcesPerHost = Math.max(avgResourcesPerHost, 1);

    var pctAboveAvg = (requestCountAboveThreshold / avgResourcesPerHost) - 1.0;
    var minBalanceThreshold = this._minBalanceThreshold;
    if (pctAboveAvg < minBalanceThreshold) {
      callback(null);
      return;
    }

    var requestsOnBusiestHost = domainToResourcesMap[hosts[0]];
    var entry = result.addChild(
        Common.UIString(
            'This page makes %d parallelizable requests to %s. Increase download parallelization by distributing the following requests across multiple hostnames.',
            busiestHostResourceCount, hosts[0]),
        true);
    for (var i = 0; i < requestsOnBusiestHost.length; ++i)
      entry.addURL(requestsOnBusiestHost[i].url());

    result.violationCount = requestsOnBusiestHost.length;
    callback(result);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.UnusedCssRule = class extends Audits.AuditRule {
  /**
   * The reported CSS rule size is incorrect (parsed != original in WebKit),
   * so use percentages instead, which gives a better approximation.
   */
  constructor() {
    super('page-unusedcss', Common.UIString('Remove unused CSS rules'));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var domModel = target.model(SDK.DOMModel);
    var cssModel = target.model(SDK.CSSModel);
    if (!domModel || !cssModel) {
      callback(null);
      return;
    }

    /**
     * @param {!Array.<!Audits.AuditRules.ParsedStyleSheet>} styleSheets
     */
    function evalCallback(styleSheets) {
      if (!styleSheets.length)
        return callback(null);

      var selectors = [];
      var testedSelectors = {};
      for (var i = 0; i < styleSheets.length; ++i) {
        var styleSheet = styleSheets[i];
        for (var curRule = 0; curRule < styleSheet.rules.length; ++curRule) {
          var selectorText = styleSheet.rules[curRule].selectorText;
          if (testedSelectors[selectorText])
            continue;
          selectors.push(selectorText);
          testedSelectors[selectorText] = 1;
        }
      }

      var foundSelectors = {};

      /**
       * @param {!Array.<!Audits.AuditRules.ParsedStyleSheet>} styleSheets
       */
      function selectorsCallback(styleSheets) {
        if (progress.isCanceled()) {
          callback(null);
          return;
        }

        var inlineBlockOrdinal = 0;
        var totalStylesheetSize = 0;
        var totalUnusedStylesheetSize = 0;
        var summary;

        for (var i = 0; i < styleSheets.length; ++i) {
          var styleSheet = styleSheets[i];
          var unusedRules = [];
          for (var curRule = 0; curRule < styleSheet.rules.length; ++curRule) {
            var rule = styleSheet.rules[curRule];
            if (!testedSelectors[rule.selectorText] || foundSelectors[rule.selectorText])
              continue;
            unusedRules.push(rule.selectorText);
          }
          totalStylesheetSize += styleSheet.rules.length;
          totalUnusedStylesheetSize += unusedRules.length;

          if (!unusedRules.length)
            continue;

          var resource = Bindings.resourceForURL(styleSheet.sourceURL);
          var isInlineBlock =
              resource && resource.request && resource.request.resourceType() === Common.resourceTypes.Document;
          var url = !isInlineBlock ? Audits.AuditRuleResult.linkifyDisplayName(styleSheet.sourceURL) :
                                     Common.UIString('Inline block #%d', ++inlineBlockOrdinal);
          var pctUnused = Math.round(100 * unusedRules.length / styleSheet.rules.length);
          if (!summary)
            summary = result.addChild('', true);
          var entry = summary.addFormatted('%s: %d% is not used by the current page.', url, pctUnused);

          for (var j = 0; j < unusedRules.length; ++j)
            entry.addSnippet(unusedRules[j]);

          result.violationCount += unusedRules.length;
        }

        if (!totalUnusedStylesheetSize)
          return callback(null);

        var totalUnusedPercent = Math.round(100 * totalUnusedStylesheetSize / totalStylesheetSize);
        summary.value = Common.UIString(
            '%s rules (%d%) of CSS not used by the current page.', totalUnusedStylesheetSize, totalUnusedPercent);

        callback(result);
      }

      /**
       * @param {?function()} boundSelectorsCallback
       * @param {string} selector
       * @param {?Protocol.DOM.NodeId} nodeId
       */
      function queryCallback(boundSelectorsCallback, selector, nodeId) {
        if (nodeId)
          foundSelectors[selector] = true;
        if (boundSelectorsCallback)
          boundSelectorsCallback();
      }

      /**
       * @param {!Array.<string>} selectors
       * @param {!SDK.DOMDocument} document
       */
      function documentLoaded(selectors, document) {
        var pseudoSelectorRegexp = /::?(?:[\w-]+)(?:\(.*?\))?/g;
        if (!selectors.length) {
          selectorsCallback([]);
          return;
        }
        for (var i = 0; i < selectors.length; ++i) {
          if (progress.isCanceled()) {
            callback(null);
            return;
          }
          var effectiveSelector = selectors[i].replace(pseudoSelectorRegexp, '');
          domModel.querySelector(
              document.id, effectiveSelector,
              queryCallback.bind(
                  null, i === selectors.length - 1 ? selectorsCallback.bind(null, styleSheets) : null, selectors[i]));
        }
      }

      domModel.requestDocument(documentLoaded.bind(null, selectors));
    }

    var styleSheetInfos = cssModel.allStyleSheets();
    if (!styleSheetInfos || !styleSheetInfos.length) {
      evalCallback([]);
      return;
    }
    var styleSheetProcessor = new Audits.AuditRules.StyleSheetProcessor(styleSheetInfos, progress, evalCallback);
    styleSheetProcessor.run();
  }
};

/**
 * @typedef {!{sourceURL: string, rules: !Array.<!Common.FormatterWorkerPool.CSSStyleRule>}}
 */
Audits.AuditRules.ParsedStyleSheet;

/**
 * @unrestricted
 */
Audits.AuditRules.StyleSheetProcessor = class {
  /**
   * @param {!Array.<!SDK.CSSStyleSheetHeader>} styleSheetHeaders
   * @param {!Common.Progress} progress
   * @param {function(!Array.<!Audits.AuditRules.ParsedStyleSheet>)} styleSheetsParsedCallback
   */
  constructor(styleSheetHeaders, progress, styleSheetsParsedCallback) {
    this._styleSheetHeaders = styleSheetHeaders;
    this._progress = progress;
    this._styleSheets = [];
    this._styleSheetsParsedCallback = styleSheetsParsedCallback;
  }

  run() {
    this._processNextStyleSheet();
  }

  _processNextStyleSheet() {
    if (!this._styleSheetHeaders.length) {
      this._styleSheetsParsedCallback(this._styleSheets);
      return;
    }
    this._currentStyleSheetHeader = this._styleSheetHeaders.shift();

    var allRules = [];
    this._currentStyleSheetHeader.requestContent().then(
        content => Common.formatterWorkerPool.parseCSS(content || '', onRulesParsed.bind(this)));

    /**
     * @param {boolean} isLastChunk
     * @param {!Array<!Common.FormatterWorkerPool.CSSRule>} rules
     * @this {Audits.AuditRules.StyleSheetProcessor}
     */
    function onRulesParsed(isLastChunk, rules) {
      allRules.push(...rules);
      if (isLastChunk)
        this._onStyleSheetParsed(allRules);
    }
  }

  /**
   * @param {!Array.<!Common.FormatterWorkerPool.CSSRule>} rules
   */
  _onStyleSheetParsed(rules) {
    if (this._progress.isCanceled()) {
      this._styleSheetsParsedCallback(this._styleSheets);
      return;
    }

    var styleRules = [];
    for (var i = 0; i < rules.length; ++i) {
      var rule = rules[i];
      if (rule.selectorText)
        styleRules.push(rule);
    }
    this._styleSheets.push({sourceURL: this._currentStyleSheetHeader.sourceURL, rules: styleRules});
    this._processNextStyleSheet();
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CacheControlRule = class extends Audits.AuditRule {
  constructor(id, name) {
    super(id, name);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(!Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var cacheableAndNonCacheableResources = this._cacheableAndNonCacheableResources(requests);
    if (cacheableAndNonCacheableResources[0].length)
      this.runChecks(cacheableAndNonCacheableResources[0], result);
    this.handleNonCacheableResources(cacheableAndNonCacheableResources[1], result);

    callback(result);
  }

  handleNonCacheableResources(requests, result) {
  }

  _cacheableAndNonCacheableResources(requests) {
    var processedResources = [[], []];
    for (var i = 0; i < requests.length; ++i) {
      var request = requests[i];
      if (!this.isCacheableResource(request))
        continue;
      if (this._isExplicitlyNonCacheable(request))
        processedResources[1].push(request);
      else
        processedResources[0].push(request);
    }
    return processedResources;
  }

  execCheck(messageText, requestCheckFunction, requests, result) {
    var requestCount = requests.length;
    var urls = [];
    for (var i = 0; i < requestCount; ++i) {
      if (requestCheckFunction.call(this, requests[i]))
        urls.push(requests[i].url());
    }
    if (urls.length) {
      var entry = result.addChild(messageText, true);
      entry.addURLs(urls);
      result.violationCount += urls.length;
    }
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {number} timeMs
   * @return {boolean}
   */
  freshnessLifetimeGreaterThan(request, timeMs) {
    var dateHeader = this.responseHeader(request, 'Date');
    if (!dateHeader)
      return false;

    var dateHeaderMs = Date.parse(dateHeader);
    if (isNaN(dateHeaderMs))
      return false;

    var freshnessLifetimeMs;
    var maxAgeMatch = this.responseHeaderMatch(request, 'Cache-Control', 'max-age=(\\d+)');

    if (maxAgeMatch) {
      freshnessLifetimeMs = (maxAgeMatch[1]) ? 1000 * maxAgeMatch[1] : 0;
    } else {
      var expiresHeader = this.responseHeader(request, 'Expires');
      if (expiresHeader) {
        var expDate = Date.parse(expiresHeader);
        if (!isNaN(expDate))
          freshnessLifetimeMs = expDate - dateHeaderMs;
      }
    }

    return (isNaN(freshnessLifetimeMs)) ? false : freshnessLifetimeMs > timeMs;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {string} header
   * @return {string|undefined}
   */
  responseHeader(request, header) {
    return request.responseHeaderValue(header);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {string} header
   * @return {boolean}
   */
  hasResponseHeader(request, header) {
    return request.responseHeaderValue(header) !== undefined;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  isCompressible(request) {
    return request.resourceType().isTextType();
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  isPubliclyCacheable(request) {
    if (this._isExplicitlyNonCacheable(request))
      return false;

    if (this.responseHeaderMatch(request, 'Cache-Control', 'public'))
      return true;

    return request.url().indexOf('?') === -1 && !this.responseHeaderMatch(request, 'Cache-Control', 'private');
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {string} header
   * @param {string} regexp
   * @return {?Array.<string>}
   */
  responseHeaderMatch(request, header, regexp) {
    return request.responseHeaderValue(header) ? request.responseHeaderValue(header).match(new RegExp(regexp, 'im')) :
                                                 null;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  hasExplicitExpiration(request) {
    return this.hasResponseHeader(request, 'Date') &&
        (this.hasResponseHeader(request, 'Expires') || !!this.responseHeaderMatch(request, 'Cache-Control', 'max-age'));
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  _isExplicitlyNonCacheable(request) {
    var hasExplicitExp = this.hasExplicitExpiration(request);
    return !!(
        !!this.responseHeaderMatch(request, 'Cache-Control', '(no-cache|no-store)') ||
        !!this.responseHeaderMatch(request, 'Pragma', 'no-cache') ||
        (hasExplicitExp && !this.freshnessLifetimeGreaterThan(request, 0)) ||
        (!hasExplicitExp && request.url() && request.url().indexOf('?') >= 0) ||
        (!hasExplicitExp && !this.isCacheableResource(request)));
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  isCacheableResource(request) {
    return request.statusCode !== undefined && Audits.AuditRules.CacheableResponseCodes[request.statusCode];
  }
};

Audits.AuditRules.CacheControlRule.MillisPerMonth = 1000 * 60 * 60 * 24 * 30;

/**
 * @unrestricted
 */
Audits.AuditRules.BrowserCacheControlRule = class extends Audits.AuditRules.CacheControlRule {
  constructor() {
    super('http-browsercache', Common.UIString('Leverage browser caching'));
  }

  /**
   * @override
   */
  handleNonCacheableResources(requests, result) {
    if (requests.length) {
      var entry = result.addChild(
          Common.UIString(
              'The following resources are explicitly non-cacheable. Consider making them cacheable if possible:'),
          true);
      result.violationCount += requests.length;
      for (var i = 0; i < requests.length; ++i)
        entry.addURL(requests[i].url());
    }
  }

  runChecks(requests, result, callback) {
    this.execCheck(
        Common.UIString(
            'The following resources are missing a cache expiration. Resources that do not specify an expiration may not be cached by browsers:'),
        this._missingExpirationCheck, requests, result);
    this.execCheck(
        Common.UIString(
            'The following resources specify a "Vary" header that disables caching in most versions of Internet Explorer:'),
        this._varyCheck, requests, result);
    this.execCheck(
        Common.UIString('The following cacheable resources have a short freshness lifetime:'),
        this._oneMonthExpirationCheck, requests, result);

    // Unable to implement the favicon check due to the WebKit limitations.
    this.execCheck(
        Common.UIString(
            'To further improve cache hit rate, specify an expiration one year in the future for the following cacheable resources:'),
        this._oneYearExpirationCheck, requests, result);
  }

  _missingExpirationCheck(request) {
    return this.isCacheableResource(request) && !this.hasResponseHeader(request, 'Set-Cookie') &&
        !this.hasExplicitExpiration(request);
  }

  _varyCheck(request) {
    var varyHeader = this.responseHeader(request, 'Vary');
    if (varyHeader) {
      varyHeader = varyHeader.replace(/User-Agent/gi, '');
      varyHeader = varyHeader.replace(/Accept-Encoding/gi, '');
      varyHeader = varyHeader.replace(/[, ]*/g, '');
    }
    return varyHeader && varyHeader.length && this.isCacheableResource(request) &&
        this.freshnessLifetimeGreaterThan(request, 0);
  }

  _oneMonthExpirationCheck(request) {
    return this.isCacheableResource(request) && !this.hasResponseHeader(request, 'Set-Cookie') &&
        !this.freshnessLifetimeGreaterThan(request, Audits.AuditRules.CacheControlRule.MillisPerMonth) &&
        this.freshnessLifetimeGreaterThan(request, 0);
  }

  _oneYearExpirationCheck(request) {
    return this.isCacheableResource(request) && !this.hasResponseHeader(request, 'Set-Cookie') &&
        !this.freshnessLifetimeGreaterThan(request, 11 * Audits.AuditRules.CacheControlRule.MillisPerMonth) &&
        this.freshnessLifetimeGreaterThan(request, Audits.AuditRules.CacheControlRule.MillisPerMonth);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.ImageDimensionsRule = class extends Audits.AuditRule {
  constructor() {
    super('page-imagedims', Common.UIString('Specify image dimensions'));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var domModel = target.model(SDK.DOMModel);
    var cssModel = target.model(SDK.CSSModel);
    if (!domModel || !cssModel) {
      callback(null);
      return;
    }

    var urlToNoDimensionCount = {};

    function doneCallback() {
      for (var url in urlToNoDimensionCount) {
        var entry = entry ||
            result.addChild(
                Common.UIString(
                    'A width and height should be specified for all images in order to speed up page display. The following image(s) are missing a width and/or height:'),
                true);
        var format = '%r';
        if (urlToNoDimensionCount[url] > 1)
          format += ' (%d uses)';
        entry.addFormatted(format, url, urlToNoDimensionCount[url]);
        result.violationCount++;
      }
      callback(entry ? result : null);
    }

    function imageStylesReady(imageId, styles) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      const node = domModel.nodeForId(imageId);
      var src = node.getAttribute('src');
      if (!src.asParsedURL()) {
        for (var frameOwnerCandidate = node; frameOwnerCandidate;
             frameOwnerCandidate = frameOwnerCandidate.parentNode) {
          if (frameOwnerCandidate.baseURL) {
            var completeSrc = Common.ParsedURL.completeURL(frameOwnerCandidate.baseURL, src);
            break;
          }
        }
      }
      if (completeSrc)
        src = completeSrc;

      if (styles.computedStyle.get('position') === 'absolute')
        return;

      var widthFound = false;
      var heightFound = false;
      for (var i = 0; !(widthFound && heightFound) && i < styles.nodeStyles.length; ++i) {
        var style = styles.nodeStyles[i];
        if (style.getPropertyValue('width') !== '')
          widthFound = true;
        if (style.getPropertyValue('height') !== '')
          heightFound = true;
      }

      if (!widthFound || !heightFound) {
        if (src in urlToNoDimensionCount)
          ++urlToNoDimensionCount[src];
        else
          urlToNoDimensionCount[src] = 1;
      }
    }

    /**
     * @param {!Array.<!Protocol.DOM.NodeId>=} nodeIds
     */
    function getStyles(nodeIds) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }
      var targetResult = {};

      /**
       * @param {?SDK.CSSMatchedStyles} matchedStyleResult
       */
      function matchedCallback(matchedStyleResult) {
        if (!matchedStyleResult)
          return;
        targetResult.nodeStyles = matchedStyleResult.nodeStyles();
      }

      /**
       * @param {?Map.<string, string>} computedStyle
       */
      function computedCallback(computedStyle) {
        targetResult.computedStyle = computedStyle;
      }

      if (!nodeIds || !nodeIds.length)
        doneCallback();

      var nodePromises = [];
      for (var i = 0; nodeIds && i < nodeIds.length; ++i) {
        var stylePromises = [
          cssModel.matchedStylesPromise(nodeIds[i]).then(matchedCallback),
          cssModel.computedStylePromise(nodeIds[i]).then(computedCallback)
        ];
        var nodePromise = Promise.all(stylePromises).then(imageStylesReady.bind(null, nodeIds[i], targetResult));
        nodePromises.push(nodePromise);
      }
      Promise.all(nodePromises).catchException(null).then(doneCallback);
    }

    function onDocumentAvailable(root) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }
      domModel.querySelectorAll(root.id, 'img[src]', getStyles);
    }

    if (progress.isCanceled()) {
      callback(null);
      return;
    }
    domModel.requestDocument(onDocumentAvailable);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CssInHeadRule = class extends Audits.AuditRule {
  constructor() {
    super('page-cssinhead', Common.UIString('Put CSS in the document head'));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (!domModel) {
      callback(null);
      return;
    }

    function evalCallback(evalResult) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!evalResult)
        return callback(null);

      var summary = result.addChild('');

      for (var url in evalResult) {
        var urlViolations = evalResult[url];
        if (urlViolations[0]) {
          result.addFormatted(
              '%s style block(s) in the %r body should be moved to the document head.', urlViolations[0], url);
          result.violationCount += urlViolations[0];
        }
        for (var i = 0; i < urlViolations[1].length; ++i)
          result.addFormatted('Link node %r should be moved to the document head in %r', urlViolations[1][i], url);
        result.violationCount += urlViolations[1].length;
      }
      summary.value = Common.UIString('CSS in the document body adversely impacts rendering performance.');
      callback(result);
    }

    /**
     * @param {!SDK.DOMNode} root
     * @param {!Array.<!Protocol.DOM.NodeId>=} inlineStyleNodeIds
     * @param {!Array.<!Protocol.DOM.NodeId>=} nodeIds
     */
    function externalStylesheetsReceived(root, inlineStyleNodeIds, nodeIds) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!nodeIds)
        return;
      var externalStylesheetNodeIds = nodeIds;
      var result = null;
      if (inlineStyleNodeIds.length || externalStylesheetNodeIds.length) {
        var urlToViolationsArray = {};
        var externalStylesheetHrefs = [];
        for (var j = 0; j < externalStylesheetNodeIds.length; ++j) {
          var linkNode = domModel.nodeForId(externalStylesheetNodeIds[j]);
          var completeHref =
              Common.ParsedURL.completeURL(linkNode.ownerDocument.baseURL, linkNode.getAttribute('href'));
          externalStylesheetHrefs.push(completeHref || '<empty>');
        }
        urlToViolationsArray[root.documentURL] = [inlineStyleNodeIds.length, externalStylesheetHrefs];
        result = urlToViolationsArray;
      }
      evalCallback(result);
    }

    /**
     * @param {!SDK.DOMNode} root
     * @param {!Array.<!Protocol.DOM.NodeId>=} nodeIds
     */
    function inlineStylesReceived(root, nodeIds) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!nodeIds)
        return;
      domModel.querySelectorAll(
          root.id, 'body link[rel~=\'stylesheet\'][href]', externalStylesheetsReceived.bind(null, root, nodeIds));
    }

    /**
     * @param {!SDK.DOMNode} root
     */
    function onDocumentAvailable(root) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      domModel.querySelectorAll(root.id, 'body style', inlineStylesReceived.bind(null, root));
    }

    domModel.requestDocument(onDocumentAvailable);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.StylesScriptsOrderRule = class extends Audits.AuditRule {
  constructor() {
    super('page-stylescriptorder', Common.UIString('Optimize the order of styles and scripts'));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (!domModel) {
      callback(null);
      return;
    }

    function evalCallback(resultValue) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!resultValue)
        return callback(null);

      var lateCssUrls = resultValue[0];
      var cssBeforeInlineCount = resultValue[1];

      if (lateCssUrls.length) {
        var entry = result.addChild(
            Common.UIString(
                'The following external CSS files were included after an external JavaScript file in the document head. To ensure CSS files are downloaded in parallel, always include external CSS before external JavaScript.'),
            true);
        entry.addURLs(lateCssUrls);
        result.violationCount += lateCssUrls.length;
      }

      if (cssBeforeInlineCount) {
        result.addChild(Common.UIString(
            ' %d inline script block%s found in the head between an external CSS file and another resource. To allow parallel downloading, move the inline script before the external CSS file, or after the next resource.',
            cssBeforeInlineCount, cssBeforeInlineCount > 1 ? 's were' : ' was'));
        result.violationCount += cssBeforeInlineCount;
      }
      callback(result);
    }

    /**
     * @param {!Array.<!Protocol.DOM.NodeId>} lateStyleIds
     * @param {!Array.<!Protocol.DOM.NodeId>=} nodeIds
     */
    function cssBeforeInlineReceived(lateStyleIds, nodeIds) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!nodeIds)
        return;

      var cssBeforeInlineCount = nodeIds.length;
      var result = null;
      if (lateStyleIds.length || cssBeforeInlineCount) {
        var lateStyleUrls = [];
        for (var i = 0; i < lateStyleIds.length; ++i) {
          var lateStyleNode = domModel.nodeForId(lateStyleIds[i]);
          var completeHref =
              Common.ParsedURL.completeURL(lateStyleNode.ownerDocument.baseURL, lateStyleNode.getAttribute('href'));
          lateStyleUrls.push(completeHref || '<empty>');
        }
        result = [lateStyleUrls, cssBeforeInlineCount];
      }

      evalCallback(result);
    }

    /**
     * @param {!SDK.DOMDocument} root
     * @param {!Array.<!Protocol.DOM.NodeId>=} nodeIds
     */
    function lateStylesReceived(root, nodeIds) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      if (!nodeIds)
        return;

      domModel.querySelectorAll(
          root.id, 'head link[rel~=\'stylesheet\'][href] ~ script:not([src])',
          cssBeforeInlineReceived.bind(null, nodeIds));
    }

    /**
     * @param {!SDK.DOMDocument} root
     */
    function onDocumentAvailable(root) {
      if (progress.isCanceled()) {
        callback(null);
        return;
      }

      domModel.querySelectorAll(
          root.id, 'head script[src] ~ link[rel~=\'stylesheet\'][href]', lateStylesReceived.bind(null, root));
    }

    domModel.requestDocument(onDocumentAvailable);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CSSRuleBase = class extends Audits.AuditRule {
  constructor(id, name) {
    super(id, name);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var cssModel = target.model(SDK.CSSModel);
    if (!cssModel) {
      callback(null);
      return;
    }

    var headers = cssModel.allStyleSheets();
    if (!headers.length) {
      callback(null);
      return;
    }
    var activeHeaders = [];
    for (var i = 0; i < headers.length; ++i) {
      if (!headers[i].disabled)
        activeHeaders.push(headers[i]);
    }

    var styleSheetProcessor = new Audits.AuditRules.StyleSheetProcessor(
        activeHeaders, progress, this._styleSheetsLoaded.bind(this, result, callback, progress));
    styleSheetProcessor.run();
  }

  /**
   * @param {!Audits.AuditRuleResult} result
   * @param {function(!Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   * @param {!Array.<!Audits.AuditRules.ParsedStyleSheet>} styleSheets
   */
  _styleSheetsLoaded(result, callback, progress, styleSheets) {
    for (var i = 0; i < styleSheets.length; ++i)
      this._visitStyleSheet(styleSheets[i], result);
    callback(result);
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Audits.AuditRuleResult} result
   */
  _visitStyleSheet(styleSheet, result) {
    this.visitStyleSheet(styleSheet, result);

    for (var i = 0; i < styleSheet.rules.length; ++i)
      this._visitRule(styleSheet, styleSheet.rules[i], result);

    this.didVisitStyleSheet(styleSheet, result);
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Common.FormatterWorkerPool.CSSStyleRule} rule
   * @param {!Audits.AuditRuleResult} result
   */
  _visitRule(styleSheet, rule, result) {
    this.visitRule(styleSheet, rule, result);
    var allProperties = rule.properties;
    for (var i = 0; i < allProperties.length; ++i)
      this.visitProperty(styleSheet, rule, allProperties[i], result);
    this.didVisitRule(styleSheet, rule, result);
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Audits.AuditRuleResult} result
   */
  visitStyleSheet(styleSheet, result) {
    // Subclasses can implement.
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Audits.AuditRuleResult} result
   */
  didVisitStyleSheet(styleSheet, result) {
    // Subclasses can implement.
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Common.FormatterWorkerPool.CSSStyleRule} rule
   * @param {!Audits.AuditRuleResult} result
   */
  visitRule(styleSheet, rule, result) {
    // Subclasses can implement.
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Common.FormatterWorkerPool.CSSStyleRule} rule
   * @param {!Audits.AuditRuleResult} result
   */
  didVisitRule(styleSheet, rule, result) {
    // Subclasses can implement.
  }

  /**
   * @param {!Audits.AuditRules.ParsedStyleSheet} styleSheet
   * @param {!Common.FormatterWorkerPool.CSSStyleRule} rule
   * @param {!Common.FormatterWorkerPool.CSSProperty} property
   * @param {!Audits.AuditRuleResult} result
   */
  visitProperty(styleSheet, rule, property, result) {
    // Subclasses can implement.
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CookieRuleBase = class extends Audits.AuditRule {
  constructor(id, name) {
    super(id, name);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(!Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    var self = this;
    function resultCallback(receivedCookies) {
      if (progress.isCanceled()) {
        callback(result);
        return;
      }

      self.processCookies(receivedCookies, requests, result);
      callback(result);
    }

    const nonDataUrls = requests.map(r => r.url()).filter(url => url && url.asParsedURL());
    SDK.CookieModel.fromTarget(target).getCookiesAsync(nonDataUrls, resultCallback);
  }

  mapResourceCookies(requestsByDomain, allCookies, callback) {
    for (var i = 0; i < allCookies.length; ++i) {
      for (var requestDomain in requestsByDomain) {
        if (SDK.CookieModel.cookieDomainMatchesResourceDomain(allCookies[i].domain(), requestDomain))
          this._callbackForResourceCookiePairs(requestsByDomain[requestDomain], allCookies[i], callback);
      }
    }
  }

  _callbackForResourceCookiePairs(requests, cookie, callback) {
    if (!requests)
      return;
    for (var i = 0; i < requests.length; ++i) {
      if (SDK.CookieModel.cookieMatchesResourceURL(cookie, requests[i].url()))
        callback(requests[i], cookie);
    }
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.CookieSizeRule = class extends Audits.AuditRules.CookieRuleBase {
  constructor(avgBytesThreshold) {
    super('http-cookiesize', Common.UIString('Minimize cookie size'));
    this._avgBytesThreshold = avgBytesThreshold;
    this._maxBytesThreshold = 1000;
  }

  _average(cookieArray) {
    var total = 0;
    for (var i = 0; i < cookieArray.length; ++i)
      total += cookieArray[i].size();
    return cookieArray.length ? Math.round(total / cookieArray.length) : 0;
  }

  _max(cookieArray) {
    var result = 0;
    for (var i = 0; i < cookieArray.length; ++i)
      result = Math.max(cookieArray[i].size(), result);
    return result;
  }

  processCookies(allCookies, requests, result) {
    function maxSizeSorter(a, b) {
      return b.maxCookieSize - a.maxCookieSize;
    }

    function avgSizeSorter(a, b) {
      return b.avgCookieSize - a.avgCookieSize;
    }

    var cookiesPerResourceDomain = {};

    function collectorCallback(request, cookie) {
      var cookies = cookiesPerResourceDomain[request.parsedURL.host];
      if (!cookies) {
        cookies = [];
        cookiesPerResourceDomain[request.parsedURL.host] = cookies;
      }
      cookies.push(cookie);
    }

    if (!allCookies.length)
      return;

    var sortedCookieSizes = [];

    var domainToResourcesMap = Audits.AuditRules.getDomainToResourcesMap(requests, null, true);
    this.mapResourceCookies(domainToResourcesMap, allCookies, collectorCallback);

    for (var requestDomain in cookiesPerResourceDomain) {
      var cookies = cookiesPerResourceDomain[requestDomain];
      sortedCookieSizes.push(
          {domain: requestDomain, avgCookieSize: this._average(cookies), maxCookieSize: this._max(cookies)});
    }
    var avgAllCookiesSize = this._average(allCookies);

    var hugeCookieDomains = [];
    sortedCookieSizes.sort(maxSizeSorter);

    for (var i = 0, len = sortedCookieSizes.length; i < len; ++i) {
      var maxCookieSize = sortedCookieSizes[i].maxCookieSize;
      if (maxCookieSize > this._maxBytesThreshold) {
        hugeCookieDomains.push(
            Audits.AuditRuleResult.resourceDomain(sortedCookieSizes[i].domain) + ': ' +
            Number.bytesToString(maxCookieSize));
      }
    }

    var bigAvgCookieDomains = [];
    sortedCookieSizes.sort(avgSizeSorter);
    for (var i = 0, len = sortedCookieSizes.length; i < len; ++i) {
      var domain = sortedCookieSizes[i].domain;
      var avgCookieSize = sortedCookieSizes[i].avgCookieSize;
      if (avgCookieSize > this._avgBytesThreshold && avgCookieSize < this._maxBytesThreshold) {
        bigAvgCookieDomains.push(
            Audits.AuditRuleResult.resourceDomain(domain) + ': ' + Number.bytesToString(avgCookieSize));
      }
    }
    result.addChild(Common.UIString(
        'The average cookie size for all requests on this page is %s', Number.bytesToString(avgAllCookiesSize)));

    if (hugeCookieDomains.length) {
      var entry = result.addChild(
          Common.UIString(
              'The following domains have a cookie size in excess of 1KB. This is harmful because requests with cookies larger than 1KB typically cannot fit into a single network packet.'),
          true);
      entry.addURLs(hugeCookieDomains);
      result.violationCount += hugeCookieDomains.length;
    }

    if (bigAvgCookieDomains.length) {
      var entry = result.addChild(
          Common.UIString(
              'The following domains have an average cookie size in excess of %d bytes. Reducing the size of cookies for these domains can reduce the time it takes to send requests.',
              this._avgBytesThreshold),
          true);
      entry.addURLs(bigAvgCookieDomains);
      result.violationCount += bigAvgCookieDomains.length;
    }
  }
};

/**
 * @unrestricted
 */
Audits.AuditRules.StaticCookielessRule = class extends Audits.AuditRules.CookieRuleBase {
  constructor(minResources) {
    super('http-staticcookieless', Common.UIString('Serve static content from a cookieless domain'));
    this._minResources = minResources;
  }

  processCookies(allCookies, requests, result) {
    var domainToResourcesMap = Audits.AuditRules.getDomainToResourcesMap(
        requests, [Common.resourceTypes.Stylesheet, Common.resourceTypes.Image], true);
    var totalStaticResources = 0;
    for (var domain in domainToResourcesMap)
      totalStaticResources += domainToResourcesMap[domain].length;
    if (totalStaticResources < this._minResources)
      return;
    /** @type {!Object<string, number>} */
    var matchingResourceData = {};
    this.mapResourceCookies(domainToResourcesMap, allCookies, this._collectorCallback.bind(this, matchingResourceData));

    var badUrls = [];
    var cookieBytes = 0;
    for (var url in matchingResourceData) {
      badUrls.push(url);
      cookieBytes += matchingResourceData[url];
    }
    if (badUrls.length < this._minResources)
      return;

    var entry = result.addChild(
        Common.UIString(
            '%s of cookies were sent with the following static resources. Serve these static resources from a domain that does not set cookies:',
            Number.bytesToString(cookieBytes)),
        true);
    entry.addURLs(badUrls);
    result.violationCount = badUrls.length;
  }

  /**
   * @param {!Object<string, number>} matchingResourceData
   * @param {!SDK.NetworkRequest} request
   * @param {!SDK.Cookie} cookie
   */
  _collectorCallback(matchingResourceData, request, cookie) {
    matchingResourceData[request.url()] = (matchingResourceData[request.url()] || 0) + cookie.size();
  }
};
