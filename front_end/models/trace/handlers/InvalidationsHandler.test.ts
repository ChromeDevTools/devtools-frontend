// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceEngine from '../trace.js';
import type * as Protocol from '../../../generated/protocol.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

function invalidationDataForTestAssertion(invalidation: TraceEngine.Types.TraceEvents.SyntheticInvalidation): {
  nodeId: Protocol.DOM.BackendNodeId,
  nodeName?: string,
  reason?: string,
  stackTrace?: TraceEngine.Types.TraceEvents.TraceEventCallFrame[],
} {
  return {
    nodeId: invalidation.nodeId,
    nodeName: invalidation.nodeName,
    reason: invalidation.reason,
    stackTrace: invalidation.stackTrace,
  };
}

describe('InvalidationsHandler', () => {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.Invalidations.reset();
    TraceEngine.Handlers.ModelHandlers.Invalidations.initialize();
  });

  it('finds the right invalidators for a layout where attributes have been changed', async function() {
    const events = await TraceLoader.rawEvents(this, 'style-invalidation-change-attribute.json.gz');

    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.Invalidations.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.Invalidations.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.Invalidations.data();
    // Find the Layout event that we want to test - we are testing
    // the layout that happens after button click that happened in
    // the trace.
    const updateLayoutTreeEvent = events.find(event => {
      return TraceEngine.Types.TraceEvents.isTraceEventUpdateLayoutTree(event) &&
          event.args.beginData?.stackTrace?.[0].functionName === 'testFuncs.changeAttributeAndDisplay';
    });
    if (!updateLayoutTreeEvent) {
      throw new Error('Could not find UpdateLayoutTree event.');
    }

    const invalidations =
        data.invalidationsForEvent.get(updateLayoutTreeEvent)?.map(invalidationDataForTestAssertion) ?? [];

    assert.deepEqual(invalidations, [
      {
        nodeId: 107 as Protocol.DOM.BackendNodeId,
        nodeName: 'BUTTON id=\'changeAttributeAndDisplay\'',
        reason: 'PseudoClass',
        stackTrace: undefined,
      },
      {
        nodeId: 110 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFour\'',
        reason: undefined,
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 45,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 110 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFour\'',
        reason: 'StyleInvalidator',
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 45,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 110 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFour\'',
        reason: 'Attribute',
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 45,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 111 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFive\'',
        reason: undefined,
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 46,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 111 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFive\'',
        reason: 'StyleInvalidator',
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 46,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 111 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFive\'',
        reason: 'Attribute',
        stackTrace: [
          {
            columnNumber: 46,
            functionName: 'testFuncs.changeAttributeAndDisplay',
            lineNumber: 46,
            scriptId: '86',
            url: 'https://chromedevtools.github.io/performance-stories/style-invalidations/app.js',
          },
        ],
      },
      {
        nodeId: 110 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFour\'',
        reason: 'Element has pending invalidation list',
        stackTrace: undefined,
      },
      {
        nodeId: 111 as Protocol.DOM.BackendNodeId,
        nodeName: 'DIV id=\'testElementFive\'',
        reason: 'Element has pending invalidation list',
        stackTrace: undefined,
      },
    ]);
  });
});
