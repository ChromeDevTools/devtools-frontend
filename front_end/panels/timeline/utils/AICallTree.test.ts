// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithEnvironment('AICallTree', () => {
  it('serializes a simple tree', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
    const mainEvents = parsedTrace.Renderer.allTraceEntries;
    // A function '_ds.q.ns'. Has a very small tree by default.
    const selectedEvent = mainEvents.find(event => event.ts === 465457308823);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = Utils.AICallTree.AICallTree.from(selectedEvent, mainEvents, parsedTrace);
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
    assert.strictEqual(callTree.serialize(), expectedData);
  });

  it('serializes a tree with lots of recursion', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const mainEvents = parsedTrace.Renderer.allTraceEntries;
    const selectedEvent = mainEvents.find(event => event.ts === 141251951589);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = Utils.AICallTree.AICallTree.from(selectedEvent, mainEvents, parsedTrace);

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
    const tinyStr = Utils.AICallTree.AICallTree.from(tinyEvent, mainEvents, parsedTrace).serialize();
    assert.strictEqual(tinyStr.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
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
    const treeStr = Utils.AICallTree.AICallTree.from(evaluateEvent, mainEvents, parsedTrace).serialize();
    assert.strictEqual(treeStr.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
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
    const compileStr = Utils.AICallTree.AICallTree.from(compileEvent, mainEvents, parsedTrace).serialize();
    assert.strictEqual(compileStr.split('\n').filter(l => l.startsWith('Node:')).join('\n'), `
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
    ts: Trace.Types.Timing.MicroSeconds(ts),
    dur: Trace.Types.Timing.MicroSeconds(dur),
    pid: Trace.Types.Events.ProcessID(1),
    tid: Trace.Types.Events.ThreadID(4),
    args: {},
  });

  it('always includes the selected event', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.strictEqual(filter.accept(selectedEvent), true);
  });

  it('includes events that are long enough', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);

    assert.strictEqual(filter.accept(makeEvent('short', 0, 1)), true);
    assert.strictEqual(filter.accept(makeEvent('short', 0, 0.6)), true);
    assert.strictEqual(filter.accept(makeEvent('long', 0, 101)), true);
    assert.strictEqual(filter.accept(makeEvent('long', 0, 200)), true);
    assert.strictEqual(filter.accept(makeEvent('long', 0, 1000)), true);
  });

  it('excludes events that are too short', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);

    assert.strictEqual(filter.accept(makeEvent('short', 0, 0)), false);
    assert.strictEqual(filter.accept(makeEvent('short', 0, 0.1)), false);
    assert.strictEqual(filter.accept(makeEvent('short', 0, 0.4)), false);
  });

  it('excludes COMPILE_CODE nodes if non-selected', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const compileCodeEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.strictEqual(filter.accept(compileCodeEvent), false);
  });

  it('includes COMPILE_CODE nodes if selected', () => {
    const selectedEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new Utils.AICallTree.AITreeFilter(selectedEvent);
    assert.strictEqual(filter.accept(selectedEvent), true);
  });
});
