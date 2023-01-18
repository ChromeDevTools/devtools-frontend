// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as SDK from '../../../../front_end/core/sdk/sdk.js';
import * as TraceModel from '../../../../front_end/models/trace/trace.js';

interface CompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
interface DecompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
declare const CompressionStream: {
  prototype: CompressionStream,
  new (type: string): CompressionStream,
};

declare const DecompressionStream: {
  prototype: DecompressionStream,
  new (type: string): DecompressionStream,
};

function codec(buffer: ArrayBuffer, codecStream: CompressionStream|DecompressionStream): Promise<ArrayBuffer> {
  const {readable, writable} = new TransformStream();
  const codecReadable = readable.pipeThrough(codecStream);

  const writer = writable.getWriter();
  void writer.write(buffer);
  void writer.close();

  // Wrap in a response for convenience.
  const response = new Response(codecReadable);
  return response.arrayBuffer();
}

function decodeGzipBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return codec(buffer, new DecompressionStream('gzip'));
}

export async function loadTraceEventsLegacyEventPayload(name: string):
    Promise<readonly SDK.TracingManager.EventPayload[]> {
  const events = await loadEventsFromTraceFile(name);
  // Convince TypeScript that these are really EventPayload events, so they can
  // be used when testing OPP code that expects EventPayload events.
  return events as unknown as Array<SDK.TracingManager.EventPayload>;
}

// The contents of the trace files do not get modified at all, so in tests we
// are safe to cache their contents once we've loaded them once.
const traceFileCache = new Map<string, TraceModel.TraceModel.TraceFileContents>();

export async function loadTraceFileFromURL(url: URL): Promise<TraceModel.TraceModel.TraceFileContents> {
  const cachedFile = traceFileCache.get(url.toString());
  if (cachedFile) {
    return cachedFile;
  }
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Unable to load ${url}`);
  }

  const contentType = response.headers.get('content-type');
  const isGzipEncoded = contentType !== null && contentType.includes('gzip');
  let buffer = await response.arrayBuffer();
  if (isGzipEncoded) {
    buffer = await decodeGzipBuffer(buffer);
  }
  const decoder = new TextDecoder('utf-8');
  const contents = JSON.parse(decoder.decode(buffer)) as TraceModel.TraceModel.TraceFileContents;
  traceFileCache.set(url.toString(), contents);
  return contents;
}
export async function loadTraceFileFromFixtures(name: string): Promise<TraceModel.TraceModel.TraceFileContents> {
  const url = new URL(`/fixtures/traces/${name}`, window.location.origin);
  return loadTraceFileFromURL(url);
}

export async function loadEventsFromTraceFile(name: string):
    Promise<readonly TraceModel.Types.TraceEvents.TraceEventData[]> {
  const trace = await loadTraceFileFromFixtures(name);
  if ('traceEvents' in trace) {
    return trace.traceEvents;
  }
  return trace;
}

interface ModelDataResult {
  metadata: TraceModel.TraceModel.TraceFileMetaData;
  traceParsedData: TraceModel.Handlers.Types.TraceParseData;
}
const modelDataCache = new Map<string, ModelDataResult>();
async function generateModelDataForTraceFile(name: string, emulateFreshRecording = false): Promise<ModelDataResult> {
  const cachedData = modelDataCache.get(name);
  if (cachedData) {
    return cachedData;
  }
  const traceEvents = await loadEventsFromTraceFile(name);

  return new Promise((resolve, reject) => {
    const model = new TraceModel.TraceModel.Model();
    model.addEventListener(TraceModel.TraceModel.ModelUpdateEvent.eventName, (event: Event) => {
      const {data} = event as TraceModel.TraceModel.ModelUpdateEvent;

      // When we receive the final update from the model, update the recording
      // state back to waiting.
      if (TraceModel.TraceModel.isModelUpdateEventDataGlobal(data) && data.data === 'done') {
        const metadata = model.metadata(0);
        const traceParsedData = model.traceParsedData(0);
        if (metadata && traceParsedData) {
          const result: ModelDataResult = {
            metadata,
            traceParsedData,
          };
          modelDataCache.set(name, result);
          resolve(result);
        } else {
          reject(new Error('Unable to load trace'));
        }
      }
    });

    void model.parse(traceEvents, {}, emulateFreshRecording).catch(e => console.error(e));
  });
}

/**
 * Parsing some trace files easily takes up more than our default Mocha timeout
 * which is 2seconds. So for most tests that include parsing a trace, we have to
 * increase the timeout. We use this function to ensure we set a consistent
 * timeout across all trace model tests.
 **/
export function setTraceModelTimeout(context: Mocha.Context|Mocha.Suite): void {
  context.timeout(10_000);
}

export async function loadModelDataFromTraceFile(name: string): Promise<TraceModel.Handlers.Types.TraceParseData> {
  let trace: TraceModel.Handlers.Types.TraceParseData;
  try {
    trace = (await generateModelDataForTraceFile(name)).traceParsedData;
  } catch (error) {
    throw new Error(`Failed to load trace file: ${name}. Is it in test/unittests/fixtures/traces?`);
  }

  return trace;
}

// We create here a cross-test base trace event. It is assumed that each
// test will import this default event and copy-override properties at will.
export const defaultTraceEvent: TraceModel.Types.TraceEvents.TraceEventData = {
  name: 'process_name',
  tid: TraceModel.Types.TraceEvents.ThreadID(0),
  pid: TraceModel.Types.TraceEvents.ProcessID(0),
  ts: TraceModel.Types.Timing.MicroSeconds(0),
  cat: 'test',
  ph: TraceModel.Types.TraceEvents.TraceEventPhase.METADATA,
};

/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventTree {
  const tree = thread.tree;
  if (!tree) {
    assert(false, `Couldn't get tree in thread ${thread.name}`);
    return null as never;
  }
  return tree;
}

/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getRootAt(thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread, index: number):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode {
  const tree = getTree(thread);
  const nodeId = [...tree.roots][index];
  if (nodeId === undefined) {
    assert(false, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
    return null as never;
  }
  return getNodeFor(thread, nodeId);
}

/**
 * Gets the node with an id from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getNodeFor(
    thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread,
    nodeId: TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode {
  const tree = getTree(thread);
  const node = tree.nodes.get(nodeId);
  if (!node) {
    assert(false, `Couldn't get the node with id ${nodeId} in thread ${thread.name}`);
    return null as never;
  }
  return node;
}

/**
 * Gets the event for a node from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getEventFor(
    thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread,
    node: TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEvent {
  const event = thread.events[node.eventIndex];
  if (!event) {
    assert(false, `Couldn't get the event at index ${node.eventIndex} for node in thread ${thread.name}`);
    return null as never;
  }
  return event;
}

/**
 * Gets all the `events` for the `nodes` with `ids`.
 */
export function getEventsIn(
    ids: IterableIterator<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId>,
    nodes:
        Map<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId,
            TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode>,
    events: TraceModel.Types.TraceEvents.TraceEventData[]): TraceModel.Types.TraceEvents.TraceEventData[] {
  return [...ids].map(id => nodes.get(id)).flatMap(node => node ? [events[node.eventIndex]] : []);
}
/**
 * Pretty-prints the tree in a thread.
 */
export function prettyPrint(
    thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread,
    nodes: Set<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId>,
    predicate: (
        node: TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode,
        event: TraceModel.Handlers.ModelHandlers.Renderer.RendererEvent) => boolean = () => true,
    indentation: number = 2, delimiter: string = ' ', prefix: string = '-', newline: string = '\n',
    out: string = ''): string {
  let skipped = false;
  for (const nodeId of nodes) {
    const node = getNodeFor(thread, nodeId);
    const event = getEventFor(thread, node);
    if (!predicate(node, event)) {
      out += `${!skipped ? newline : ''}.`;
      skipped = true;
      continue;
    }
    skipped = false;
    const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
    const type = TraceModel.Types.TraceEvents.isTraceEventDispatch(event) ? `(${event.args.data?.type})` : false;
    const duration = TraceModel.Types.TraceEvents.isTraceEventInstant(event) ? '[I]' : `[${event.dur / 1000}ms]`;
    const info = [type, duration].filter(Boolean);
    out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
    out = prettyPrint(thread, node.childrenIds, predicate, indentation, delimiter, prefix, newline, out);
  }

  return out;
}

/**
 * Builds a mock TraceEventComplete.
 */
export function makeCompleteEvent(
    name: string, ts: number, dur: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceModel.Types.TraceEvents.TraceEventComplete {
  return {
    args: {},
    cat,
    name,
    ph: TraceModel.Types.TraceEvents.TraceEventPhase.COMPLETE,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    dur: TraceModel.Types.Timing.MicroSeconds(dur),
  };
}

export function makeCompleteEventInMilliseconds(
    name: string, tsMillis: number, durMillis: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceModel.Types.TraceEvents.TraceEventComplete {
  return makeCompleteEvent(
      name, TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(tsMillis)),
      TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(durMillis)), cat, pid,
      tid);
}

/**
 * Builds a mock TraceEventInstant.
 */
export function makeInstantEvent(
    name: string, ts: number, cat: string = '', pid: number = 0, tid: number = 0,
    s: TraceModel.Types.TraceEvents.TraceEventScope =
        TraceModel.Types.TraceEvents.TraceEventScope.THREAD): TraceModel.Types.TraceEvents.TraceEventInstant {
  return {
    args: {},
    cat,
    name,
    ph: TraceModel.Types.TraceEvents.TraceEventPhase.INSTANT,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    s,
  };
}
