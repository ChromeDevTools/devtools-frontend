// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Common.FormatterWorkerPool = class {
  constructor() {
    this._taskQueue = [];
    /** @type {!Map<!Common.Worker, ?Common.FormatterWorkerPool.Task>} */
    this._workerTasks = new Map();
  }

  /**
   * @return {!Common.Worker}
   */
  _createWorker() {
    var worker = new Common.Worker('formatter_worker');
    worker.onmessage = this._onWorkerMessage.bind(this, worker);
    worker.onerror = this._onWorkerError.bind(this, worker);
    return worker;
  }

  _processNextTask() {
    if (!this._taskQueue.length)
      return;

    var freeWorker = this._workerTasks.keysArray().find(worker => !this._workerTasks.get(worker));
    if (!freeWorker && this._workerTasks.size < Common.FormatterWorkerPool.MaxWorkers)
      freeWorker = this._createWorker();
    if (!freeWorker)
      return;

    var task = this._taskQueue.shift();
    this._workerTasks.set(freeWorker, task);
    freeWorker.postMessage({method: task.method, params: task.params});
  }

  /**
   * @param {!Common.Worker} worker
   * @param {!MessageEvent} event
   */
  _onWorkerMessage(worker, event) {
    var task = this._workerTasks.get(worker);
    if (task.isChunked && event.data && !event.data['isLastChunk']) {
      task.callback(event.data);
      return;
    }

    this._workerTasks.set(worker, null);
    this._processNextTask();
    task.callback(event.data ? event.data : null);
  }

  /**
   * @param {!Common.Worker} worker
   * @param {!Event} event
   */
  _onWorkerError(worker, event) {
    console.error(event);
    var task = this._workerTasks.get(worker);
    worker.terminate();
    this._workerTasks.delete(worker);

    var newWorker = this._createWorker();
    this._workerTasks.set(newWorker, null);
    this._processNextTask();
    task.callback(null);
  }

  /**
   * @param {string} methodName
   * @param {!Object<string, string>} params
   * @param {function(boolean, *)} callback
   */
  _runChunkedTask(methodName, params, callback) {
    var task = new Common.FormatterWorkerPool.Task(methodName, params, onData, true);
    this._taskQueue.push(task);
    this._processNextTask();

    /**
     * @param {?Object} data
     */
    function onData(data) {
      if (!data) {
        callback(true, null);
        return;
      }
      var isLastChunk = !!data['isLastChunk'];
      var chunk = data['chunk'];
      callback(isLastChunk, chunk);
    }
  }

  /**
   * @param {string} methodName
   * @param {!Object<string, string>} params
   * @return {!Promise<*>}
   */
  _runTask(methodName, params) {
    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    var task = new Common.FormatterWorkerPool.Task(methodName, params, callback, false);
    this._taskQueue.push(task);
    this._processNextTask();
    return promise;
  }

  /**
   * @param {string} content
   * @return {!Promise<*>}
   */
  parseJSONRelaxed(content) {
    return this._runTask('parseJSONRelaxed', {content: content});
  }

  /**
   * @param {string} content
   * @return {!Promise<!Array<!Common.FormatterWorkerPool.SCSSRule>>}
   */
  parseSCSS(content) {
    return this._runTask('parseSCSS', {content: content}).then(rules => rules || []);
  }

  /**
   * @param {string} mimeType
   * @param {string} content
   * @param {string} indentString
   * @return {!Promise<!Common.FormatterWorkerPool.FormatResult>}
   */
  format(mimeType, content, indentString) {
    var parameters = {mimeType: mimeType, content: content, indentString: indentString};
    return /** @type {!Promise<!Common.FormatterWorkerPool.FormatResult>} */ (this._runTask('format', parameters));
  }

  /**
   * @param {string} content
   * @return {!Promise<!Array<!{name: string, offset: number}>>}
   */
  javaScriptIdentifiers(content) {
    return this._runTask('javaScriptIdentifiers', {content: content}).then(ids => ids || []);
  }

  /**
   * @param {string} content
   * @return {!Promise<string>}
   */
  evaluatableJavaScriptSubstring(content) {
    return this._runTask('evaluatableJavaScriptSubstring', {content: content}).then(text => text || '');
  }

  /**
   * @param {string} content
   * @param {function(boolean, !Array<!Common.FormatterWorkerPool.CSSRule>)} callback
   */
  parseCSS(content, callback) {
    this._runChunkedTask('parseCSS', {content: content}, onDataChunk);

    /**
     * @param {boolean} isLastChunk
     * @param {*} data
     */
    function onDataChunk(isLastChunk, data) {
      var rules = /** @type {!Array<!Common.FormatterWorkerPool.CSSRule>} */ (data || []);
      callback(isLastChunk, rules);
    }
  }

  /**
   * @param {string} content
   * @param {function(boolean, !Array<!Common.FormatterWorkerPool.JSOutlineItem>)} callback
   */
  javaScriptOutline(content, callback) {
    this._runChunkedTask('javaScriptOutline', {content: content}, onDataChunk);

    /**
     * @param {boolean} isLastChunk
     * @param {*} data
     */
    function onDataChunk(isLastChunk, data) {
      var items = /** @type {!Array.<!Common.FormatterWorkerPool.JSOutlineItem>} */ (data || []);
      callback(isLastChunk, items);
    }
  }
};

Common.FormatterWorkerPool.MaxWorkers = 2;

/**
 * @unrestricted
 */
Common.FormatterWorkerPool.Task = class {
  /**
   * @param {string} method
   * @param {!Object<string, string>} params
   * @param {function(?MessageEvent)} callback
   * @param {boolean=} isChunked
   */
  constructor(method, params, callback, isChunked) {
    this.method = method;
    this.params = params;
    this.callback = callback;
    this.isChunked = isChunked;
  }
};

Common.FormatterWorkerPool.FormatResult = class {
  constructor() {
    /** @type {string} */
    this.content;
    /** @type {!Common.FormatterWorkerPool.FormatMapping} */
    this.mapping;
  }
};

/** @typedef {{original: !Array<number>, formatted: !Array<number>}} */
Common.FormatterWorkerPool.FormatMapping;

Common.FormatterWorkerPool.JSOutlineItem = class {
  constructor() {
    /** @type {string} */
    this.name;
    /** @type {(string|undefined)} */
    this.arguments;
    /** @type {number} */
    this.line;
    /** @type {number} */
    this.column;
  }
};

/**
 * @typedef {{startLine: number, startColumn: number, endLine: number, endColumn: number}}
 */
Common.FormatterWorkerPool.TextRange;

Common.FormatterWorkerPool.CSSProperty = class {
  constructor() {
    /** @type {string} */
    this.name;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.nameRange;
    /** @type {string} */
    this.value;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.valueRange;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.range;
    /** @type {(boolean|undefined)} */
    this.disabled;
  }
};

Common.FormatterWorkerPool.CSSStyleRule = class {
  constructor() {
    /** @type {string} */
    this.selectorText;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.styleRange;
    /** @type {number} */
    this.lineNumber;
    /** @type {number} */
    this.columnNumber;
    /** @type {!Array.<!Common.FormatterWorkerPool.CSSProperty>} */
    this.properties;
  }
};

/**
 * @typedef {{atRule: string, lineNumber: number, columnNumber: number}}
 */
Common.FormatterWorkerPool.CSSAtRule;

/**
 * @typedef {(Common.FormatterWorkerPool.CSSStyleRule|Common.FormatterWorkerPool.CSSAtRule)}
 */
Common.FormatterWorkerPool.CSSRule;

Common.FormatterWorkerPool.SCSSProperty = class {
  constructor() {
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.range;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.name;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.value;
    /** @type {boolean} */
    this.disabled;
  }
};

Common.FormatterWorkerPool.SCSSRule = class {
  constructor() {
    /** @type {!Array<!Common.FormatterWorkerPool.TextRange>} */
    this.selectors;
    /** @type {!Array<!Common.FormatterWorkerPool.SCSSProperty>} */
    this.properties;
    /** @type {!Common.FormatterWorkerPool.TextRange} */
    this.styleRange;
  }
};

/** @type {!Common.FormatterWorkerPool} */
Common.formatterWorkerPool;
