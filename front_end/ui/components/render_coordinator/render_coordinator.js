// gen/front_end/ui/components/render_coordinator/render_coordinator.prebundle.js
var WorkItem = class {
  promise;
  trigger;
  cancel;
  label;
  handler;
  constructor(label, handler) {
    const { promise, resolve, reject } = Promise.withResolvers();
    this.promise = promise.then(() => this.handler());
    this.trigger = resolve;
    this.cancel = reject;
    this.label = label;
    this.handler = handler;
  }
};
var RenderCoordinatorQueueEmptyEvent = class _RenderCoordinatorQueueEmptyEvent extends Event {
  static eventName = "renderqueueempty";
  constructor() {
    super(_RenderCoordinatorQueueEmptyEvent.eventName);
  }
};
var RenderCoordinatorNewFrameEvent = class _RenderCoordinatorNewFrameEvent extends Event {
  static eventName = "newframe";
  constructor() {
    super(_RenderCoordinatorNewFrameEvent.eventName);
  }
};
var loggingEnabled = null;
var loggingRecords = [];
function setLoggingEnabled(enabled, options = {}) {
  if (enabled) {
    loggingEnabled = {
      onlyNamed: options.onlyNamed,
      storageLimit: options.storageLimit
    };
  } else {
    loggingEnabled = null;
    loggingRecords.length = 0;
  }
}
var UNNAMED_READ = "Unnamed read";
var UNNAMED_WRITE = "Unnamed write";
var UNNAMED_SCROLL = "Unnamed scroll";
var DEADLOCK_TIMEOUT = 1500;
globalThis.__getRenderCoordinatorPendingFrames = function() {
  return hasPendingWork() ? 1 : 0;
};
var pendingReaders = [];
var pendingWriters = [];
var scheduledWorkId = 0;
function hasPendingWork() {
  return pendingReaders.length + pendingWriters.length !== 0;
}
function done(options) {
  if (!hasPendingWork() && !options?.waitForWork) {
    logIfEnabled("[Queue empty]");
    return Promise.resolve();
  }
  return new Promise(
    (resolve) => window.addEventListener(RenderCoordinatorQueueEmptyEvent.eventName, () => resolve(), { once: true })
  );
}
async function read(labelOrCallback, callback) {
  if (typeof labelOrCallback === "string") {
    if (!callback) {
      throw new Error("Read called with label but no callback");
    }
    return await enqueueHandler("read", labelOrCallback, callback);
  }
  return await enqueueHandler("read", UNNAMED_READ, labelOrCallback);
}
async function write(labelOrCallback, callback) {
  if (typeof labelOrCallback === "string") {
    if (!callback) {
      throw new Error("Write called with label but no callback");
    }
    return await enqueueHandler("write", labelOrCallback, callback);
  }
  return await enqueueHandler("write", UNNAMED_WRITE, labelOrCallback);
}
function takeLoggingRecords() {
  const logs = [...loggingRecords];
  loggingRecords.length = 0;
  return logs;
}
async function scroll(labelOrCallback, callback) {
  if (typeof labelOrCallback === "string") {
    if (!callback) {
      throw new Error("Scroll called with label but no callback");
    }
    return await enqueueHandler("read", labelOrCallback, callback);
  }
  return await enqueueHandler("read", UNNAMED_SCROLL, labelOrCallback);
}
function enqueueHandler(action, label, callback) {
  const hasName = ![UNNAMED_READ, UNNAMED_WRITE, UNNAMED_SCROLL].includes(label);
  label = `${action === "read" ? "[Read]" : "[Write]"}: ${label}`;
  let workItems = null;
  switch (action) {
    case "read":
      workItems = pendingReaders;
      break;
    case "write":
      workItems = pendingWriters;
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
  let workItem = hasName ? workItems.find((w) => w.label === label) : void 0;
  if (!workItem) {
    workItem = new WorkItem(label, callback);
    workItems.push(workItem);
  } else {
    workItem.handler = callback;
  }
  scheduleWork();
  return workItem.promise;
}
function scheduleWork() {
  if (scheduledWorkId !== 0) {
    return;
  }
  scheduledWorkId = requestAnimationFrame(async () => {
    if (!hasPendingWork()) {
      window.dispatchEvent(new RenderCoordinatorQueueEmptyEvent());
      logIfEnabled("[Queue empty]");
      scheduledWorkId = 0;
      return;
    }
    window.dispatchEvent(new RenderCoordinatorNewFrameEvent());
    logIfEnabled("[New frame]");
    const readers = pendingReaders;
    pendingReaders = [];
    const writers = pendingWriters;
    pendingWriters = [];
    for (const reader of readers) {
      logIfEnabled(reader.label);
      reader.trigger();
    }
    try {
      await Promise.race([
        Promise.all(readers.map((r) => r.promise)),
        new Promise((_, reject) => {
          window.setTimeout(
            () => reject(new Error(`Readers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)),
            DEADLOCK_TIMEOUT
          );
        })
      ]);
    } catch (err) {
      rejectAll(readers, err);
    }
    for (const writer of writers) {
      logIfEnabled(writer.label);
      writer.trigger();
    }
    try {
      await Promise.race([
        Promise.all(writers.map((w) => w.promise)),
        new Promise((_, reject) => {
          window.setTimeout(
            () => reject(new Error(`Writers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)),
            DEADLOCK_TIMEOUT
          );
        })
      ]);
    } catch (err) {
      rejectAll(writers, err);
    }
    scheduledWorkId = 0;
    scheduleWork();
  });
}
function rejectAll(handlers, error) {
  for (const handler of handlers) {
    handler.cancel(error);
  }
}
function cancelPending() {
  const error = new Error();
  rejectAll(pendingReaders, error);
  rejectAll(pendingWriters, error);
}
function logIfEnabled(value) {
  if (loggingEnabled === null) {
    return;
  }
  if (loggingEnabled.onlyNamed) {
    if (value.endsWith(UNNAMED_READ) || value.endsWith(UNNAMED_WRITE) || value.endsWith(UNNAMED_SCROLL)) {
      return;
    }
  }
  loggingRecords.push({ time: performance.now(), value });
  const loggingLimit = loggingEnabled.storageLimit ?? 100;
  while (loggingRecords.length > loggingLimit) {
    loggingRecords.shift();
  }
}
export {
  RenderCoordinatorNewFrameEvent,
  RenderCoordinatorQueueEmptyEvent,
  cancelPending,
  done,
  hasPendingWork,
  read,
  scroll,
  setLoggingEnabled,
  takeLoggingRecords,
  write
};
//# sourceMappingURL=render_coordinator.js.map
