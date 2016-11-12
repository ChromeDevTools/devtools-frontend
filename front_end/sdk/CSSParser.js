/**
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
SDK.CSSParser = class extends Common.Object {
  constructor() {
    super();
    this._rules = [];
    this._terminated = false;
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} styleSheetHeader
   * @param {function(!Array.<!SDK.CSSParser.Rule>)=} callback
   */
  fetchAndParse(styleSheetHeader, callback) {
    this._lock();
    this._finishedCallback = callback;
    styleSheetHeader.requestContent().then(this._innerParse.bind(this));
  }

  /**
   * @param {string} text
   * @param {function(!Array.<!SDK.CSSParser.Rule>)=} callback
   */
  parse(text, callback) {
    this._lock();
    this._finishedCallback = callback;
    this._innerParse(text);
  }

  /**
   * @param {string} text
   * @return {!Promise<!Array.<!SDK.CSSParser.Rule>>}
   */
  parsePromise(text) {
    return new Promise(promiseConstructor.bind(this));

    /**
     * @param {function()} succ
     * @param {function()} fail
     * @this {SDK.CSSParser}
     */
    function promiseConstructor(succ, fail) {
      this.parse(text, succ);
    }
  }

  dispose() {
    if (this._terminated)
      return;
    this._terminated = true;
    this._runFinishedCallback([]);
  }

  /**
   * @return {!Array.<!SDK.CSSParser.Rule>}
   */
  rules() {
    return this._rules;
  }

  _lock() {
    console.assert(!this._parsingStyleSheet, 'Received request to parse stylesheet before previous was completed.');
    this._parsingStyleSheet = true;
  }

  _unlock() {
    delete this._parsingStyleSheet;
  }

  /**
   * @param {?string} text
   */
  _innerParse(text) {
    this._rules = [];
    var params = {content: text};
    Common.formatterWorkerPool.runChunkedTask('parseCSS', params, this._onRuleChunk.bind(this));
  }

  /**
   * @param {?MessageEvent} event
   */
  _onRuleChunk(event) {
    if (this._terminated)
      return;
    if (!event) {
      this._onFinishedParsing();
      this.dispatchEventToListeners(SDK.CSSParser.Events.RulesParsed);
      return;
    }
    var data = /** @type {!SDK.CSSParser.DataChunk} */ (event.data);
    var chunk = data.chunk;
    for (var i = 0; i < chunk.length; ++i)
      this._rules.push(chunk[i]);

    if (data.isLastChunk)
      this._onFinishedParsing();
    this.dispatchEventToListeners(SDK.CSSParser.Events.RulesParsed);
  }

  _onFinishedParsing() {
    this._unlock();
    this._runFinishedCallback(this._rules);
  }

  /**
   * @param {!Array<!SDK.CSSRule>} rules
   */
  _runFinishedCallback(rules) {
    var callback = this._finishedCallback;
    delete this._finishedCallback;
    if (callback)
      callback.call(null, rules);
  }
};

/** @enum {symbol} */
SDK.CSSParser.Events = {
  RulesParsed: Symbol('RulesParsed')
};

/**
 * @typedef {{isLastChunk: boolean, chunk: !Array.<!SDK.CSSParser.Rule>}}
 */
SDK.CSSParser.DataChunk;

/**
 * @unrestricted
 */
SDK.CSSParser.StyleRule = class {
  constructor() {
    /** @type {string} */
    this.selectorText;
    /** @type {!SDK.CSSParser.Range} */
    this.styleRange;
    /** @type {number} */
    this.lineNumber;
    /** @type {number} */
    this.columnNumber;
    /** @type {!Array.<!SDK.CSSParser.Property>} */
    this.properties;
  }
};

/**
 * @typedef {{atRule: string, lineNumber: number, columnNumber: number}}
 */
SDK.CSSParser.AtRule;

/**
 * @typedef {(SDK.CSSParser.StyleRule|SDK.CSSParser.AtRule)}
 */
SDK.CSSParser.Rule;

/**
 * @typedef {{startLine: number, startColumn: number, endLine: number, endColumn: number}}
 */
SDK.CSSParser.Range;

/**
 * @unrestricted
 */
SDK.CSSParser.Property = class {
  constructor() {
    /** @type {string} */
    this.name;
    /** @type {!SDK.CSSParser.Range} */
    this.nameRange;
    /** @type {string} */
    this.value;
    /** @type {!SDK.CSSParser.Range} */
    this.valueRange;
    /** @type {!SDK.CSSParser.Range} */
    this.range;
    /** @type {(boolean|undefined)} */
    this.disabled;
  }
};
