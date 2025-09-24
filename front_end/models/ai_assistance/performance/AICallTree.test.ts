// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {AICallTree, ExcludeCompileCodeFilter, SelectedEventDurationFilter} from '../ai_assistance.js';

const NODE_NAME_INDEX = 2;

describeWithEnvironment('AICallTree', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  beforeEach(() => {
    Root.Runtime.experiments.disableForTest('timeline-show-all-events');
  });

  it('will not build a tree from non-main-thread events', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    // A random RasterizerTask. Although this does technically run on the
    // main _frame_, it is not on the thread we identify as the main thread.
    const rasterTask = allThreadEntriesInTrace(parsedTrace).find(e => {
      return e.name === Trace.Types.Events.Name.RASTER_TASK && e.pid === 4274 && e.tid === 23555;
    });
    assert.isOk(rasterTask);
    assert.isNull(AICallTree.fromEvent(rasterTask, parsedTrace));
  });

  it('does not build a tree from events the renderer is not aware of', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
    // A SyntheticLayoutShift: the RendererHandler does not know about this.
    const shift = parsedTrace.data.LayoutShifts.clusters.at(0)?.events.at(0);
    assert.isOk(shift);
    assert.isTrue(Trace.Types.Events.isSyntheticLayoutShift(shift));
    assert.isNull(AICallTree.fromEvent(shift, parsedTrace));
  });

  it('does not build a call tree from a performance.mark', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-timings.json.gz');

    const mark = parsedTrace.data.UserTimings.performanceMarks.at(0);
    assert.isOk(mark);
    assert.isNull(AICallTree.fromEvent(mark, parsedTrace));
  });

  it('does not build a call tree from a performance.measure', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-timings.json.gz');

    const measure = parsedTrace.data.UserTimings.performanceMeasures.at(0);
    assert.isOk(measure);
    assert.isNull(AICallTree.fromEvent(measure, parsedTrace));
  });

  it('supports NodeJS traces that do not have a "main thread"', async function() {
    // Bit of extra setup required: we need to mimic what the panel does where
    // it takes the CDP Profile and wraps it in fake trace events, before then
    // passing that through to the new engine.
    const rawEvents = await TraceLoader.rawCPUProfile(this, 'basic.cpuprofile.gz');
    const events = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
        rawEvents,
        Trace.Types.Events.ThreadID(1),
    );
    const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(events);
    // Find a random function call in the trace.
    const funcCall = parsedTrace.data.Samples.entryToNode.keys().find(event => {
      return Trace.Types.Events.isProfileCall(event) && event.callFrame.functionName === 'callAndPauseOnStart';
    });
    assert.isOk(funcCall);
    const callTree = AICallTree.fromEvent(funcCall, parsedTrace);
    assert.isOk(callTree);
    snapshotTester.assert(this, callTree.serialize());
  });

  it('serializes a simple tree', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);
    // A function '_ds.q.ns'. Has a very small tree by default.
    const selectedEvent = mainEvents.find(event => event.ts === 465457308823);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);
    snapshotTester.assert(this, callTree.serialize());
  });

  it('correctly serializes selected node with multiple children', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);

    const selectedEvent = mainEvents.find(event => event.ts === 1020034984106);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);

    let stringifiedNode = '';
    if (callTree?.selectedNode) {
      stringifiedNode = callTree?.stringifyNode(callTree.selectedNode, 2, parsedTrace, callTree.selectedNode, [''], 2);
    }

    // Entry Format: id;eventKey;name;duration;selfTime;urlIndex;childRange;[S]
    assert.deepEqual(stringifiedNode, '2;p-73704-775-1273-118;define;3.5;0.5;;2-6;S');
  });

  // Since the childIds are serialized while the node is visited by BFS,
  // it is important to test that the final parent-child IDs are assigned correctly.
  it('correctly numbers child node IDs sequentially', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);

    // The selected event is structured like this:
    //
    // ||                            Task                                     ||
    //   || recalculate style||    || layout ||    || update ||    || paint ||
    //
    // Here, the only node with children is task and the index of Task node children starts at 2 (Task itself is 1)
    // If this information is provided correctly, it is enough to serialize that node.

    const selectedEvent = mainEvents.find(event => event.ts === 1020034919877);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);

    const visited: Array<{name: string, nodeIndex: number, childStartingIndex?: number}> = [];

    const callback = (node: Trace.Extras.TraceTree.Node, nodeIndex: number, childStartingIndex?: number): void => {
      visited.push({name: Trace.Name.forEntry(node.event, parsedTrace), nodeIndex, childStartingIndex});
    };

    callTree.breadthFirstWalk(callTree.rootNode.children().values(), callback);

    const expectedVisited = [
      {name: 'Task', nodeIndex: 1, childStartingIndex: 2},
      {name: 'Recalculate style', nodeIndex: 2, childStartingIndex: undefined},
      {name: 'Layout', nodeIndex: 3, childStartingIndex: undefined},
      {name: 'Update layer tree', nodeIndex: 4, childStartingIndex: undefined},
      {name: 'Paint', nodeIndex: 5, childStartingIndex: undefined},
    ];

    assert.deepEqual(visited, expectedVisited, 'Callback arguments were incorrect');
  });

  it('correctly numbers child nodes IDs for larger trees', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);

    // The selected event is structured like this:
    //
    // ||                          Task (1)                                                 ||
    // ||                          Timer fired (2)                                          ||
    // ||                          Function Call (3)                                        ||
    //     ||                        Anonymous (4)                                          ||
    //     ||                        Anonymous (5)                                          ||
    //     || Ot.getEntriesByType (6) ||  ||     le.createOobTrace (7)                      ||
    //     || getEntriesByType (8) ||     || le (9) ||  ||         ie (10)                  ||
    //                                                  ||reqApisA= (11)|| ||oe (12)        ||
    //                                                                     ||setTimeout (13)||
    //
    // Here, the only node with children is task and the index of Task node children starts at 2 (Task itself is 1)
    // If this information is provided correctly, it is enough to serialize that node.

    const selectedEvent = mainEvents.find(event => event.ts === 1020035169460);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);

    const visited: Array<{name: string, nodeIndex: number, childStartingIndex?: number}> = [];

    const callback = (node: Trace.Extras.TraceTree.Node, nodeIndex: number, childStartingIndex?: number): void => {
      visited.push({name: Trace.Name.forEntry(node.event, parsedTrace), nodeIndex, childStartingIndex});
    };

    callTree.breadthFirstWalk(callTree.rootNode.children().values(), callback);

    const expectedVisited = [
      {name: 'Task', nodeIndex: 1, childStartingIndex: 2},
      {name: 'Timer fired', nodeIndex: 2, childStartingIndex: 3},
      {name: 'Function call', nodeIndex: 3, childStartingIndex: 4},
      {name: '(anonymous)', nodeIndex: 4, childStartingIndex: 5},
      {name: '(anonymous)', nodeIndex: 5, childStartingIndex: 6},
      {name: 'Ot.getEntriesByType', nodeIndex: 6, childStartingIndex: 8},
      {name: 'le.createOobTrace', nodeIndex: 7, childStartingIndex: 9},
      {name: 'getEntriesByType', nodeIndex: 8, childStartingIndex: undefined},
      {name: 'le', nodeIndex: 9, childStartingIndex: undefined},
      {name: 'ie', nodeIndex: 10, childStartingIndex: 11},
      {name: 'Ot.requiredApisAvailable', nodeIndex: 11, childStartingIndex: undefined},
      {name: 'oe', nodeIndex: 12, childStartingIndex: 13},
      {name: 'setTimeout', nodeIndex: 13, childStartingIndex: undefined},
    ];

    assert.deepEqual(visited, expectedVisited, 'Callback arguments were incorrect');
  });

  it('serializes a simple tree in a concise format', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-outermost-frames.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);
    // A function '_ds.q.ns'. Has a very small tree by default.
    const selectedEvent = mainEvents.find(event => event.ts === 465457308823);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);
    snapshotTester.assert(this, callTree.serialize());
  });

  it('serializes a tree in a concise format', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);
    const selectedEvent = mainEvents.find(event => event.ts === 1020035169460);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);
    snapshotTester.assert(this, callTree.serialize());
  });

  it('can serialize a tree from an event that is not shown unless "show all events" is enabled', async function() {
    Root.Runtime.experiments.enableForTest('timeline-show-all-events');
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    // find a "v8.run" function that would not normally be shown
    const event = allThreadEntriesInTrace(parsedTrace).find(entry => {
      return entry.name === 'v8.run' && entry.ts === 122411196071;
    });
    assert.exists(event);
    const callTree = AICallTree.fromEvent(event, parsedTrace);
    assert.isNotNull(callTree);
    const treeStr = callTree.serialize();
    assert.include(treeStr, 'v8.run');  // make sure the event is in the tree
  });

  it('serializes a tree with lots of recursion', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);
    const selectedEvent = mainEvents.find(event => event.ts === 141251951589);
    if (!selectedEvent) {
      throw new Error('Could not find expected event.');
    }
    const callTree = AICallTree.fromEvent(selectedEvent, parsedTrace);
    assert.isOk(callTree);

    // We don't need to validate the whole tree, just that it has recursion
    const treeStr = callTree.serialize();
    const lines = treeStr.split('\n');
    const fibCallCount = lines.filter(line => line.includes('fibonacci')).length;
    assert.isTrue(fibCallCount > 10);
  });

  it('AITreeFilter includes the right items in the tree', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'two-workers.json.gz');
    const mainEvents = allThreadEntriesInTrace(parsedTrace);

    function getNodeNames(serializedTree: string|undefined): string {
      if (!serializedTree) {
        return '';
      }
      // We only want to extract the names to check the tree structure.
      return serializedTree.split('\n').filter(l => /^\d+;/.test(l)).map(l => l.split(';')[NODE_NAME_INDEX]).join('\n');
    }

    // A very small 'get storage' event. It's 6µs long
    const tinyEvent = mainEvents.find(event => event.ts === 107350149168);
    if (!tinyEvent) {
      throw new Error('Could not find expected event.');
    }
    const tinyStr = AICallTree.fromEvent(tinyEvent, parsedTrace)?.serialize();
    assert.strictEqual(
        getNodeNames(tinyStr), ['Task', 'Parse HTML', 'Evaluate script', '(anonymous)', 'get storage'].join('\n'));
    assert.include(tinyStr, 'get storage');

    // An evaluateScript that has 3 'Compile code' children
    const evaluateEvent = mainEvents.find(event => event.ts === 107350147808);
    if (!evaluateEvent) {
      throw new Error('Could not find expected event.');
    }
    const treeStr = AICallTree.fromEvent(evaluateEvent, parsedTrace)?.serialize();
    assert.strictEqual(
        getNodeNames(treeStr),
        ['Task', 'Parse HTML', 'Evaluate script', 'Compile script', '(anonymous)', 'H.la'].join('\n'));
    assert.notInclude(treeStr, 'Compile code');

    // An Compile code event within the evaluateEvent call tree
    const compileEvent = mainEvents.find(event => event.ts === 107350148218);
    if (!compileEvent) {
      throw new Error('Could not find expected event.');
    }
    const compileStr = AICallTree.fromEvent(compileEvent, parsedTrace)?.serialize();
    assert.strictEqual(
        getNodeNames(compileStr), ['Task', 'Parse HTML', 'Evaluate script', '(anonymous)', 'Compile code'].join('\n'));
    assert.include(compileStr, 'Compile code');
  });

  it('can construct a tree from a period of time', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'nested-interactions.json.gz');
    const data = parsedTrace.data;
    // Picked this interaction event because it spans multiple icicles in the main thread.
    // Note: if you are debugging this test, it is useful to load up this trace
    // in RPP and look for the first "keydown" event.
    const interaction = data.UserInteractions.interactionEventsWithNoNesting.find(e => {
      return Trace.Types.Events.isEventTimingStart(e.rawSourceEvent) &&
          e.rawSourceEvent.args.data.interactionId === 3572;
    });
    assert.isOk(interaction);
    const timings = Trace.Helpers.Timing.eventTimingsMicroSeconds(interaction);
    const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(timings.startTime, timings.endTime);
    const tree = AICallTree.fromTimeOnThread({
      thread: {pid: interaction.pid, tid: interaction.tid},
      parsedTrace,
      bounds,
    });
    assert.isOk(tree);
    const output = tree.serialize();
    // Filter lines that start with a digit followed by a semicolon to count nodes.
    const totalNodes = output.split('\n').filter(l => /^\d+;/.test(l)).length;
    assert.strictEqual(totalNodes, 242);  // Check the min duration filter is working.
    // Check there are 3 keydown events. This confirms that the call tree is taking events from the right timespan.
    const keyDownEvents = output.split('\n').filter(line => {
      // Extract the name part (second field) and check if it includes 'Event: keydown'.
      return /^\d+;/.test(line) && line.split(';')[NODE_NAME_INDEX].includes('Event: keydown');
    });
    assert.lengthOf(keyDownEvents, 3);
  });
});

const makeEvent = (name: string, ts: number, dur: number): Trace.Types.Events.Event => ({
  name,
  cat: 'disabled-by-default-devtools.timeline',
  ph: Trace.Types.Events.Phase.COMPLETE,
  ts: Trace.Types.Timing.Micro(ts),
  dur: Trace.Types.Timing.Micro(dur),
  pid: Trace.Types.Events.ProcessID(1),
  tid: Trace.Types.Events.ThreadID(4),
  args: {},
});
describe('AITreeFilter', () => {
  it('always includes the selected event', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new SelectedEventDurationFilter(selectedEvent);
    assert.isTrue(filter.accept(selectedEvent));
  });

  it('includes events that are long enough', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new SelectedEventDurationFilter(selectedEvent);

    assert.isTrue(filter.accept(makeEvent('short', 0, 1)));
    assert.isTrue(filter.accept(makeEvent('short', 0, 0.6)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 101)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 200)));
    assert.isTrue(filter.accept(makeEvent('long', 0, 1000)));
  });

  it('excludes events that are too short', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const filter = new SelectedEventDurationFilter(selectedEvent);

    assert.isFalse(filter.accept(makeEvent('short', 0, 0)));
    assert.isFalse(filter.accept(makeEvent('short', 0, 0.1)));
    assert.isFalse(filter.accept(makeEvent('short', 0, 0.4)));
  });
});

describe('CompileCode filter', () => {
  it('excludes COMPILE_CODE nodes if non-selected', () => {
    const selectedEvent = makeEvent('selected', 0, 100);
    const compileCodeEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new ExcludeCompileCodeFilter(selectedEvent);
    assert.isFalse(filter.accept(compileCodeEvent));
  });

  it('includes COMPILE_CODE nodes if selected', () => {
    const selectedEvent = makeEvent(Trace.Types.Events.Name.COMPILE_CODE, 0, 100);
    const filter = new ExcludeCompileCodeFilter(selectedEvent);
    assert.isTrue(filter.accept(selectedEvent));
  });
});
