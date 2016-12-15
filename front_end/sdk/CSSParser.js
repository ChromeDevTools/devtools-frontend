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
   * @param {function(!Array.<!Common.FormatterWorkerPool.CSSRule>)=} callback
   */
  fetchAndParse(styleSheetHeader, callback) {
    this._lock();
    this._finishedCallback = callback;
    styleSheetHeader.requestContent().then(this._innerParse.bind(this));
  }

  /**
   * @param {string} text
   * @param {function(!Array.<!Common.FormatterWorkerPool.CSSRule>)=} callback
   */
  parse(text, callback) {
    this._lock();
    this._finishedCallback = callback;
    this._innerParse(text);
  }

  /**
   * @param {string} text
   * @return {!Promise<!Array.<!Common.FormatterWorkerPool.CSSRule>>}
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
   * @return {!Array.<!Common.FormatterWorkerPool.CSSRule>}
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
    Common.formatterWorkerPool.parseCSS(text || '', this._onRuleChunk.bind(this));
  }

  /**
   * @param {boolean} isLastChunk
   * @param {!Array.<!Common.FormatterWorkerPool.CSSRule>} rules
   */
  _onRuleChunk(isLastChunk, rules) {
    if (this._terminated)
      return;
    this._rules = this._rules.concat(rules);
    if (isLastChunk)
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
