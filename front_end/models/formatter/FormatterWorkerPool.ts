// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';  // eslint-disable-line rulesdir/es_modules_import

const MAX_WORKERS = Math.min(2, navigator.hardwareConcurrency - 1);

let formatterWorkerPoolInstance: FormatterWorkerPool;

export class FormatterWorkerPool {
  _taskQueue: Task[];
  _workerTasks: Map<Common.Worker.WorkerWrapper, Task|null>;

  constructor() {
    this._taskQueue = [];
    this._workerTasks = new Map();
  }

  static instance(): FormatterWorkerPool {
    if (!formatterWorkerPoolInstance) {
      formatterWorkerPoolInstance = new FormatterWorkerPool();
    }

    return formatterWorkerPoolInstance;
  }

  _createWorker(): Common.Worker.WorkerWrapper {
    const worker = Common.Worker.WorkerWrapper.fromURL(
        new URL('../../entrypoints/formatter_worker/formatter_worker-entrypoint.js', import.meta.url));
    worker.onmessage = this._onWorkerMessage.bind(this, worker);
    worker.onerror = this._onWorkerError.bind(this, worker);
    return worker;
  }

  _processNextTask(): void {
    if (!this._taskQueue.length) {
      return;
    }

    let freeWorker = [...this._workerTasks.keys()].find(worker => !this._workerTasks.get(worker));
    if (!freeWorker && this._workerTasks.size < MAX_WORKERS) {
      freeWorker = this._createWorker();
    }
    if (!freeWorker) {
      return;
    }

    const task = this._taskQueue.shift();
    if (task) {
      this._workerTasks.set(freeWorker, task);
      freeWorker.postMessage({method: task.method, params: task.params});
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _onWorkerMessage(worker: Common.Worker.WorkerWrapper, event: MessageEvent<any>): void {
    const task = this._workerTasks.get(worker);
    if (!task) {
      return;
    }
    if (task.isChunked && event.data && !event.data['isLastChunk']) {
      task.callback(event.data);
      return;
    }

    this._workerTasks.set(worker, null);
    this._processNextTask();
    task.callback(event.data ? event.data : null);
  }

  _onWorkerError(worker: Common.Worker.WorkerWrapper, event: Event): void {
    console.error(event);
    const task = this._workerTasks.get(worker);
    worker.terminate();
    this._workerTasks.delete(worker);

    const newWorker = this._createWorker();
    this._workerTasks.set(newWorker, null);
    this._processNextTask();
    if (task) {
      task.callback(null);
    }
  }

  _runChunkedTask(
      methodName: string, params: {
        [x: string]: string,
      },
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (arg0: boolean, arg1: any) => void): void {
    const task = new Task(methodName, params, onData, true);
    this._taskQueue.push(task);
    this._processNextTask();

    function onData(data: Object|null): void {
      if (!data) {
        callback(true, null);
        return;
      }
      const isLastChunk = 'isLastChunk' in data && Boolean(data['isLastChunk']);
      const chunk = 'chunk' in data && data['chunk'];
      callback(isLastChunk, chunk);
    }
  }

  _runTask(methodName: FormatterActions.FormatterActions, params: {
    [x: string]: string,
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> {
    return new Promise(resolve => {
      const task = new Task(methodName, params, resolve, false);
      this._taskQueue.push(task);
      this._processNextTask();
    });
  }

  format(mimeType: string, content: string, indentString: string): Promise<FormatResult> {
    const parameters = {mimeType: mimeType, content: content, indentString: indentString};
    return /** @type {!Promise<!FormatResult>} */ this._runTask(FormatterActions.FormatterActions.FORMAT, parameters) as
        Promise<FormatResult>;
  }

  javaScriptIdentifiers(content: string): Promise<{
    name: string,
    offset: number,
  }[]> {
    return this._runTask(FormatterActions.FormatterActions.JAVASCRIPT_IDENTIFIERS, {content: content})
        .then(ids => ids || []);
  }

  evaluatableJavaScriptSubstring(content: string): Promise<string> {
    return this._runTask(FormatterActions.FormatterActions.EVALUATE_JAVASCRIPT_SUBSTRING, {content: content})
        .then(text => text || '');
  }

  parseCSS(content: string, callback: (arg0: boolean, arg1: Array<CSSRule>) => void): void {
    this._runChunkedTask(FormatterActions.FormatterActions.PARSE_CSS, {content: content}, onDataChunk);

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onDataChunk(isLastChunk: boolean, data: any): void {
      const rules = (data || [] as CSSRule[]);
      callback(isLastChunk, rules);
    }
  }

  outlineForMimetype(content: string, mimeType: string, callback: (arg0: boolean, arg1: Array<OutlineItem>) => void):
      boolean {
    switch (mimeType) {
      case 'text/html':
        this._runChunkedTask(FormatterActions.FormatterActions.HTML_OUTLINE, {content: content}, callback);
        return true;
      case 'text/javascript':
        this._runChunkedTask(FormatterActions.FormatterActions.JAVASCRIPT_OUTLINE, {content: content}, callback);
        return true;
      case 'text/css':
        this.parseCSS(content, cssCallback);
        return true;
    }
    return false;

    function cssCallback(isLastChunk: boolean, rules: CSSRule[]): void {
      callback(isLastChunk, rules.map(rule => {
        const title = 'selectorText' in rule ? rule.selectorText : rule.atRule;
        return {line: rule.lineNumber, subtitle: undefined, column: rule.columnNumber, title};
      }));
    }
  }

  findLastExpression(content: string): Promise<string|null> {
    return this._runTask(FormatterActions.FormatterActions.FIND_LAST_EXPRESSION, {content}) as Promise<string|null>;
  }

  findLastFunctionCall(content: string): Promise<{
    baseExpression: string,
    receiver: string,
    argumentIndex: number,
    functionName: string,
  }|null> {
    return this._runTask(FormatterActions.FormatterActions.FIND_LAST_FUNCTION_CALL, {content}) as Promise<{
             baseExpression: string,
             receiver: string,
             argumentIndex: number,
             functionName: string,
           }|null>;
  }

  argumentsList(content: string): Promise<string[]> {
    return this._runTask(FormatterActions.FormatterActions.ARGUMENTS_LIST, {content}) as Promise<string[]>;
  }
}

class Task {
  method: string;
  params: {
    [x: string]: string,
  };
  callback: (arg0: MessageEvent|null) => void;
  isChunked: boolean|undefined;
  constructor(
      method: string, params: {
        [x: string]: string,
      },
      callback: (arg0: MessageEvent|null) => void, isChunked?: boolean) {
    this.method = method;
    this.params = params;
    this.callback = callback;
    this.isChunked = isChunked;
  }
}

export interface FormatResult {
  content: string;
  mapping: FormatMapping;
}

interface CSSProperty {
  name: string;
  nameRange: TextRange;
  value: string;
  valueRange: TextRange;
  range: TextRange;
  disabled?: boolean;
}

export function formatterWorkerPool(): FormatterWorkerPool {
  return FormatterWorkerPool.instance();
}

export interface OutlineItem {
  line: number;
  column: number;
  title: string;
  subtitle?: string;
}

export interface FormatMapping {
  original: number[];
  formatted: number[];
}

export interface CSSStyleRule {
  selectorText: string;
  styleRange: TextRange;
  lineNumber: number;
  columnNumber: number;
  properties: CSSProperty[];
}

export interface CSSAtRule {
  atRule: string;
  lineNumber: number;
  columnNumber: number;
}

export type CSSRule = CSSStyleRule|CSSAtRule;

export interface TextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
