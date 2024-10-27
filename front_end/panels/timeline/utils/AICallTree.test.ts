// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
});
