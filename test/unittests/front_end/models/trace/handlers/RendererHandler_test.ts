// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {
  getEventsIn,
  getRootAt,
  makeBeginEvent,
  makeCompleteEvent,
  makeEndEvent,
  makeInstantEvent,
  prettyPrint,
} from '../../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const MAIN_FRAME_PID = 2154214;
const SUB_FRAME_PID = 2236065;
const SUB_FRAME_PID_2 = 2236084;
const SUB_FRAME_PID_3 = 2236123;

async function handleEventsFromTraceFile(
    context: Mocha.Suite|Mocha.Context|null, file: string): Promise<TraceModel.Handlers.Types.TraceParseData> {
  const traceData = await TraceLoader.traceEngine(context, file);
  return traceData;
}

describeWithEnvironment('RendererHandler', function() {
  it('finds all the renderers in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    assert.strictEqual(renderers.processes.size, 4);

    const pids = [...renderers.processes].map(([pid]) => pid);
    assert.deepStrictEqual(
        pids,
        [
          MAIN_FRAME_PID,   // Main frame process: localhost:5000
          SUB_FRAME_PID,    // Sub frame process (trace start): example.com
          SUB_FRAME_PID_2,  // Sub frame process (after first navigation): example.com
          SUB_FRAME_PID_3,  // Sub frame process (after second navigation): example.com
        ],
        'Process IDs do not match expectations');

    const origins = [...renderers.processes].map(([, process]) => {
      return process.url ? new URL(process.url).origin : null;
    });
    assert.deepEqual(
        origins,
        [
          'http://localhost:5000',    // Main frame process: localhost:5000
          'https://www.example.com',  // Sub frame process (trace start): example.com
          'https://www.example.com',  // Sub frame process (after first navigation): example.com
          'https://www.example.com',  // Sub frame process (after second navigation): example.com
        ],
        'Process origins do not meet expectations');

    // Assert on whether it has correctly detected a given process to be on the
    // main frame or in a subframe.
    const isOnMainFrame = [...renderers.processes].map(([, process]) => process.isOnMainFrame);
    assert.deepStrictEqual(
        isOnMainFrame,
        [
          true,   // Main frame process: localhost:5000
          false,  // Sub frame process (trace start): example.com
          false,  // Sub frame process (after first navigation): example.com
          false,  // Sub frame process (after second navigation): example.com
        ],
        'Processes are incorrectly assigned as being on the main frame');
  });

  it('finds all the main frame threads in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const names = [...frame.threads].map(([, thread]) => thread.name).sort();
    assert.deepEqual(
        names,
        [
          'Chrome_ChildIOThread',
          'Compositor',
          'CompositorTileWorker1',
          'CompositorTileWorker2',
          'CompositorTileWorker3',
          'CompositorTileWorker4',
          'CrRendererMain',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolForegroundWorker',
          'ThreadPoolServiceThread',
        ],
        'Main frame thread names do not meet expectations before navigation');
  });

  it('finds all the sub frame threads in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const names = [...frame.threads].map(([, thread]) => thread.name).sort();
    assert.deepEqual(
        names,
        [
          'Chrome_ChildIOThread',
          'Compositor',
          'CrRendererMain',
          'ThreadPoolServiceThread',
        ],
        'Main frame thread names do not meet expectations after navigation');
  });

  it('finds all the roots on the main frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }
    assert.deepEqual([...tree.roots].map(root => root.id), [
      0,    1,    2,    3,    4,    5,    16,   18,   29,   38,   49,   58,   77,   183,  184,  185,  186,  188,  189,
      190,  199,  200,  201,  202,  211,  212,  213,  214,  229,  230,  232,  237,  239,  240,  242,  251,  252,  261,
      264,  265,  266,  267,  268,  279,  282,  284,  285,  286,  287,  288,  289,  290,  293,  294,  295,  296,  297,
      298,  299,  300,  301,  302,  303,  304,  305,  306,  328,  329,  330,  331,  332,  333,  334,  335,  336,  337,
      338,  339,  340,  341,  342,  343,  344,  345,  354,  355,  356,  359,  389,  408,  409,  410,  411,  412,  413,
      414,  415,  416,  417,  418,  419,  420,  421,  422,  423,  424,  425,  426,  427,  428,  429,  430,  431,  432,
      433,  441,  442,  443,  444,  445,  446,  447,  448,  455,  456,  457,  458,  459,  460,  461,  462,  463,  464,
      465,  466,  467,  468,  469,  479,  480,  481,  482,  483,  484,  485,  492,  493,  494,  495,  496,  498,  506,
      507,  508,  509,  510,  511,  516,  517,  518,  519,  520,  521,  522,  523,  524,  525,  526,  538,  540,  541,
      552,  555,  556,  565,  566,  575,  576,  585,  586,  595,  596,  605,  606,  615,  616,  625,  626,  635,  636,
      645,  646,  657,  660,  661,  662,  663,  674,  677,  678,  679,  680,  689,  690,  691,  692,  701,  702,  711,
      712,  721,  722,  733,  734,  737,  738,  739,  740,  749,  750,  751,  760,  761,  762,  771,  772,  773,  782,
      783,  784,  793,  794,  795,  796,  797,  808,  809,  810,  811,  835,  843,  844,  845,  846,  848,  861,  869,
      870,  871,  872,  873,  874,  875,  876,  877,  878,  881,  882,  883,  884,  885,  886,  887,  888,  889,  890,
      904,  905,  906,  907,  908,  909,  910,  911,  912,  913,  914,  915,  916,  917,  918,  919,  920,  921,  922,
      931,  932,  933,  936,  966,  967,  983,  984,  985,  986,  987,  988,  989,  990,  991,  992,  993,  994,  995,
      996,  997,  998,  999,  1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1020, 1021,
      1022, 1023, 1024, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055,
      1056, 1057, 1064, 1065, 1066, 1068, 1069, 1077, 1078, 1079, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088,
      1089, 1090, 1091, 1092, 1102, 1104, 1105, 1106, 1107, 1116, 1117, 1118, 1127, 1128, 1129, 1138, 1139, 1140, 1141,
      1150, 1151, 1152, 1153, 1154, 1165, 1166, 1167, 1176, 1177, 1178, 1189, 1192, 1193, 1194, 1203, 1204, 1205, 1206,
      1215, 1216, 1225, 1226, 1235, 1236, 1237, 1246, 1247, 1256, 1257, 1266, 1267, 1276, 1277, 1286, 1287, 1298, 1301,
      1302, 1303, 1304, 1313, 1314, 1315, 1324, 1325, 1326, 1335, 1336, 1337, 1348, 1351, 1352, 1353, 1362, 1364, 1365,
      1366, 1367, 1368, 1369, 1370, 1371, 1378,
    ]);
  });

  it('finds all the roots on the sub frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }
    assert.deepEqual(
        [...tree.roots].map(root => root.id), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('builds a hierarchy for the main frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }

    const isRoot = (node: TraceModel.Helpers.TreeHelpers.TraceEntryNode) => node.depth === 0;
    const isInstant = (event: TraceModel.Types.TraceEvents.TraceEntry) =>
        TraceModel.Types.TraceEvents.isTraceEventInstant(event);
    const isLong = (event: TraceModel.Types.TraceEvents.TraceEntry) =>
        TraceModel.Types.TraceEvents.isTraceEventComplete(event) && event.dur > 1000;
    const isIncluded =
        (node: TraceModel.Helpers.TreeHelpers.TraceEntryNode, event: TraceModel.Types.TraceEvents.TraceEntry) =>
            (!isRoot(node) || isInstant(event) || isLong(event)) &&
        Boolean(Timeline.EventUICategory.getEventStyle(event.name as TraceModel.Types.TraceEvents.KnownEventName));
    assert.strictEqual(prettyPrint(tree, isIncluded), `
............
-RunTask [2.21ms]
.
  -MajorGC [2.148ms]
...........................................................
-RunTask [15.436ms]
  -FrameStartedLoading [0ms]
  -EventDispatch (pagehide) [0.018ms]
  -EventDispatch (visibilitychange) [0.01ms]
  -EventDispatch (webkitvisibilitychange) [0.006ms]
.
  -EventDispatch (unload) [0.006ms]
.
  -ResourceSendRequest [0ms]
  -ResourceReceiveResponse [0ms]
...
  -ProfileCall (anonymous) [0.205ms]
    -ProfileCall (anonymous) [0.205ms]
.......................
-RunTask [3.402ms]
  -ParseHTML [2.593ms]
....
    -ParseHTML [0.064ms]
...
    -EventDispatch (readystatechange) [0.008ms]
.
    -EventDispatch (DOMContentLoaded) [0.004ms]
.
    -MarkDOMContent [0ms]
.
    -EventDispatch (readystatechange) [0.01ms]
    -EventDispatch (beforeunload) [0.013ms]
    -FrameStartedLoading [0ms]
.
  -ParseHTML [0.01ms]
..
  -EventDispatch (readystatechange) [0.008ms]
.
  -EventDispatch (DOMContentLoaded) [0.035ms]
.
  -UpdateLayoutTree [0.373ms]
    -InvalidateLayout [0ms]
  -MarkDOMContent [0ms]
-RunTask [2.675ms]
  -BeginMainThreadFrame [0ms]
  -Layout [0.854ms]
    -InvalidateLayout [0ms]
    -Layout [0.302ms]
      -UpdateLayoutTree [0.149ms]
.
  -UpdateLayerTree [0.338ms]
  -Paint [0.203ms]
..
  -firstPaint [0ms]
  -firstContentfulPaint [0ms]
.....
  -largestContentfulPaint::Candidate [0ms]
.................................
-RunTask [1.605ms]
  -EventDispatch (pagehide) [0.014ms]
  -EventDispatch (visibilitychange) [0.038ms]
  -EventDispatch (webkitvisibilitychange) [0.009ms]
  -EventDispatch (unload) [0.004ms]
.
  -ScheduleStyleRecalculation [0ms]
..............
-RunTask [1.231ms]
  -BeginMainThreadFrame [0ms]
  -UpdateLayoutTree [0.093ms]
.
  -UpdateLayerTree [0.186ms]
  -Paint [0.063ms]
  -Paint [0.084ms]
  -UpdateLayer [0.022ms]
  -UpdateLayer [0.006ms]
  -CompositeLayers [0.311ms]
............
-RunTask [1.663ms]
.
  -EventDispatch (readystatechange) [0.009ms]
.
  -EventDispatch (load) [0.014ms]
.
  -MarkLoad [0ms]
  -EventDispatch (pageshow) [0.007ms]
.......................................................................................
-RunTask [1.42ms]
.
  -UpdateLayerTree [0.023ms]
  -HitTest [0.057ms]
  -EventDispatch (mousemove) [0.018ms]
.
  -UpdateLayerTree [0.028ms]
  -HitTest [0.022ms]
.
  -UpdateLayerTree [0.01ms]
  -HitTest [0.002ms]
  -ScheduleStyleRecalculation [0ms]
  -EventDispatch (mousedown) [0.018ms]
  -UpdateLayoutTree [0.146ms]
.
  -UpdateLayerTree [0.031ms]
  -HitTest [0.016ms]
  -ScheduleStyleRecalculation [0ms]
  -UpdateLayoutTree [0.031ms]
  -EventDispatch (focus) [0.014ms]
  -EventDispatch (focusin) [0.005ms]
  -EventDispatch (DOMFocusIn) [0.005ms]
.
  -UpdateLayerTree [0.029ms]
.....
-RunTask [1.034ms]
.
  -UpdateLayerTree [0.021ms]
  -HitTest [0.038ms]
  -ScheduleStyleRecalculation [0ms]
  -EventDispatch (mouseup) [0.016ms]
  -EventDispatch (click) [0.44ms]
    -EventDispatch (beforeunload) [0.009ms]
    -FrameStartedLoading [0ms]
.
  -UpdateLayoutTree [0.137ms]
.
  -UpdateLayerTree [0.03ms]
....................
-RunTask [8.203ms]
  -EventDispatch (pagehide) [0.016ms]
  -EventDispatch (visibilitychange) [0.006ms]
  -EventDispatch (webkitvisibilitychange) [0.004ms]
  -EventDispatch (unload) [0.008ms]
..
  -ResourceSendRequest [0ms]
  -ResourceSendRequest [0ms]
  -ResourceReceiveResponse [0ms]
..........................
-RunTask [2.996ms]
  -ParseHTML [2.368ms]
....
    -ParseHTML [0.074ms]
...
    -EventDispatch (readystatechange) [0.01ms]
.
    -EventDispatch (DOMContentLoaded) [0.005ms]
.
    -MarkDOMContent [0ms]
.
    -EventDispatch (readystatechange) [0.008ms]
    -EventDispatch (beforeunload) [0.009ms]
    -FrameStartedLoading [0ms]
.
  -ParseHTML [0.009ms]
..
  -EventDispatch (readystatechange) [0.007ms]
.
  -EventDispatch (DOMContentLoaded) [0.005ms]
.
  -UpdateLayoutTree [0.301ms]
    -InvalidateLayout [0ms]
  -MarkDOMContent [0ms]
.
-RunTask [1.897ms]
  -BeginMainThreadFrame [0ms]
  -Layout [0.44ms]
    -InvalidateLayout [0ms]
.
  -UpdateLayerTree [0.247ms]
  -Paint [0.289ms]
..
  -firstPaint [0ms]
  -firstContentfulPaint [0ms]
..
  -largestContentfulPaint::Candidate [0ms]
....................................
-RunTask [1.304ms]
  -EventDispatch (pagehide) [0.016ms]
  -EventDispatch (visibilitychange) [0.009ms]
  -EventDispatch (webkitvisibilitychange) [0.004ms]
  -EventDispatch (unload) [0.015ms]
.
  -ScheduleStyleRecalculation [0ms]
......................................................................................................................`);
  });

  it('builds a hierarchy for the sub frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }
    const isIncluded =
        (_node: TraceModel.Helpers.TreeHelpers.TraceEntryNode, event: TraceModel.Types.TraceEvents.TraceEntry) =>
            Boolean(Timeline.EventUICategory.getEventStyle(event.name as TraceModel.Types.TraceEvents.KnownEventName));
    assert.strictEqual(prettyPrint(tree, isIncluded), `
-RunTask [0.13ms]
-RunTask [0.005ms]
-RunTask [0.009ms]
-RunTask [0.065ms]
-RunTask [0.084ms]
-RunTask [0.041ms]
-RunTask [0.057ms]
-RunTask [0.021ms]
-RunTask [0.009ms]
-RunTask [0.065ms]
-RunTask [0.078ms]
-RunTask [0.043ms]
-RunTask [0.077ms]
  -ScheduleStyleRecalculation [0ms]
-RunTask [0.415ms]
-RunTask [0ms]
-EventDispatch (pagehide) [0.012ms]
-EventDispatch (visibilitychange) [0.007ms]
-EventDispatch (webkitvisibilitychange) [0.016ms]
-EventDispatch (unload) [0.007ms]
.`);
  });

  it('has some correct known roots for the main frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }

    const event0 = getRootAt(thread, 1).entry;
    assert.deepEqual(event0 as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 132,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2154214,
      'tdur': 131,
      'tid': 1,
      'ts': 643492822363,
      'tts': 291450,
      'selfTime': 132,
    });

    const event1 = getRootAt(thread, 2).entry;
    assert.deepEqual(event1 as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 4,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2154214,
      'tdur': 4,
      'tid': 1,
      'ts': 643492822500,
      'tts': 291586,
      'selfTime': 4,
    });

    const eventLast = getRootAt(thread, tree.roots.size - 1).entry;
    assert.deepEqual(eventLast as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 67,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2154214,
      'tdur': 67,
      'tid': 1,
      'ts': 643499551460,
      'tts': 949032,
      'selfTime': 35,
    });
  });

  it('has some correct known roots for the sub frame\'s main thread in a real world profile', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const frame = renderers.processes.get(TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID)) as
        TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess;
    const thread = [...frame.threads.values()].find(thread => thread.name === 'CrRendererMain');
    if (!thread) {
      assert(false, 'Main thread was not found');
      return;
    }

    const tree = thread.tree;
    if (!tree) {
      assert(false, 'Main thread has no tree of events');
      return;
    }

    const event0 = getRootAt(thread, 0).entry;
    assert.deepEqual(event0 as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 130,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2236065,
      'tdur': 129,
      'tid': 1,
      'ts': 643492822099,
      'tts': 62157,
      'selfTime': 130,
    });

    const event1 = getRootAt(thread, 1).entry;
    assert.deepEqual(event1 as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 5,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2236065,
      'tdur': 5,
      'tid': 1,
      'ts': 643492822234,
      'tts': 62291,
      'selfTime': 5,
    });

    const event2 = getRootAt(thread, 2).entry;

    assert.deepEqual(event2 as unknown, {
      'args': {},
      'cat': 'disabled-by-default-devtools.timeline',
      'dur': 9,
      'name': 'RunTask',
      'ph': 'X',
      'pid': 2236065,
      'tdur': 9,
      'tid': 1,
      'ts': 643492822242,
      'tts': 62299,
      'selfTime': 9,
    });
  });

  it('can correctly sort a simple list of complete events', async () => {
    const data = [
      makeCompleteEvent('d0', 2, 1),
      makeCompleteEvent('b0', 1, 1),
      makeCompleteEvent('a0', 0, 1),
      makeCompleteEvent('a1', 0, 0.5),
      makeCompleteEvent('a2', 0.5, 0.5),
      makeCompleteEvent('c0', 1.5, 0.5),
      makeCompleteEvent('a4', 0.99, 0.01),
      makeCompleteEvent('b1', 1, 0.01),
      makeCompleteEvent('a3', 0.5, 0.25),
    ];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);

    assert.deepEqual(data.map(e => ({name: e.name, ts: e.ts, dur: e.dur})) as unknown, [
      {'name': 'a0', 'ts': 0, 'dur': 1},
      {'name': 'a1', 'ts': 0, 'dur': 0.5},
      {'name': 'a2', 'ts': 0.5, 'dur': 0.5},
      {'name': 'a3', 'ts': 0.5, 'dur': 0.25},
      {'name': 'a4', 'ts': 0.99, 'dur': 0.01},
      {'name': 'b0', 'ts': 1, 'dur': 1},
      {'name': 'b1', 'ts': 1, 'dur': 0.01},
      {'name': 'c0', 'ts': 1.5, 'dur': 0.5},
      {'name': 'd0', 'ts': 2, 'dur': 1},
    ]);
  });

  it('can correctly sort a simple list of complete events interspersed with instant events', async () => {
    const data = [
      makeCompleteEvent('d0', 2, 1),
      makeInstantEvent('i0', 0),
      makeCompleteEvent('b0', 1, 1),
      makeInstantEvent('i1', 0.01),
      makeCompleteEvent('a0', 0, 1),
      makeInstantEvent('i2', 0.5),
      makeCompleteEvent('a1', 0, 0.5),
      makeInstantEvent('i3', 0.99),
      makeCompleteEvent('a2', 0.5, 0.5),
      makeInstantEvent('i4', 1),
      makeCompleteEvent('c0', 1.5, 0.5),
      makeInstantEvent('i5', 1.75),
      makeCompleteEvent('a4', 0.99, 0.01),
      makeInstantEvent('i6', 1.99),
      makeCompleteEvent('b1', 1, 0.01),
      makeInstantEvent('i7', 2),
      makeCompleteEvent('a3', 0.5, 0.25),
      makeInstantEvent('i8', 2.01),
    ];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);

    assert.deepEqual(data.map(e => ({name: e.name, ts: e.ts, dur: e.dur})) as unknown, [
      {'name': 'a0', 'ts': 0, 'dur': 1},
      {'name': 'a1', 'ts': 0, 'dur': 0.5},
      {'name': 'i0', 'ts': 0, 'dur': undefined},
      {'name': 'i1', 'ts': 0.01, 'dur': undefined},
      {'name': 'a2', 'ts': 0.5, 'dur': 0.5},
      {'name': 'a3', 'ts': 0.5, 'dur': 0.25},
      {'name': 'i2', 'ts': 0.5, 'dur': undefined},
      {'name': 'a4', 'ts': 0.99, 'dur': 0.01},
      {'name': 'i3', 'ts': 0.99, 'dur': undefined},
      {'name': 'b0', 'ts': 1, 'dur': 1},
      {'name': 'b1', 'ts': 1, 'dur': 0.01},
      {'name': 'i4', 'ts': 1, 'dur': undefined},
      {'name': 'c0', 'ts': 1.5, 'dur': 0.5},
      {'name': 'i5', 'ts': 1.75, 'dur': undefined},
      {'name': 'i6', 'ts': 1.99, 'dur': undefined},
      {'name': 'd0', 'ts': 2, 'dur': 1},
      {'name': 'i7', 'ts': 2, 'dur': undefined},
      {'name': 'i8', 'ts': 2.01, 'dur': undefined},
    ]);
  });

  it('can process multiple processes', async () => {
    /**
     * |------------- Task A -------------||-- Task E --|
     *  |-- Task B --||-- Task D --|
     *   |- Task C -|
     */
    const data1 = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 1, 3),   // 1..4
      makeCompleteEvent('D', 5, 3),   // 5..8
      makeCompleteEvent('C', 2, 1),   // 2..3
      makeCompleteEvent('E', 11, 3),  // 11..14
    ];

    /**
     * |-- Task F --||------------- Task G -------------|
     *               |-- Task H --||-- Task J --|
     *                 |- Task I -|
     */
    const data2 = [
      makeCompleteEvent('F', 0, 3),   // 0..3
      makeCompleteEvent('G', 3, 10),  // 3..13 (starts when F finishes)
      makeCompleteEvent('H', 3, 3),   // 3..6 (starts same time as G)
      makeCompleteEvent('J', 6, 3),   // 6..9 (starts when H finishes)
      makeCompleteEvent('I', 5, 1),   // 5..6 (finishes when H finishes)
    ];

    const processes = new Map([
      [
        TraceModel.Types.TraceEvents.ProcessID(0),
        {
          url: ('http://a.com'),
          isOnMainFrame: true,
          threads: new Map([[
            TraceModel.Types.TraceEvents.ThreadID(1),
            {name: 'Foo', entries: data1},
          ]]),
        } as TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess,
      ],
      [
        TraceModel.Types.TraceEvents.ProcessID(2),
        {
          url: ('http://b.com'),
          isOnMainFrame: false,
          threads: new Map([[
            TraceModel.Types.TraceEvents.ThreadID(3),
            {name: 'Bar', entries: data2},
          ]]),
        } as TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess,
      ],
    ]);

    TraceModel.Handlers.ModelHandlers.Samples.initialize();
    await TraceModel.Handlers.ModelHandlers.Samples.finalize();
    TraceModel.Handlers.ModelHandlers.Renderer.buildHierarchy(processes, {filter: {has: () => true}});

    const firstThread = [...[...processes.values()][0].threads.values()][0];
    const secondThread = [...[...processes.values()][1].threads.values()][0];

    if (!firstThread.tree || !secondThread.tree) {
      assert(false, 'Trees not found');
      return;
    }

    assert.strictEqual(firstThread.tree.maxDepth, 3, 'Got the correct tree max depth for the first thread');
    assert.strictEqual(secondThread.tree.maxDepth, 3, 'Got the correct tree max depth for the second thread');

    const firstRoots = getEventsIn(firstThread.tree.roots.values());
    assert.deepEqual(firstRoots.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'A', 'ts': 0, 'dur': 10},
      {'name': 'E', 'ts': 11, 'dur': 3},
    ]);

    const secondRoots = getEventsIn(secondThread.tree.roots.values());
    assert.deepEqual(secondRoots.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'F', 'ts': 0, 'dur': 3},
      {'name': 'G', 'ts': 3, 'dur': 10},
    ]);
  });

  it('can assign origins to processes', async () => {
    const {Meta: metadata} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const processes:
        Map<TraceModel.Types.TraceEvents.ProcessID, TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess> =
            new Map();

    TraceModel.Handlers.ModelHandlers.Renderer.assignOrigin(processes, metadata.rendererProcessesByFrame);

    assert.deepEqual([...processes].map(([pid, p]) => [pid, p.url ? new URL(p.url).origin : null]), [
      [TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID), 'http://localhost:5000'],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID), 'https://www.example.com'],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_2), 'https://www.example.com'],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_3), 'https://www.example.com'],
    ]);
  });

  it('can assign main frame flags to processes', async () => {
    const {Meta: metadata} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const processes:
        Map<TraceModel.Types.TraceEvents.ProcessID, TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess> =
            new Map();

    TraceModel.Handlers.ModelHandlers.Renderer.assignIsMainFrame(
        processes, metadata.mainFrameId, metadata.rendererProcessesByFrame);

    assert.deepEqual([...processes].map(([pid, p]) => [pid, p.isOnMainFrame]), [
      [TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID), true],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID), false],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_2), false],
      [TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_3), false],
    ]);
  });

  it('can assign thread names to threads in processes', async () => {
    const {Meta: metadata} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    const {mainFrameId, rendererProcessesByFrame, threadsInProcess} = metadata;
    const processes:
        Map<TraceModel.Types.TraceEvents.ProcessID, TraceModel.Handlers.ModelHandlers.Renderer.RendererProcess> =
            new Map();

    TraceModel.Handlers.ModelHandlers.Renderer.assignMeta(
        processes, mainFrameId, rendererProcessesByFrame, threadsInProcess);

    assert.deepEqual([...processes].map(([pid, p]) => [pid, [...p.threads].map(([tid, t]) => [tid, t.name])]), [
      [
        TraceModel.Types.TraceEvents.ProcessID(MAIN_FRAME_PID),
        [
          [TraceModel.Types.TraceEvents.ThreadID(1), 'CrRendererMain'],
          [TraceModel.Types.TraceEvents.ThreadID(7), 'Compositor'],
          [TraceModel.Types.TraceEvents.ThreadID(2), 'ThreadPoolServiceThread'],
          [TraceModel.Types.TraceEvents.ThreadID(4), 'Chrome_ChildIOThread'],
          [TraceModel.Types.TraceEvents.ThreadID(24), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(27), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(17), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(29), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(25), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(28), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(30), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(26), 'ThreadPoolForegroundWorker'],
          [TraceModel.Types.TraceEvents.ThreadID(11), 'CompositorTileWorker3'],
          [TraceModel.Types.TraceEvents.ThreadID(12), 'CompositorTileWorker4'],
          [TraceModel.Types.TraceEvents.ThreadID(10), 'CompositorTileWorker2'],
          [TraceModel.Types.TraceEvents.ThreadID(9), 'CompositorTileWorker1'],
        ],
      ],
      [
        TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID),
        [
          [TraceModel.Types.TraceEvents.ThreadID(2), 'ThreadPoolServiceThread'],
          [TraceModel.Types.TraceEvents.ThreadID(1), 'CrRendererMain'],
          [TraceModel.Types.TraceEvents.ThreadID(7), 'Compositor'],
          [TraceModel.Types.TraceEvents.ThreadID(4), 'Chrome_ChildIOThread'],
        ],
      ],
      [
        TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_2),
        [
          [TraceModel.Types.TraceEvents.ThreadID(1), 'CrRendererMain'],
          [TraceModel.Types.TraceEvents.ThreadID(4), 'Chrome_ChildIOThread'],
          [TraceModel.Types.TraceEvents.ThreadID(8), 'Compositor'],
          [TraceModel.Types.TraceEvents.ThreadID(2), 'ThreadPoolServiceThread'],
          [TraceModel.Types.TraceEvents.ThreadID(10), 'CompositorTileWorker1'],
        ],
      ],
      [
        TraceModel.Types.TraceEvents.ProcessID(SUB_FRAME_PID_3),
        [
          [TraceModel.Types.TraceEvents.ThreadID(1), 'CrRendererMain'],
          [TraceModel.Types.TraceEvents.ThreadID(2), 'ThreadPoolServiceThread'],
          [TraceModel.Types.TraceEvents.ThreadID(4), 'Chrome_ChildIOThread'],
          [TraceModel.Types.TraceEvents.ThreadID(7), 'Compositor'],
          [TraceModel.Types.TraceEvents.ThreadID(10), 'CompositorTileWorker2'],
          [TraceModel.Types.TraceEvents.ThreadID(3), 'ThreadPoolForegroundWorker'],
        ],
      ],
    ]);
  });

  it('populates the map of trace events to tree nodes', async () => {
    const {Renderer: renderers} = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    assert.strictEqual(renderers.entryToNode.size, 3591);
  });
  describe('Synthetic complete events', () => {
    async function handleEvents(traceEvents: TraceModel.Types.TraceEvents.TraceEventData[]):
        Promise<TraceModel.Handlers.ModelHandlers.Renderer.RendererHandlerData> {
      TraceModel.Handlers.ModelHandlers.Renderer.reset();
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Samples.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.Samples.initialize();
      TraceModel.Handlers.ModelHandlers.Renderer.initialize();

      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.Renderer.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.Samples.finalize();
      await TraceModel.Handlers.ModelHandlers.Renderer.finalize();
      return TraceModel.Handlers.ModelHandlers.Renderer.data();
    }
    let defaultTraceEvents: readonly TraceModel.Types.TraceEvents.TraceEventData[];
    const pid = TraceModel.Types.TraceEvents.ProcessID(28274);
    const tid = TraceModel.Types.TraceEvents.ThreadID(775);
    beforeEach(async function() {
      defaultTraceEvents = await TraceLoader.rawEvents(this, 'basic.json.gz');
    });

    afterEach(() => {
      TraceModel.Handlers.ModelHandlers.Renderer.reset();
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Samples.reset();
    });

    it('builds a hierarchy using begin and end trace events', async () => {
      // |------------- RunTask -------------||-- RunTask --|
      //  |-- RunMicrotasks --||-- Layout --|
      //   |- FunctionCall -|
      const traceEvents = [
        ...defaultTraceEvents, makeBeginEvent('RunTask', 0, '*', pid, tid),  // 0..10
        makeBeginEvent('RunMicrotasks', 1, '*', pid, tid),                   // 1..4
        makeBeginEvent('FunctionCall', 2, '*', pid, tid),                    // 2..3
        makeEndEvent('FunctionCall', 3, '*', pid, tid),                      // 2..3
        makeEndEvent('RunMicrotasks', 4, '*', pid, tid),                     // 1..4
        makeBeginEvent('Layout', 5, '*', pid, tid),                          // 5..8
        makeEndEvent('Layout', 8, '*', pid, tid),                            // 5..8
        makeEndEvent('RunTask', 10, '*', pid, tid),                          // 0..10
        makeBeginEvent('RunTask', 11, '*', pid, tid),                        // 11..14
        makeEndEvent('RunTask', 14, '*', pid, tid),                          // 11..14
      ];

      const data = await handleEvents(traceEvents);

      assert.strictEqual(data.allRendererEvents.length, 7);
      assert.strictEqual(data.processes.size, 1);
      const [process] = data.processes.values();
      assert.strictEqual(process.threads.size, 1);
      const [thread] = process.threads.values();
      assert.strictEqual(thread.tree?.roots.size, 2);
      assert.strictEqual(thread.tree?.nodes.size, 5);
      if (!thread.tree) {
        return;
      }
      assert.strictEqual(prettyPrint(thread.tree), `
-RunTask [0.01ms]
  -RunMicrotasks [0.003ms]
    -FunctionCall [0.001ms]
  -Layout [0.003ms]
-RunTask [0.003ms]`);
    });
    it('builds a hierarchy using complete, begin and end trace events', async () => {
      // |------------- RunTask -------------|
      //  |-- RunMicrotasks --||-- Layout --|
      //   |- FunctionCall -|

      const traceEvents = [
        ...defaultTraceEvents, makeBeginEvent('RunTask', 0, '*', pid, tid),  // 0..10
        makeBeginEvent('RunMicrotasks', 1, '*', pid, tid),                   // 1..4
        makeCompleteEvent('FunctionCall', 2, 1, '*', pid, tid),              // 2..3
        makeEndEvent('RunMicrotasks', 4, '*', pid, tid),                     // 1..4
        makeBeginEvent('Layout', 5, '*', pid, tid),                          // 5..8
        makeEndEvent('Layout', 8, '*', pid, tid),                            // 5..8
        makeEndEvent('RunTask', 10, '*', pid, tid),                          // 0..10
      ];

      const data = await handleEvents(traceEvents);

      assert.strictEqual(data.allRendererEvents.length, 6);
      assert.strictEqual(data.processes.size, 1);
      const [process] = data.processes.values();
      assert.strictEqual(process.threads.size, 1);
      const [thread] = process.threads.values();
      assert.strictEqual(thread.tree?.roots.size, 1);
      assert.strictEqual(thread.tree?.nodes.size, 4);
      if (!thread.tree) {
        return;
      }
      assert.strictEqual(prettyPrint(thread.tree), `
-RunTask [0.01ms]
  -RunMicrotasks [0.003ms]
    -FunctionCall [0.001ms]
  -Layout [0.003ms]`);
    });
  });
  describe('building hierarchies trace events and profile calls', () => {
    it('build a hierarchy using data from real world trace file', async () => {
      const {Renderer} = await handleEventsFromTraceFile(this, 'recursive-counting-js.json.gz');
      const threadId = TraceModel.Types.TraceEvents.ThreadID(259);
      const firstProcessId = TraceModel.Types.TraceEvents.ProcessID(23239);
      const thread = Renderer.processes.get(firstProcessId)?.threads.get(threadId);
      if (!thread || !thread.tree) {
        throw new Error('Tree not found');
      }
      const onlyLongTasksPredicate =
          (_node: TraceModel.Helpers.TreeHelpers.TraceEntryNode, event: TraceModel.Types.TraceEvents.TraceEntry) =>
              Boolean(event.dur && event.dur > 1000) &&
          Boolean(Timeline.EventUICategory.getEventStyle(event.name as TraceModel.Types.TraceEvents.KnownEventName));
      assert.strictEqual(prettyPrint(thread.tree, onlyLongTasksPredicate), `
.............
-RunTask [17.269ms]
.............................
-RunTask [1065.663ms]
  -ParseHTML [1065.609ms]
.........
-RunTask [1.12ms]
  -ParseHTML [1.082ms]
.........................................................
-RunTask [1058.811ms]
  -TimerFire [1058.77ms]
    -FunctionCall [1058.693ms]
.
      -ProfileCall (anonymous) [1058.589ms]
        -ProfileCall (foo) [1058.589ms]
          -ProfileCall (foo) [1058.589ms]
            -ProfileCall (foo) [1058.589ms]
              -ProfileCall (foo) [1058.589ms]
..
                -ProfileCall (count) [1058.453ms]
........
-RunTask [1057.455ms]
  -TimerFire [1057.391ms]
    -FunctionCall [1057.27ms]
.
      -ProfileCall (anonymous) [1056.579ms]
        -ProfileCall (foo) [1056.579ms]
          -ProfileCall (foo) [1056.579ms]
            -ProfileCall (foo) [1056.579ms]
              -ProfileCall (foo) [1056.579ms]
                -ProfileCall (count) [1056.538ms]
........`);
    });
  });

  it('identifies and returns rasterizer threads', async () => {
    const {Renderer} = await handleEventsFromTraceFile(this, 'web-dev.json.gz');
    assert.deepEqual(Array.from(Renderer.compositorTileWorkers.entries()), [
      [
        TraceModel.Types.TraceEvents.ProcessID(68481),
        [
          TraceModel.Types.TraceEvents.ThreadID(81675),
        ],
      ],
      [
        TraceModel.Types.TraceEvents.ProcessID(73704),
        [
          TraceModel.Types.TraceEvents.ThreadID(23299),
          TraceModel.Types.TraceEvents.ThreadID(22275),
          TraceModel.Types.TraceEvents.ThreadID(41475),
          TraceModel.Types.TraceEvents.ThreadID(40451),
          TraceModel.Types.TraceEvents.ThreadID(22531),
        ],
      ],
    ]);
  });

  it('keeps the processes associated with AuctionWorklets and assigns them URLs', async () => {
    const {Renderer, AuctionWorklets} = await handleEventsFromTraceFile(this, 'fenced-frame-fledge.json.gz');
    assert.strictEqual(AuctionWorklets.worklets.size, 3);
    for (const [pid] of AuctionWorklets.worklets) {
      const process = Renderer.processes.get(pid);
      assert.isDefined(process);
      // Ensure that the URL was set properly based on the AuctionWorklets metadata event.
      assert.isTrue(process?.url?.includes('fledge-demo.glitch.me'));
    }
  });
});
