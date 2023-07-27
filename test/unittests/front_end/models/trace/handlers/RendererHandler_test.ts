// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
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

describe('RendererHandler', function() {
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
    assert.deepEqual([...tree.roots], [
      0,   1,   2,   3,   4,   9,   10,  11,  12,  13,  14,  16,  18,  19,  20,  21,  22,  23,  24,  28,  29,  30,  31,
      35,  36,  37,  38,  45,  46,  48,  50,  52,  53,  54,  59,  60,  64,  65,  66,  67,  68,  69,  75,  76,  78,  79,
      80,  81,  82,  83,  84,  86,  87,  88,  89,  90,  91,  92,  93,  94,  95,  96,  101, 102, 103, 104, 105, 106, 107,
      108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 134, 140, 141, 142, 143, 144, 145, 146,
      147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 170, 171, 172, 173,
      174, 175, 176, 177, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 204, 205, 206, 207,
      208, 209, 210, 214, 215, 216, 217, 218, 220, 224, 225, 226, 227, 228, 229, 231, 232, 233, 234, 235, 236, 237, 238,
      239, 240, 241, 248, 249, 250, 256, 257, 258, 262, 263, 267, 268, 272, 273, 277, 278, 282, 283, 287, 288, 292, 293,
      297, 298, 302, 303, 309, 310, 311, 312, 313, 319, 320, 321, 322, 323, 327, 328, 329, 330, 334, 335, 339, 340, 344,
      345, 351, 352, 353, 354, 355, 356, 360, 361, 362, 366, 367, 368, 372, 373, 374, 378, 379, 380, 384, 385, 386, 387,
      388, 394, 395, 396, 397, 411, 416, 417, 418, 419, 420, 427, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442,
      443, 444, 445, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469,
      470, 471, 472, 484, 485, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506,
      507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 523, 524, 525, 526, 527, 533, 534, 535, 536, 537, 538,
      539, 540, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 560, 561, 562, 564, 565, 569, 570, 571, 572, 573, 574,
      575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 589, 590, 591, 592, 593, 597, 598, 599, 603, 604, 605, 609, 610,
      611, 612, 616, 617, 618, 619, 620, 626, 627, 628, 632, 633, 634, 640, 641, 642, 643, 647, 648, 649, 650, 654, 655,
      659, 660, 664, 665, 666, 670, 671, 675, 676, 680, 681, 685, 686, 690, 691, 697, 698, 699, 700, 701, 705, 706, 707,
      711, 712, 713, 717, 718, 719, 725, 726, 727, 728, 732, 734, 735, 736, 737, 738, 739, 740, 741, 745,
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
    assert.deepEqual([...tree.roots], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19]);
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

    const isRoot = (node: TraceModel.Handlers.ModelHandlers.Renderer.RendererEntryNode) => node.depth === 0;
    const isInstant = (event: TraceModel.Handlers.ModelHandlers.Renderer.RendererEntry) =>
        TraceModel.Types.TraceEvents.isTraceEventInstant(event);
    const isLong = (event: TraceModel.Handlers.ModelHandlers.Renderer.RendererEntry) =>
        TraceModel.Types.TraceEvents.isTraceEventComplete(event) && event.dur > 1000;
    const isIncluded =
        (node: TraceModel.Handlers.ModelHandlers.Renderer.RendererEntryNode,
         event: TraceModel.Handlers.ModelHandlers.Renderer.RendererEntry) =>
            !isRoot(node) || (isInstant(event) || isLong(event));

    assert.strictEqual(prettyPrint(thread, tree.roots, isIncluded), `
...........
-RunTask [2.21ms]
  -MajorGC [2.148ms]
.................................................
-RunTask [15.436ms]
  -EventDispatch (pagehide) [0.018ms]
  -EventDispatch (visibilitychange) [0.01ms]
  -EventDispatch (webkitvisibilitychange) [0.006ms]
  -EventDispatch (unload) [0.006ms]
.....................
-RunTask [3.402ms]
  -ParseHTML [2.593ms]
    -ParseHTML [0.064ms]
    -EventDispatch (readystatechange) [0.008ms]
    -EventDispatch (DOMContentLoaded) [0.004ms]
    -EventDispatch (readystatechange) [0.01ms]
    -EventDispatch (beforeunload) [0.013ms]
  -ParseHTML [0.01ms]
  -EventDispatch (readystatechange) [0.008ms]
  -EventDispatch (DOMContentLoaded) [0.035ms]
  -UpdateLayoutTree [0.373ms]
    -InvalidateLayout [0ms]
-RunTask [2.675ms]
  -Layout [0.854ms]
    -InvalidateLayout [0ms]
    -Layout [0.302ms]
      -UpdateLayoutTree [0.149ms]
  -Paint [0.203ms]
.................................
-RunTask [1.605ms]
  -EventDispatch (pagehide) [0.014ms]
  -EventDispatch (visibilitychange) [0.038ms]
  -EventDispatch (webkitvisibilitychange) [0.009ms]
  -EventDispatch (unload) [0.004ms]
  -ScheduleStyleRecalculation [0ms]
..............
-RunTask [1.231ms]
  -UpdateLayoutTree [0.093ms]
  -Paint [0.063ms]
  -Paint [0.084ms]
  -UpdateLayer [0.022ms]
  -UpdateLayer [0.006ms]
  -CompositeLayers [0.311ms]
............
-RunTask [1.663ms]
  -EventDispatch (readystatechange) [0.009ms]
  -EventDispatch (load) [0.014ms]
  -EventDispatch (pageshow) [0.007ms]
.......................................................................................
-RunTask [1.42ms]
  -HitTest [0.057ms]
  -EventDispatch (mousemove) [0.018ms]
  -HitTest [0.022ms]
  -HitTest [0.002ms]
  -ScheduleStyleRecalculation [0ms]
  -EventDispatch (mousedown) [0.018ms]
  -UpdateLayoutTree [0.146ms]
  -HitTest [0.016ms]
  -ScheduleStyleRecalculation [0ms]
  -UpdateLayoutTree [0.031ms]
  -EventDispatch (focus) [0.014ms]
  -EventDispatch (focusin) [0.005ms]
  -EventDispatch (DOMFocusIn) [0.005ms]
.....
-RunTask [1.034ms]
  -HitTest [0.038ms]
  -ScheduleStyleRecalculation [0ms]
  -EventDispatch (mouseup) [0.016ms]
  -EventDispatch (click) [0.44ms]
    -EventDispatch (beforeunload) [0.009ms]
  -UpdateLayoutTree [0.137ms]
..............
-RunTask [8.203ms]
  -EventDispatch (pagehide) [0.016ms]
  -EventDispatch (visibilitychange) [0.006ms]
  -EventDispatch (webkitvisibilitychange) [0.004ms]
  -EventDispatch (unload) [0.008ms]
......................
-RunTask [2.996ms]
  -ParseHTML [2.368ms]
    -ParseHTML [0.074ms]
    -EventDispatch (readystatechange) [0.01ms]
    -EventDispatch (DOMContentLoaded) [0.005ms]
    -EventDispatch (readystatechange) [0.008ms]
    -EventDispatch (beforeunload) [0.009ms]
  -ParseHTML [0.009ms]
  -EventDispatch (readystatechange) [0.007ms]
  -EventDispatch (DOMContentLoaded) [0.005ms]
  -UpdateLayoutTree [0.301ms]
    -InvalidateLayout [0ms]
.
-RunTask [1.897ms]
  -Layout [0.44ms]
    -InvalidateLayout [0ms]
  -Paint [0.289ms]
..................................
-RunTask [1.304ms]
  -EventDispatch (pagehide) [0.016ms]
  -EventDispatch (visibilitychange) [0.009ms]
  -EventDispatch (webkitvisibilitychange) [0.004ms]
  -EventDispatch (unload) [0.015ms]
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

    assert.strictEqual(prettyPrint(thread, tree.roots), `
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
-EventDispatch (unload) [0.007ms]`);
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

    const event0 = getRootAt(thread, 0).entry;
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

    const event1 = getRootAt(thread, 1).entry;
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
      'selfTime': 67,
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

    const eventLast = getRootAt(thread, tree.roots.size - 1).entry;
    assert.deepEqual(eventLast as unknown, {
      'args': {'data': {'type': 'unload'}},
      'cat': 'devtools.timeline',
      'dur': 7,
      'name': 'EventDispatch',
      'ph': 'X',
      'pid': 2236065,
      'tdur': 4,
      'tid': 1,
      'ts': 643494154134,
      'tts': 63878,
      'selfTime': 7,
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

  it('can build a hierarchy of events without filters', async () => {
    /**
     * |------------- Task A -------------||-- Task E --|
     *  |-- Task B --||-- Task D --|
     *   |- Task C -|
     */
    const data = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 1, 3),   // 1..4
      makeCompleteEvent('D', 5, 3),   // 5..8
      makeCompleteEvent('C', 2, 1),   // 2..3
      makeCompleteEvent('E', 11, 3),  // 11..14
    ];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
    const tree = TraceModel.Handlers.ModelHandlers.Renderer.treify(data, {filter: {has: () => true}});

    assert.strictEqual(tree.maxDepth, 3, 'Got the correct tree max depth');

    const rootsEvents = [...tree.roots].map(id => tree.nodes.get(id)).map(n => n ? n.entry : null);
    assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'A', 'ts': 0, 'dur': 10},
      {'name': 'E', 'ts': 11, 'dur': 3},
    ]);

    const nodeA = tree.nodes.get([...tree.roots][0]);
    const nodeE = tree.nodes.get([...tree.roots][1]);
    if (!nodeA || !nodeE) {
      assert(false, 'Root nodes were not found');
      return;
    }

    const childrenOfA = getEventsIn(nodeA.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'B', 'ts': 1, 'dur': 3},
      {'name': 'D', 'ts': 5, 'dur': 3},
    ]);

    const childrenOfE = getEventsIn(nodeE.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfE, []);

    const nodeB = tree.nodes.get([...nodeA.childrenIds][0]);
    const nodeD = tree.nodes.get([...nodeA.childrenIds][1]);
    if (!nodeB || !nodeD) {
      assert(false, 'Child nodes were not found');
      return;
    }

    const childrenOfB = getEventsIn(nodeB.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfB.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'C', 'ts': 2, 'dur': 1},
    ]);

    const childrenOfD = getEventsIn(nodeD.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfD, []);

    const nodeC = tree.nodes.get([...nodeB.childrenIds][0]);
    if (!nodeC) {
      assert(false, 'Child nodes were not found');
      return;
    }

    const childrenOfC = getEventsIn(nodeC.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfC, []);
  });

  it('can build a hierarchy of events with filters', async () => {
    /**
     * |------------- Task A -------------||-- ?????? --|
     *  |-- ?????? --||-- Task D --|
     *   |- ?????? -|
     */
    const data = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 1, 3),   // 1..4
      makeCompleteEvent('D', 5, 3),   // 5..8
      makeCompleteEvent('C', 2, 1),   // 2..3
      makeCompleteEvent('E', 11, 3),  // 11..14
    ];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
    const filter = new Set(['A', 'D']);
    const tree = TraceModel.Handlers.ModelHandlers.Renderer.treify(data, {filter});

    assert.strictEqual(tree.maxDepth, 2, 'Got the correct tree max depth');

    const rootsEvents = [...tree.roots].map(id => tree.nodes.get(id)).map(n => n ? n.entry : null);
    assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'A', 'ts': 0, 'dur': 10},
    ]);

    const nodeA = tree.nodes.get([...tree.roots][0]);
    if (!nodeA) {
      assert(false, 'Root nodes were not found');
      return;
    }

    const childrenOfA = getEventsIn(nodeA.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'D', 'ts': 5, 'dur': 3},
    ]);

    const nodeD = tree.nodes.get([...nodeA.childrenIds][0]);
    if (!nodeD) {
      assert(false, 'Child nodes were not found');
      return;
    }

    const childrenOfD = getEventsIn(nodeD.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfD, []);
  });

  it('can build a hierarchy of events that start and end close to each other', async () => {
    /**
     * |------------- Task A -------------||-- Task E --|
     * |-- Task B --||-- Task D --|
     *   |- Task C -|
     */
    const data = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 0, 3),   // 0..3 (starts same time as A)
      makeCompleteEvent('D', 3, 3),   // 3..6 (starts when B finishes)
      makeCompleteEvent('C', 2, 1),   // 2..3 (finishes when B finishes)
      makeCompleteEvent('E', 10, 3),  // 10..13 (starts when A finishes)
    ];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
    const tree = TraceModel.Handlers.ModelHandlers.Renderer.treify(data, {filter: {has: () => true}});

    assert.strictEqual(tree.maxDepth, 3, 'Got the correct tree max depth');

    const rootsEvents = [...tree.roots].map(id => tree.nodes.get(id)).map(n => n ? n.entry : null);
    assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'A', 'ts': 0, 'dur': 10},
      {'name': 'E', 'ts': 10, 'dur': 3},
    ]);

    const nodeA = tree.nodes.get([...tree.roots][0]);
    const nodeE = tree.nodes.get([...tree.roots][1]);
    if (!nodeA || !nodeE) {
      assert(false, 'Root nodes were not found');
      return;
    }

    const childrenOfA = getEventsIn(nodeA.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'B', 'ts': 0, 'dur': 3},
      {'name': 'D', 'ts': 3, 'dur': 3},
    ]);

    const childrenOfE = getEventsIn(nodeE.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfE, []);

    const nodeB = tree.nodes.get([...nodeA.childrenIds][0]);
    const nodeD = tree.nodes.get([...nodeA.childrenIds][1]);
    if (!nodeB || !nodeD) {
      assert(false, 'Child nodes were not found');
      return;
    }

    const childrenOfB = getEventsIn(nodeB.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfB.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'C', 'ts': 2, 'dur': 1},
    ]);

    const childrenOfD = getEventsIn(nodeD.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfD, []);

    const nodeC = tree.nodes.get([...nodeB.childrenIds][0]);
    if (!nodeC) {
      assert(false, 'Child nodes were not found');
      return;
    }

    const childrenOfC = getEventsIn(nodeC.childrenIds.values(), tree.nodes);
    assert.deepEqual(childrenOfC, []);
  });

  it('correctly calculates the total and self times of a hierarchy of events', async () => {
    /**
     * |------------- Task A -------------||-- Task E --|
     * |-- Task B --||-- Task D --|
     *   |- Task C -|
     */
    const data = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 0, 3),   // 0..3 (starts same time as A)
      makeCompleteEvent('D', 3, 3),   // 3..6 (starts when B finishes)
      makeCompleteEvent('C', 2, 1),   // 2..3 (finishes when B finishes)
      makeCompleteEvent('E', 10, 3),  // 10..13 (starts when A finishes)
    ] as TraceModel.Handlers.ModelHandlers.Renderer.RendererEntry[];

    TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
    const tree = TraceModel.Handlers.ModelHandlers.Renderer.treify(data, {filter: {has: () => true}});

    const nodeA = tree.nodes.get([...tree.roots][0]);
    const nodeE = tree.nodes.get([...tree.roots][1]);
    if (!nodeA || !nodeE) {
      assert(false, 'Root nodes were not found');
      return;
    }
    const taskA = nodeA.entry;
    const taskE = nodeE.entry;
    const nodeD = tree.nodes.get([...nodeA.childrenIds][1]);
    const nodeB = tree.nodes.get([...nodeA.childrenIds][0]);
    if (!nodeB || !nodeD) {
      assert(false, 'Child nodes were not found');
      return;
    }
    const taskD = nodeD.entry;
    const taskB = nodeB.entry;

    const nodeC = tree.nodes.get([...nodeB.childrenIds][0]);

    if (!nodeC) {
      assert(false, 'Child nodes were not found');
      return;
    }
    const taskC = nodeC.entry;

    const taskCTotalTime = taskC.dur;
    if (taskCTotalTime === undefined) {
      assert.fail('Total time for task was not found');
      return;
    }
    assert.strictEqual(taskCTotalTime, TraceModel.Types.Timing.MicroSeconds(1));
    assert.strictEqual(taskC.selfTime, taskCTotalTime);

    const taskBTotalTime = taskB.dur;
    if (taskBTotalTime === undefined) {
      assert.fail('Total time for task was not found');
      return;
    }
    assert.strictEqual(taskBTotalTime, TraceModel.Types.Timing.MicroSeconds(3));
    assert.strictEqual(taskB.selfTime, TraceModel.Types.Timing.MicroSeconds(taskBTotalTime - taskCTotalTime));

    const taskDTotalTime = taskD.dur;
    if (taskDTotalTime === undefined) {
      assert.fail('Total time for task was not found');
      return;
    }
    assert.strictEqual(taskDTotalTime, TraceModel.Types.Timing.MicroSeconds(3));
    assert.strictEqual(taskD.selfTime, taskDTotalTime);

    const taskATotalTime = taskA.dur;
    if (taskATotalTime === undefined) {
      assert.fail('Total time for task was not found');
      return;
    }
    assert.strictEqual(taskATotalTime, TraceModel.Types.Timing.MicroSeconds(10));
    assert.strictEqual(
        taskA.selfTime, TraceModel.Types.Timing.MicroSeconds(taskATotalTime - taskBTotalTime - taskDTotalTime));

    const taskETotalTime = taskE.dur;
    if (taskETotalTime === undefined) {
      assert.fail('Total time for task was not found');
      return;
    }
    assert.strictEqual(taskETotalTime, TraceModel.Types.Timing.MicroSeconds(3));
    assert.strictEqual(taskD.selfTime, taskETotalTime);
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

    TraceModel.Handlers.ModelHandlers.Renderer.buildHierarchy(processes, {filter: {has: () => true}});

    const firstThread = [...[...processes.values()][0].threads.values()][0];
    const secondThread = [...[...processes.values()][1].threads.values()][0];

    if (!firstThread.tree || !secondThread.tree) {
      assert(false, 'Trees not found');
      return;
    }

    assert.strictEqual(firstThread.tree.maxDepth, 3, 'Got the correct tree max depth for the first thread');
    assert.strictEqual(secondThread.tree.maxDepth, 3, 'Got the correct tree max depth for the second thread');

    const firstRoots = getEventsIn(firstThread.tree.roots.values(), firstThread.tree.nodes);
    assert.deepEqual(firstRoots.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
      {'name': 'A', 'ts': 0, 'dur': 10},
      {'name': 'E', 'ts': 11, 'dur': 3},
    ]);

    const secondRoots = getEventsIn(secondThread.tree.roots.values(), secondThread.tree.nodes);
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

    TraceModel.Handlers.ModelHandlers.Renderer.assignOrigin(
        processes, metadata.mainFrameId, metadata.rendererProcessesByFrame);

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
    assert.strictEqual(renderers.traceEventToNode.size, 2578);
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
      assert.strictEqual(prettyPrint(thread, thread.tree.roots), `
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
      assert.strictEqual(prettyPrint(thread, thread.tree.roots), `
-RunTask [0.01ms]
  -RunMicrotasks [0.003ms]
    -FunctionCall [0.001ms]
  -Layout [0.003ms]`);
    });
  });
});
