// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.FormatterWorkerPool = class {
  constructor() {
    this._taskQueue = [];
    /** @type {!Map<!WebInspector.Worker, ?WebInspector.FormatterWorkerPool.Task>} */
    this._workerTasks = new Map();
  }

  /**
   * @return {!WebInspector.Worker}
   */
  _createWorker() {
    var worker = new WebInspector.Worker('formatter_worker');
    worker.onmessage = this._onWorkerMessage.bind(this, worker);
    worker.onerror = this._onWorkerError.bind(this, worker);
    return worker;
  }

  _processNextTask() {
    if (!this._taskQueue.length)
      return;

    var freeWorker = this._workerTasks.keysArray().find(worker => !this._workerTasks.get(worker));
    if (!freeWorker && this._workerTasks.size < WebInspector.FormatterWorkerPool.MaxWorkers)
      freeWorker = this._createWorker();
    if (!freeWorker)
      return;

    var task = this._taskQueue.shift();
    this._workerTasks.set(freeWorker, task);
    freeWorker.postMessage({method: task.method, params: task.params});
  }

  /**
   * @param {!WebInspector.Worker} worker
   * @param {!MessageEvent} event
   */
  _onWorkerMessage(worker, event) {
    var task = this._workerTasks.get(worker);
    if (task.isChunked && event.data && !event.data['isLastChunk']) {
      task.callback(event);
      return;
    }

    this._workerTasks.set(worker, null);
    this._processNextTask();
    task.callback(event.data ? event : null);
  }

  /**
   * @param {!WebInspector.Worker} worker
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
   * @param {function(?MessageEvent)} callback
   */
  runChunkedTask(methodName, params, callback) {
    var task = new WebInspector.FormatterWorkerPool.Task(methodName, params, callback, true);
    this._taskQueue.push(task);
    this._processNextTask();
  }

  /**
   * @param {string} methodName
   * @param {!Object<string, string>} params
   * @return {!Promise<?MessageEvent>}
   */
  runTask(methodName, params) {
    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    var task = new WebInspector.FormatterWorkerPool.Task(methodName, params, callback, false);
    this._taskQueue.push(task);
    this._processNextTask();
    return promise;
  }
};

WebInspector.FormatterWorkerPool.MaxWorkers = 2;

/**
 * @unrestricted
 */
WebInspector.FormatterWorkerPool.Task = class {
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

/** @type {!WebInspector.FormatterWorkerPool} */
WebInspector.formatterWorkerPool;
