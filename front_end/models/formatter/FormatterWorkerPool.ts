// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';  // eslint-disable-line rulesdir/es_modules_import
export {DefinitionKind, type ScopeTreeNode} from '../../entrypoints/formatter_worker/FormatterActions.js';

const MAX_WORKERS = Math.min(2, navigator.hardwareConcurrency - 1);

let formatterWorkerPoolInstance: FormatterWorkerPool;

export class FormatterWorkerPool {
  private taskQueue: Task[];
  private workerTasks: Map<Common.Worker.WorkerWrapper, Task|null>;

  constructor() {
    this.taskQueue = [];
    this.workerTasks = new Map();
  }

  static instance(): FormatterWorkerPool {
    if (!formatterWorkerPoolInstance) {
      formatterWorkerPoolInstance = new FormatterWorkerPool();
    }

    return formatterWorkerPoolInstance;
  }

  private createWorker(): Common.Worker.WorkerWrapper {
    const worker = Common.Worker.WorkerWrapper.fromURL(
        new URL('../../entrypoints/formatter_worker/formatter_worker-entrypoint.js', import.meta.url));
    worker.onmessage = this.onWorkerMessage.bind(this, worker);
    worker.onerror = this.onWorkerError.bind(this, worker);
    return worker;
  }

  private processNextTask(): void {
    if (!this.taskQueue.length) {
      return;
    }

    let freeWorker = [...this.workerTasks.keys()].find(worker => !this.workerTasks.get(worker));
    if (!freeWorker && this.workerTasks.size < MAX_WORKERS) {
      freeWorker = this.createWorker();
    }
    if (!freeWorker) {
      return;
    }

    const task = this.taskQueue.shift();
    if (task) {
      this.workerTasks.set(freeWorker, task);
      freeWorker.postMessage({method: task.method, params: task.params});
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onWorkerMessage(worker: Common.Worker.WorkerWrapper, event: MessageEvent<any>): void {
    const task = this.workerTasks.get(worker);
    if (!task) {
      return;
    }
    if (task.isChunked && event.data && !event.data['isLastChunk']) {
      task.callback(event.data);
      return;
    }

    this.workerTasks.set(worker, null);
    this.processNextTask();
    task.callback(event.data ? event.data : null);
  }

  private onWorkerError(worker: Common.Worker.WorkerWrapper, event: Event): void {
    console.error(event);
    const task = this.workerTasks.get(worker);
    worker.terminate();
    this.workerTasks.delete(worker);

    const newWorker = this.createWorker();
    this.workerTasks.set(newWorker, null);
    this.processNextTask();
    if (task) {
      task.callback(null);
    }
  }

  private runChunkedTask(
      methodName: string, params: {
        [x: string]: string,
      },
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (arg0: boolean, arg1: any) => void): void {
    const task = new Task(methodName, params, onData, true);
    this.taskQueue.push(task);
    this.processNextTask();

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

  private runTask(methodName: FormatterActions.FormatterActions, params: {
    [x: string]: unknown,
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> {
    return new Promise(resolve => {
      const task = new Task(methodName, params, resolve, false);
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  format(mimeType: string, content: string, indentString: string): Promise<FormatterActions.FormatResult> {
    const parameters = {mimeType: mimeType, content: content, indentString: indentString};
    return this.runTask(FormatterActions.FormatterActions.FORMAT, parameters) as Promise<FormatterActions.FormatResult>;
  }

  javaScriptSubstitute(expression: string, mapping: Map<string, string|null>): Promise<string> {
    return this.runTask(FormatterActions.FormatterActions.JAVASCRIPT_SUBSTITUTE, {content: expression, mapping})
        .then(result => result || '');
  }

  javaScriptScopeTree(expression: string, sourceType: 'module'|'script' = 'script'):
      Promise<FormatterActions.ScopeTreeNode|null> {
    return this.runTask(FormatterActions.FormatterActions.JAVASCRIPT_SCOPE_TREE, {content: expression, sourceType})
        .then(result => result || null);
  }

  evaluatableJavaScriptSubstring(content: string): Promise<string> {
    return this.runTask(FormatterActions.FormatterActions.EVALUATE_JAVASCRIPT_SUBSTRING, {content: content})
        .then(text => text || '');
  }

  parseCSS(content: string, callback: (arg0: boolean, arg1: Array<CSSRule>) => void): void {
    this.runChunkedTask(FormatterActions.FormatterActions.PARSE_CSS, {content: content}, onDataChunk);

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onDataChunk(isLastChunk: boolean, data: any): void {
      const rules = (data || [] as CSSRule[]);
      callback(isLastChunk, rules);
    }
  }
}

class Task {
  method: string;
  params: unknown;
  callback: (arg0: MessageEvent|null) => void;
  isChunked: boolean|undefined;
  constructor(method: string, params: unknown, callback: (arg0: MessageEvent|null) => void, isChunked?: boolean) {
    this.method = method;
    this.params = params;
    this.callback = callback;
    this.isChunked = isChunked;
  }
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
