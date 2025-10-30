var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/formatter/FormatterWorkerPool.js
var FormatterWorkerPool_exports = {};
__export(FormatterWorkerPool_exports, {
  FormatterWorkerPool: () => FormatterWorkerPool,
  formatterWorkerPool: () => formatterWorkerPool
});
import * as Common from "./../../core/common/common.js";
var formatterWorkerPoolInstance;
var FormatterWorkerPool = class _FormatterWorkerPool {
  taskQueue;
  workerTasks;
  constructor() {
    this.taskQueue = [];
    this.workerTasks = /* @__PURE__ */ new Map();
  }
  static instance() {
    if (!formatterWorkerPoolInstance) {
      formatterWorkerPoolInstance = new _FormatterWorkerPool();
    }
    return formatterWorkerPoolInstance;
  }
  dispose() {
    for (const task of this.taskQueue) {
      console.error("rejecting task");
      task.errorCallback(new Event("Worker terminated"));
    }
    for (const [worker, task] of this.workerTasks.entries()) {
      task?.errorCallback(new Event("Worker terminated"));
      worker.terminate(
        /* immediately=*/
        true
      );
    }
  }
  static removeInstance() {
    formatterWorkerPoolInstance?.dispose();
    formatterWorkerPoolInstance = void 0;
  }
  createWorker() {
    const worker = Common.Worker.WorkerWrapper.fromURL(new URL("../../entrypoints/formatter_worker/formatter_worker-entrypoint.js", import.meta.url));
    worker.onmessage = this.onWorkerMessage.bind(this, worker);
    worker.onerror = this.onWorkerError.bind(this, worker);
    return worker;
  }
  processNextTask() {
    const maxWorkers = Math.max(2, navigator.hardwareConcurrency - 1);
    if (!this.taskQueue.length) {
      return;
    }
    let freeWorker = [...this.workerTasks.keys()].find((worker) => !this.workerTasks.get(worker));
    if (!freeWorker && this.workerTasks.size < maxWorkers) {
      freeWorker = this.createWorker();
    }
    if (!freeWorker) {
      return;
    }
    const task = this.taskQueue.shift();
    if (task) {
      this.workerTasks.set(freeWorker, task);
      freeWorker.postMessage({ method: task.method, params: task.params });
    }
  }
  onWorkerMessage(worker, event) {
    const task = this.workerTasks.get(worker);
    if (!task) {
      return;
    }
    if (task.isChunked && event.data && !event.data["isLastChunk"]) {
      task.callback(event.data);
      return;
    }
    this.workerTasks.set(worker, null);
    this.processNextTask();
    task.callback(event.data ? event.data : null);
  }
  onWorkerError(worker, event) {
    console.error(event);
    const task = this.workerTasks.get(worker);
    worker.terminate();
    this.workerTasks.delete(worker);
    const newWorker = this.createWorker();
    this.workerTasks.set(newWorker, null);
    this.processNextTask();
    if (task) {
      task.errorCallback(event);
    }
  }
  runChunkedTask(methodName, params, callback) {
    const task = new Task(methodName, params, onData, () => onData(null), true);
    this.taskQueue.push(task);
    this.processNextTask();
    function onData(data) {
      if (!data) {
        callback(true, null);
        return;
      }
      const isLastChunk = "isLastChunk" in data && Boolean(data["isLastChunk"]);
      const chunk = "chunk" in data && data["chunk"];
      callback(isLastChunk, chunk);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runTask(methodName, params) {
    return new Promise((resolve, reject) => {
      const task = new Task(methodName, params, resolve, reject, false);
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }
  format(mimeType, content, indentString) {
    const parameters = { mimeType, content, indentString };
    return this.runTask("format", parameters);
  }
  javaScriptSubstitute(expression, mapping) {
    if (mapping.size === 0) {
      return Promise.resolve(expression);
    }
    return this.runTask("javaScriptSubstitute", { content: expression, mapping }).then((result) => result || "");
  }
  javaScriptScopeTree(expression, sourceType = "script") {
    return this.runTask("javaScriptScopeTree", { content: expression, sourceType }).then((result) => result || null);
  }
  parseCSS(content, callback) {
    this.runChunkedTask("parseCSS", { content }, onDataChunk);
    function onDataChunk(isLastChunk, data) {
      const rules = data || [];
      callback(isLastChunk, rules);
    }
  }
};
var Task = class {
  method;
  params;
  callback;
  errorCallback;
  isChunked;
  constructor(method, params, callback, errorCallback, isChunked) {
    this.method = method;
    this.params = params;
    this.callback = callback;
    this.errorCallback = errorCallback;
    this.isChunked = isChunked;
  }
};
function formatterWorkerPool() {
  return FormatterWorkerPool.instance();
}

// gen/front_end/models/formatter/ScriptFormatter.js
var ScriptFormatter_exports = {};
__export(ScriptFormatter_exports, {
  format: () => format,
  formatScriptContent: () => formatScriptContent
});
import * as Common2 from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
function locationToPosition(lineEndings, lineNumber, columnNumber) {
  const position = lineNumber ? lineEndings[lineNumber - 1] + 1 : 0;
  return position + columnNumber;
}
function positionToLocation(lineEndings, position) {
  const lineNumber = Platform.ArrayUtilities.upperBound(lineEndings, position - 1, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
  let columnNumber;
  if (!lineNumber) {
    columnNumber = position;
  } else {
    columnNumber = position - lineEndings[lineNumber - 1] - 1;
  }
  return [lineNumber, columnNumber];
}
async function format(contentType, mimeType, content, indent = Common2.Settings.Settings.instance().moduleSetting("text-editor-indent").get()) {
  if (contentType.isDocumentOrScriptOrStyleSheet()) {
    return await formatScriptContent(mimeType, content, indent);
  }
  return { formattedContent: content, formattedMapping: new IdentityFormatterSourceMapping() };
}
async function formatScriptContent(mimeType, content, indent = Common2.Settings.Settings.instance().moduleSetting("text-editor-indent").get()) {
  const originalContent = content.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, "");
  const pool = formatterWorkerPool();
  let formatResult = { content: originalContent, mapping: { original: [], formatted: [] } };
  try {
    formatResult = await pool.format(mimeType, originalContent, indent);
  } catch {
  }
  const originalContentLineEndings = Platform.StringUtilities.findLineEndingIndexes(originalContent);
  const formattedContentLineEndings = Platform.StringUtilities.findLineEndingIndexes(formatResult.content);
  const sourceMapping = new FormatterSourceMappingImpl(originalContentLineEndings, formattedContentLineEndings, formatResult.mapping);
  return { formattedContent: formatResult.content, formattedMapping: sourceMapping };
}
var IdentityFormatterSourceMapping = class {
  originalToFormatted(lineNumber, columnNumber = 0) {
    return [lineNumber, columnNumber];
  }
  formattedToOriginal(lineNumber, columnNumber = 0) {
    return [lineNumber, columnNumber];
  }
};
var FormatterSourceMappingImpl = class {
  originalLineEndings;
  formattedLineEndings;
  mapping;
  constructor(originalLineEndings, formattedLineEndings, mapping) {
    this.originalLineEndings = originalLineEndings;
    this.formattedLineEndings = formattedLineEndings;
    this.mapping = mapping;
  }
  originalToFormatted(lineNumber, columnNumber) {
    const originalPosition = locationToPosition(this.originalLineEndings, lineNumber, columnNumber || 0);
    const formattedPosition = this.convertPosition(this.mapping.original, this.mapping.formatted, originalPosition);
    return positionToLocation(this.formattedLineEndings, formattedPosition);
  }
  formattedToOriginal(lineNumber, columnNumber) {
    const formattedPosition = locationToPosition(this.formattedLineEndings, lineNumber, columnNumber || 0);
    const originalPosition = this.convertPosition(this.mapping.formatted, this.mapping.original, formattedPosition);
    return positionToLocation(this.originalLineEndings, originalPosition);
  }
  convertPosition(positions1, positions2, position) {
    const index = Platform.ArrayUtilities.upperBound(positions1, position, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
    let convertedPosition = positions2[index] + position - positions1[index];
    if (index < positions2.length - 1 && convertedPosition > positions2[index + 1]) {
      convertedPosition = positions2[index + 1];
    }
    return convertedPosition;
  }
};
export {
  FormatterWorkerPool_exports as FormatterWorkerPool,
  ScriptFormatter_exports as ScriptFormatter
};
//# sourceMappingURL=formatter.js.map
