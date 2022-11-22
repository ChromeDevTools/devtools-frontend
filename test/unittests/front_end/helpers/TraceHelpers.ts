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

export async function loadTraceEventsLegacyEventPayload(name: string): Promise<Array<SDK.TracingManager.EventPayload>> {
  const events = await loadEventsFromTraceFile(name);
  // Convince TypeScript that these are really EventPayload events, so they can
  // be used when testing OPP code that expects EventPayload events.
  return events as unknown as Array<SDK.TracingManager.EventPayload>;
}

export async function loadTraceFile(name: string): Promise<TraceModel.TraceModel.TraceFileContents> {
  const url = `/fixtures/traces/${name}`;
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
  return JSON.parse(decoder.decode(buffer));
}

export async function loadEventsFromTraceFile(name: string):
    Promise<Array<TraceModel.Types.TraceEvents.TraceEventData>> {
  const trace = await loadTraceFile(name);
  if ('traceEvents' in trace) {
    return trace.traceEvents;
  }
  return trace;
}

async function generateModelDataForTraceFile(name: string, emulateFreshRecording = false): Promise<{
  metadata: TraceModel.TraceModel.TraceFileMetaData,
  traceParsedData: TraceModel.Handlers.Types.TraceParseData,
}> {
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
          const result = {
            metadata,
            traceParsedData,
          };
          resolve(result);
        } else {
          reject(new Error('Unable to load trace'));
        }
      }
    });

    void model.parse(traceEvents, {}, emulateFreshRecording).catch(e => console.error(e));
  });
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
