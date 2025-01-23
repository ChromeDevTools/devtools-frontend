// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithEnvironment('AICallTree', () => {
  it('will not build a tree from non-main-thread events', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    // A random RasterizerTask. Although this does technically run on the
    // main _frame_, it is not on the thread we identify as the main thread.
    const rasterTask = parsedTrace.Renderer.allTraceEntries.find(e => {
      return e.name === Trace.Types.Events.Name.RASTER_TASK && e.pid === 4274 && e.tid === 23555;
    });
    assert.isOk(rasterTask);
    assert.isNull(Utils.AICallTree.AICallTree.from(rasterTask, parsedTrace));
  });

  it('does not build a tree from events the renderer is not aware of', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    // A SyntheticLayoutShift: the RendererHandler does not know about this.
    const shift = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
    assert.isOk(shift);
    assert.isTrue(Trace.Types.Events.isSyntheticLayoutShift(shift));
    assert.isNull(Utils.AICallTree.AICallTree.from(shift, parsedTrace));
  });

  it('supports NodeJS traces that do not have a "main thread"', async function() {
    // Bit of extra setup required: we need to mimic what the panel does where
    // it takes the CDP Profile and wraps it in fake trace events, before then
    // passing that through to the new engine.
    const rawEvents = await TraceLoader.rawCPUProfile(this, 'basic.cpuprofile.gz');
    const events = Trace.Extras.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
        rawEvents,
        Trace.Types.Events.ThreadID(1),
    );
    const {parsedTrace} =
        await TraceLoader.executeTraceEngineOnFileContents(events as unknown as Trace.Types.Events.Event[]);
    // Find a random function call in the trace.
    const funcCall = parsedTrace.Samples.entryToNode.keys().find(event => {
      return Trace.Types.Events.isProfileCall(event) && event.callFrame.functionName === 'callAndPauseOnStart';
    });
    assert.isOk(funcCall);
    const callTree = Utils.AICallTree.AICallTree.from(funcCall, parsedTrace);
    assert.isOk(callTree);
    const expectedData = '\n' +
        `

# All URL #s:

  * 0: node:internal/main/run_main_module
  * 1: node:internal/modules/run_main
  * 2: node:internal/modules/cjs/loader
  * 3: file:///Users/andoli/Desktop/mocks/fixnodeinspector/app.js

# Call tree:

Node: 1 – (anonymous)
dur: 2370
URL #: 0
Children:
  * 2 – executeUserEntryPoint

Node: 2 – executeUserEntryPoint
dur: 2370
URL #: 1
Children:
  * 3 – Module._load

Node: 3 – Module._load
dur: 2370
URL #: 2
Children:
  * 4 – Module.load

Node: 4 – Module.load
dur: 2370
URL #: 2
Children:
  * 5 – Module._extensions..js

Node: 5 – Module._extensions..js
dur: 2370
URL #: 2
Children:
  * 6 – Module._compile

Node: 6 – Module._compile
dur: 2370
URL #: 2
Children:
  * 7 – callAndPauseOnStart

Node: 7 – callAndPauseOnStart
Selected: true
dur: 2370
Children:
  * 8 – (anonymous)

Node: 8 – (anonymous)
dur: 2370
self: 2370
URL #: 3
`.trim();

    assert.strictEqual(callTree?.serialize(), expectedData);
  });

  it('serializes a simple tree', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
    const mainEvents = parsedTrace.Renderer.allTraceEntries;
    // A function '_ds.q.ns'. Has a very small tree by default.
    const selectedEvent = mainEvents.find(event => event.ts === 465457308823);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = Utils.AICallTree.AICallTree.from(selectedEvent, parsedTrace);
    const expectedData = '\n' +
        `

# All URL #s:

  * 0: https://www.gstatic.com/devrel-devsite/prod/vafe2e13ca17bb026e70df42a2ead1c8192750e86a12923a88eda839025dabf95/js/devsite_app_module.js

# Call tree:

Node: 1 – Task
dur: 0.2
Children:
  * 2 – Timer fired

Node: 2 – Timer fired
dur: 0.2
Children:
  * 3 – Function call

Node: 3 – Function call
dur: 0.2
URL #: 0
Children:
  * 4 – _ds.q.ns

Node: 4 – _ds.q.ns
Selected: true
dur: 0.2
URL #: 0
Children:
  * 5 – clearTimeout

Node: 5 – clearTimeout
dur: 0.2
self: 0
Children:
  * 6 – Recalculate style

Node: 6 – Recalculate style
dur: 0.2
self: 0.2
`.trim();
    assert.strictEqual(callTree?.serialize(), expectedData);
  });

  it('serializes a tree with lots of recursion', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const mainEvents = parsedTrace.Renderer.allTraceEntries;
    const selectedEvent = mainEvents.find(event => event.ts === 141251951589);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = Utils.AICallTree.AICallTree.from(selectedEvent, parsedTrace);
    assert.isOk(callTree);

    // We don't need to validate the whole tree, just that it has recursion
    const treeStr = callTree.serialize();
    const lines = treeStr.split('\n');
    const fibCallCount = lines.filter(line => line.includes('fibonacci')).length;
    assert.isTrue(fibCallCount > 10);
  });

  it('AITreeFilter includes the right items in the tree', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'two-workers.json.gz');
    const mainEvents = parsedTrace.Renderer.allTraceEntries;

    // A very small 'get storage' event. It's 6µs long
    const tinyEvent = mainEvents.find(event => event.ts === 107350149168);
    if (!tinyEvent) {
      throw new Error('Could not find expected event.');
    }
    const tinyStr = Utils.AICallTree.AICallTree.from(tinyEvent, parsedTrace)?.serialize();
    assert.strictEqual(tinyStr?.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
Node: 1 – Task
Node: 2 – Parse HTML
Node: 3 – Evaluate script
Node: 4 – (anonymous)
Node: 5 – get storage`.trim());
    assert.include(tinyStr, 'get storage');

    // An evaluateScript that has 3 'Compile code' children
    const evaluateEvent = mainEvents.find(event => event.ts === 107350147808);
    if (!evaluateEvent) {
      throw new Error('Could not find expected event.');
    }
    const treeStr = Utils.AICallTree.AICallTree.from(evaluateEvent, parsedTrace)?.serialize();
    assert.strictEqual(treeStr?.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
Node: 1 – Task
Node: 2 – Parse HTML
Node: 3 – Evaluate script
Node: 4 – Compile script
Node: 5 – (anonymous)
Node: 6 – H.la`.trim());
    assert.notInclude(treeStr, 'Compile code');

    // An Compile code event within the evaluateEvent call tree
    const compileEvent = mainEvents.find(event => event.ts === 107350148218);
    if (!compileEvent) {
      throw new Error('Could not find expected event.');
    }
    const compileStr = Utils.AICallTree.AICallTree.from(compileEvent, parsedTrace)?.serialize();
    assert.strictEqual(compileStr?.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
Node: 1 – Task
Node: 2 – Parse HTML
Node: 3 – Evaluate script
Node: 4 – (anonymous)
Node: 5 – Compile code`.trim());
    assert.include(compileStr, 'Compile code');
  });
});

describe('AITreeFilter', () => {
  const makeEvent = (
                        name: string,
                        ts: number,
                        dur: number,
                        ): Trace.Types.Events.Event => ({
    name,
    cat: 'disabled-by-default-devtools.timeline',
    ph: Trace.Types.Events.Phase.COMPLETE,
    ts: Trace.Types.Timing.Micro(ts),
    dur: Trace.Types.Timing.Micro(dur),
    pid: Trace.Types.Events.ProcessID(1),
    tid: Trace.Types.Events.ThreadID(4),
    args: {},
  });

  it('always includes the selected event', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.isTrue(filter.accept(selectedEvent));
  });

  it('includes events that are long enough', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);

    assert.isTrue(filter.accept(makeEvent('short', 0, 1)));
    assert.isTrue(filter.accept(makeEvent('short', 0, 0.6)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 101)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 200)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 1000)));
  });

  it('excludes events that are too short', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);

    assert.isFalse(filter.accept(makeEvent('short', 0, 0)));
    assert.isFalse(filter.accept(makeEvent('short', 0, 0.1)));
    assert.isFalse(filter.accept(makeEvent('short', 0, 0.4)));
  });

  it('excludes COMPILE_CODE nodes if non-selected', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const compileCodeEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.isFalse(filter.accept(compileCodeEvent));
  });

  it('includes COMPILE_CODE nodes if selected', () => {
    const selectedEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.isTrue(filter.accept(selectedEvent));
  });
});
