// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import {
  describeWithMockConnection,
} from '../../../testing/MockConnection.js';
import {getBaseTraceParseModelData} from '../../../testing/TraceHelpers.js';
import * as Trace from '../trace.js';

import * as RootCauses from './RootCauses.js';

type ParsedTrace = Trace.Handlers.Types.ParsedTrace;
type ParsedTraceMutable = Trace.Handlers.Types.ParsedTraceMutable;

function assertArrayHasNoNulls<T>(inputArray: Array<T|null>): asserts inputArray is T[] {
  inputArray.forEach((item, index) => {
    if (item === null) {
      assert.fail(`Found null at array index ${index}`);
    }
  });
}

function createMockStyle(cssProperties: {name: string, value: string}[]): Protocol.CSS.CSSStyle {
  return {cssProperties, shorthandEntries: []};
}

function createMockMatchedRules(cssProperties: {name: string, value: string}[]): Protocol.CSS.RuleMatch[] {
  return [{
    rule: {
      style: createMockStyle(cssProperties),
      selectorList: {selectors: [], text: ''},
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
    },
    matchingSelectors: [],
  }];
}

describeWithMockConnection('LayoutShift root causes', () => {
  /*
     * This test has to do a lot of mocking and creating of fake data in order
     * to function. Normally in the perfomance panel tests we prefer to parse a
     * real trace and use that, but in this case because LayoutShift root causes
     * rely on having an actual DevTools instance open with access to the DOM,
     * we can't do that. So therefore we completely mock the set of data
     * required.
     */
  describe('assigns root causes to layout shifts', () => {
    let layoutShifts: RootCauses.LayoutShiftRootCauses;
    let prePaintEvents: Trace.Types.Events.PrePaint[];
    let resizeEvents: Trace.Types.Events.LayoutInvalidationTracking[];
    let injectedIframeEvents: Trace.Types.Events.LayoutInvalidationTracking[];
    let fontChanges: Trace.Types.Events.LayoutInvalidationTracking[];
    let unknownLayoutInvalidation: Trace.Types.Events.LayoutInvalidationTracking[];
    let domNodeByBackendIdMap: Map<Protocol.DOM.BackendNodeId, Protocol.DOM.Node|null>;
    let model: ParsedTrace;
    let modelMut: ParsedTraceMutable;
    let resizeEventsNodeIds: number[];
    let iframesNodeIds: number[];
    let shifts: Trace.Types.Events.SyntheticLayoutShift[];
    let matchedStylesMock: Omit<Protocol.CSS.GetMatchedStylesForNodeResponse, 'getError'>;
    let protocolInterface: RootCauses.RootCauseProtocolInterface;
    let computedStylesMock: Protocol.CSS.CSSComputedStyleProperty[];
    let fontFaceMock: Protocol.CSS.FontFace;
    const fontSource = 'mock-source.woff';
    const renderBlockSource = 'mock-source.css';

    beforeEach(() => {
      fontFaceMock = {fontFamily: 'Roboto', src: fontSource, fontDisplay: 'swap'} as Protocol.CSS.FontFace;

      // Layout shifts for which we want to extract potential root causes.
      shifts =
          [{ts: 10}, {ts: 30}, {ts: 50}, {ts: 70}, {ts: 90}] as unknown as Trace.Types.Events.SyntheticLayoutShift[];

      // Initialize the shifts.
      for (const shift of shifts) {
        shift.args = {
          frame: 'frame-id-123',
        };
        shift.name = 'LayoutShift';
      }

      const clusters = [{events: shifts}] as unknown as Trace.Types.Events.SyntheticLayoutShiftCluster[];

      // PrePaint events to which each layout shift belongs.
      prePaintEvents =
          [{ts: 5, dur: 30}, {ts: 45, dur: 30}, {ts: 85, dur: 10}] as unknown as Trace.Types.Events.PrePaint[];

      resizeEvents =
          [{ts: 0}, {ts: 25}, {ts: 80}, {ts: 100}] as unknown as Trace.Types.Events.LayoutInvalidationTracking[];

      injectedIframeEvents = [{ts: 2}, {ts: 81}] as unknown as Trace.Types.Events.LayoutInvalidationTracking[];

      fontChanges = [{ts: 3}, {ts: 35}] as unknown as Trace.Types.Events.LayoutInvalidationTracking[];

      unknownLayoutInvalidation = [{ts: 4}, {ts: 36}] as unknown as Trace.Types.Events.LayoutInvalidationTracking[];

      // |Resize|---|Iframe|---|Fonts-|---|--PrePaint 1--|----|Resize|---|Fonts-|-|---PrePaint 2---|---|Resize|---|Iframe|---|PrePaint 3|
      // ----------------------------------|LS 1|-|LS 2|----------------------------|LS 3|-|LS 4|-----------------------------|LS 5|

      // Initialize the LI events by adding a nodeId and setting a reason so that they
      // aren't filtered out.
      for (let i = 0; i < resizeEvents.length; i++) {
        resizeEvents[i].args = {
          data: {
            nodeId: i + 1 as Protocol.DOM.BackendNodeId,
            reason: Trace.Types.Events.LayoutInvalidationReason.SIZE_CHANGED,
            nodeName: 'IMG',
            frame: 'frame-id-123',
          },
        };
      }
      for (let i = 0; i < injectedIframeEvents.length; i++) {
        injectedIframeEvents[i].args = {
          data: {
            nodeId: i + 11 as Protocol.DOM.BackendNodeId,
            reason: Trace.Types.Events.LayoutInvalidationReason.ADDED_TO_LAYOUT,
            nodeName: 'IFRAME',
            frame: 'frame-id-123',
          },
        };
      }
      for (let i = 0; i < fontChanges.length; i++) {
        fontChanges[i].args = {
          data: {
            nodeId: i + 21 as Protocol.DOM.BackendNodeId,
            reason: Trace.Types.Events.LayoutInvalidationReason.FONTS_CHANGED,
            nodeName: 'DIV',
            frame: 'frame-id-123',
          },
        };
      }
      for (let i = 0; i < unknownLayoutInvalidation.length; i++) {
        unknownLayoutInvalidation[i].args = {
          data: {
            nodeId: i + 31 as Protocol.DOM.BackendNodeId,
            reason: Trace.Types.Events.LayoutInvalidationReason.UNKNOWN,
            nodeName: 'DIV',
            frame: 'frame-id-123',
          },
        };
      }
      const layoutInvalidationEvents = [
        ...resizeEvents,
        ...injectedIframeEvents,
        ...fontChanges,
        ...unknownLayoutInvalidation,
      ].sort((a, b) => a.ts - b.ts);

      for (const e of layoutInvalidationEvents) {
        e.name = Trace.Types.Events.Name.LAYOUT_INVALIDATION_TRACKING;
      }

      // Map from fake BackendNodeId to fake Protocol.DOM.Node used by the handler to
      // resolve the nodeIds in the traces.
      const domNodeByBackendIdMapEntries: [Protocol.DOM.BackendNodeId, Protocol.DOM.Node|null][] = [];
      const domNodeByIdMap = new Map<Protocol.DOM.NodeId, Protocol.DOM.Node>();
      for (let i = 0 as Protocol.DOM.BackendNodeId; i < layoutInvalidationEvents.length; i++) {
        const backendNodeId = layoutInvalidationEvents[i].args.data.nodeId;
        const nodeId = i as unknown as Protocol.DOM.NodeId;
        const nodeName = layoutInvalidationEvents[i].args.data.nodeName || 'DIV';
        const fakeNode = {
          backendNodeId,
          nodeId,
          localName: nodeName.toLowerCase(),
          nodeName,
          attributes: [],
          nodeType: Node.ELEMENT_NODE,
        } as unknown as Protocol.DOM.Node;

        domNodeByBackendIdMapEntries.push([backendNodeId, fakeNode]);
        domNodeByIdMap.set(nodeId, fakeNode);
      }

      domNodeByBackendIdMap =
          new Map(domNodeByBackendIdMapEntries) as unknown as Map<Protocol.DOM.BackendNodeId, Protocol.DOM.Node|null>;

      model = getBaseTraceParseModelData();
      modelMut = model as unknown as ParsedTraceMutable;
      // Now fake out the relevant LayoutShift data
      modelMut.LayoutShifts.prePaintEvents = prePaintEvents;
      modelMut.LayoutShifts.layoutInvalidationEvents = layoutInvalidationEvents;
      modelMut.LayoutShifts.backendNodeIds = [...domNodeByBackendIdMap.keys()] as Protocol.DOM.BackendNodeId[];
      modelMut.LayoutShifts.clusters = clusters;
      modelMut.LayoutShifts.scheduleStyleInvalidationEvents = [];
      modelMut.Initiators = {
        eventToInitiator: new Map(),
        initiatorToEvents: new Map(),
      };

      resizeEventsNodeIds = resizeEvents.map(li => Number(li.args.data.nodeId));
      iframesNodeIds = injectedIframeEvents.map(li => Number(li.args.data.nodeId));

      computedStylesMock = [];
      matchedStylesMock = {};

      protocolInterface = {
        getInitiatorForRequest(_: string): Protocol.Network.Initiator |
            null {
              return null;
            },
        async pushNodesByBackendIdsToFrontend(backendNodeIds: Protocol.DOM.BackendNodeId[]):
            Promise<Protocol.DOM.NodeId[]> {
              return backendNodeIds.map(id => {
                const node = domNodeByBackendIdMap.get(id);
                if (!node) {
                  throw new Error('unexpected backend id');
                }
                return node.nodeId;
              });
            },
        async getNode(nodeId: Protocol.DOM.NodeId): Promise<Protocol.DOM.Node> {
          const node = domNodeByIdMap.get(nodeId);
          if (!node) {
            throw new Error('unexpected id');
          }
          return node;
        },
        async getComputedStyleForNode(_: Protocol.DOM.NodeId): Promise<Protocol.CSS.CSSComputedStyleProperty[]> {
          return computedStylesMock;
        },
        async getMatchedStylesForNode(_: Protocol.DOM.NodeId): Promise<Protocol.CSS.GetMatchedStylesForNodeResponse> {
          return {
            ...matchedStylesMock,
            getError: () => undefined,
          };
        },
        fontFaceForSource(url: string): Protocol.CSS.FontFace |
            undefined {
              if (url === fontFaceMock.src) {
                return fontFaceMock;
              }
              return;
            },
      };

      layoutShifts = new RootCauses.LayoutShiftRootCauses(protocolInterface, {enableIframeRootCauses: true});
    });

    it('uses cached node details', async () => {
      // Use duplicate node ids for invalidation events that use `getNode`
      resizeEvents.forEach(e => {
        e.args.data.nodeId = 1 as Protocol.DOM.BackendNodeId;
      });
      injectedIframeEvents.forEach(e => {
        e.args.data.nodeId = 11 as Protocol.DOM.BackendNodeId;
      });

      const getNodeSpy = sinon.spy(protocolInterface, 'getNode');

      const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
      assertArrayHasNoNulls(rootCauses);

      assert.strictEqual(getNodeSpy.callCount, 2);
    });

    describe('Unsized media', () => {
      it('marks unsized media node in LayoutInvalidation events as a potential root cause to layout shifts correctly',
         async () => {
           const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
           assertArrayHasNoNulls(rootCauses);

           const shiftCausesNodeIds = rootCauses.map(cause => {
             return cause.unsizedMedia.map(media => Number(media.node.backendNodeId));
           });

           // Test the nodes from the LI events are assinged as the potential root causes to layout shifts correctly.
           assert.strictEqual(shiftCausesNodeIds[0].length, 1);
           assert.strictEqual(shiftCausesNodeIds[0][0], resizeEventsNodeIds[0]);

           assert.strictEqual(shiftCausesNodeIds[1].length, 1);
           assert.strictEqual(shiftCausesNodeIds[1][0], resizeEventsNodeIds[0]);

           assert.strictEqual(shiftCausesNodeIds[2].length, 1);
           assert.strictEqual(shiftCausesNodeIds[2][0], resizeEventsNodeIds[1]);

           assert.strictEqual(shiftCausesNodeIds[3].length, 1);
           assert.strictEqual(shiftCausesNodeIds[3][0], resizeEventsNodeIds[1]);

           assert.strictEqual(shiftCausesNodeIds[4].length, 1);
           assert.strictEqual(shiftCausesNodeIds[4][0], resizeEventsNodeIds[2]);
         });

      it('sets partially sized media\'s authored dimensions properly, using inline styles.', async () => {
        // Set height using inline and matched CSS styles.
        matchedStylesMock = {
          attributesStyle: createMockStyle([]),
          inlineStyle: createMockStyle([{name: 'height', value: '20px'}]),
          matchedCSSRules: createMockMatchedRules([{name: 'height', value: '10px'}]),
        };
        const rootCause = await layoutShifts.rootCausesForEvent(model, shifts[0]);

        const authoredDimensions = rootCause?.unsizedMedia[0].authoredDimensions;
        if (!authoredDimensions) {
          assert.fail('Expected defined authored dimensions');
          return;
        }
        // Assert inline styles are preferred.
        assert.strictEqual(authoredDimensions.height, '20px');
        assert.isUndefined(authoredDimensions.width);
        assert.isUndefined(authoredDimensions.aspectRatio);
      });

      it('sets partially sized media\'s authored dimensions properly, using matched CSS rules.', async () => {
        // Set height using matched CSS rules.
        matchedStylesMock = {
          attributesStyle: createMockStyle([{name: 'height', value: '10px'}]),
          inlineStyle: createMockStyle([]),
          matchedCSSRules: createMockMatchedRules([{name: 'height', value: '30px'}]),
        };

        const rootCause = await layoutShifts.rootCausesForEvent(model, shifts[1]);
        const authoredDimensions = rootCause?.unsizedMedia[0].authoredDimensions;
        if (!authoredDimensions) {
          assert.fail('Expected defined authored dimensions');
          return;
        }
        // Assert matched CSS rules styles are preferred.
        assert.strictEqual(authoredDimensions.height, '30px');
      });

      it('sets partially unsized media\'s computed dimensions properly.', async () => {
        const height = '10px';
        const width = '20px';
        computedStylesMock = [
          {name: 'height', value: height},
          {name: 'width', value: width},
        ];

        const rootCause = await layoutShifts.rootCausesForEvent(model, shifts[1]);
        const computedDimensions = rootCause?.unsizedMedia[0].computedDimensions;
        if (!computedDimensions) {
          assert.fail('Expected defined computed dimensions');
          return;
        }
        // Assert correct computed styles are set.
        assert.strictEqual(computedDimensions.height, height);
        assert.strictEqual(computedDimensions.width, width);
      });

      async function assertAmountOfBlamedLayoutInvalidations(amount: number) {
        const allShiftsRootCauses =
            await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));

        const nodesFromLayoutInvalidations = new Set<number>();
        for (const currentShiftRootCauses of allShiftsRootCauses) {
          if (currentShiftRootCauses === null) {
            continue;
          }
          for (const media of currentShiftRootCauses.unsizedMedia) {
            nodesFromLayoutInvalidations.add(media.node.backendNodeId);
          }
        }

        assert.strictEqual(nodesFromLayoutInvalidations.size, amount);
      }
      it('ignores media with inline height and width', async () => {
        matchedStylesMock = {
          attributesStyle: createMockStyle([{name: 'height', value: '10px'}, {name: 'width', value: '10px'}]),
          inlineStyle: createMockStyle([]),
          matchedCSSRules: createMockMatchedRules([]),
        };
        await assertAmountOfBlamedLayoutInvalidations(0);
      });
      it('ignores media with CSS height and width', async () => {
        matchedStylesMock = {
          attributesStyle: createMockStyle([]),
          inlineStyle: createMockStyle([]),
          matchedCSSRules: createMockMatchedRules([{name: 'height', value: '10px'}, {name: 'width', value: '10px'}]),
        };
        await assertAmountOfBlamedLayoutInvalidations(0);
      });
      it('ignores media with height and aspect ratio', async () => {
        matchedStylesMock = {
          attributesStyle: createMockStyle([{name: 'height', value: '10px'}, {name: 'aspect-ratio', value: '1'}]),
          inlineStyle: createMockStyle([]),
          matchedCSSRules: createMockMatchedRules([]),
        };
        await assertAmountOfBlamedLayoutInvalidations(0);
      });

      it('ignores media with explicit height and width', async () => {
        matchedStylesMock = {
          attributesStyle: createMockStyle([{name: 'height', value: '10px'}]),
          inlineStyle: createMockStyle([{name: 'width', value: '10px'}]),
          matchedCSSRules: createMockMatchedRules([]),
        };
        await assertAmountOfBlamedLayoutInvalidations(0);
      });

      it('ignores media with fixed position as potential root causes of layout shifts', async () => {
        computedStylesMock = [{name: 'position', value: 'fixed'}];
        await assertAmountOfBlamedLayoutInvalidations(0);
      });

      it('does not ignore media with only height or width explicitly set as potential root causes of layout shifts',
         async () => {
           matchedStylesMock = {
             attributesStyle: createMockStyle([{name: 'height', value: '10px'}]),
             inlineStyle: createMockStyle([]),
             matchedCSSRules: createMockMatchedRules([]),
           };
           await assertAmountOfBlamedLayoutInvalidations(3);
         });

      it('does not error when there are no layout shifts', async () => {
        // Layout shifts for which we want to associate LayoutInvalidation events as potential root causes.
        shifts =
            [{ts: 10}, {ts: 30}, {ts: 50}, {ts: 70}, {ts: 90}] as unknown as Trace.Types.Events.SyntheticLayoutShift[];

        // Initialize the shifts.
        for (const shift of shifts) {
          shift.args = {
            frame: 'frame-id-123',
          };
          shift.name = 'LayoutShift';
        }

        const clusters = [{events: shifts}] as unknown as Trace.Types.Events.SyntheticLayoutShiftCluster[];
        modelMut.LayoutShifts.clusters = clusters;

        assert.doesNotThrow(async () => {
          await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
        });
      });
    });

    describe('Injected iframes', () => {
      it('marks injected iframes in LayoutInvalidation events as a potential root cause to layout shifts correctly',
         async () => {
           const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
           assertArrayHasNoNulls(rootCauses);
           const shiftCausesNodeIds = rootCauses.map(cause => {
             return cause.iframes.map(node => Number(node.iframe.backendNodeId));
           });

           // Test the nodes from the LI events are assinged as the potential root causes to layout shifts correctly.
           assert.strictEqual(shiftCausesNodeIds[0].length, 1);
           assert.strictEqual(shiftCausesNodeIds[0][0], iframesNodeIds[0]);

           assert.strictEqual(shiftCausesNodeIds[4].length, 1);
           assert.strictEqual(shiftCausesNodeIds[4][0], iframesNodeIds[1]);
         });

      it('ignores injected iframes if disabled', async () => {
        layoutShifts = new RootCauses.LayoutShiftRootCauses(protocolInterface, {enableIframeRootCauses: false});
        const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
        assertArrayHasNoNulls(rootCauses);
        assert(rootCauses.every(cause => cause.iframes.length === 0), 'contained iframe root causes');
      });

      it('ignores events that could not add or resize an iframe', async () => {
        injectedIframeEvents.forEach(e => {
          e.args.data.nodeName = 'DIV';
          e.args.data.reason = Trace.Types.Events.LayoutInvalidationReason.SIZE_CHANGED;
        });

        const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
        assertArrayHasNoNulls(rootCauses);
        assert(rootCauses.every(cause => cause.iframes.length === 0), 'contained iframe root causes');
      });
    });

    describe('Font changes', () => {
      // Mock two font network request that finished right before the mocked layout invalidation events
      // that correspond to font changes.
      const fontRequests = [
        {
          dur: Trace.Types.Timing.MicroSeconds(2),
          ts: Trace.Types.Timing.MicroSeconds(0),
          args: {
            data: {
              url: fontSource,
              mimeType: 'font/woff2',
            },
          },
        },
        {
          dur: Trace.Types.Timing.MicroSeconds(30),
          ts: Trace.Types.Timing.MicroSeconds(0),
          args: {
            data: {
              url: fontSource,
              mimeType: 'font/woff2',
            },
          },
        },
      ] as unknown as Trace.Types.Events.SyntheticNetworkRequest[];

      it('marks fonts changes in LayoutInvalidation events as a potential root cause to layout shifts correctly',
         async () => {
           modelMut.NetworkRequests.byTime = fontRequests;

           const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
           assertArrayHasNoNulls(rootCauses);
           const shiftCausesNodeIds = rootCauses.map(cause => {
             return cause.fontChanges;
           });

           // Test the font requests are marked as potential layout shift root causes
           // in the correct order.
           assert.deepEqual(shiftCausesNodeIds[0][0]?.request, fontRequests[0]);
           assert.deepEqual(shiftCausesNodeIds[1][0]?.request, fontRequests[0]);
           assert.deepEqual(shiftCausesNodeIds[2][0]?.request, fontRequests[1]);
           assert.deepEqual(shiftCausesNodeIds[3][0]?.request, fontRequests[1]);
           assert.deepEqual(shiftCausesNodeIds[2][1]?.request, fontRequests[0]);
           assert.deepEqual(shiftCausesNodeIds[3][1]?.request, fontRequests[0]);
         });

      it('ignores requests for fonts whose font-display property is "optional"', async () => {
        const optionalFontRequests = [{
                                       dur: Trace.Types.Timing.MicroSeconds(2),
                                       ts: Trace.Types.Timing.MicroSeconds(0),
                                       args: {
                                         data: {
                                           url: fontSource,
                                           mimeType: 'font/woff2',
                                         },
                                       },
                                     }] as unknown as Trace.Types.Events.SyntheticNetworkRequest[];
        modelMut.NetworkRequests.byTime = optionalFontRequests;
        fontFaceMock = {fontFamily: 'Roboto', src: fontSource, fontDisplay: 'optional'} as Protocol.CSS.FontFace;
        const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
        assertArrayHasNoNulls(rootCauses);
        const shiftCausesNodeIds = rootCauses.map(cause => {
          return cause.fontChanges;
        });

        // Test no font request is marked as potential layout shift root causes
        assert.strictEqual(shiftCausesNodeIds[0].length, 0);
        assert.strictEqual(shiftCausesNodeIds[1].length, 0);
        assert.strictEqual(shiftCausesNodeIds[2].length, 0);
        assert.strictEqual(shiftCausesNodeIds[3].length, 0);
      });
      it('ignores requests for fonts that lie outside the fixed time window from ending at the "font change" layout invalidation event',
         async () => {
           const optionalFontRequests = [{
                                          dur: Trace.Types.Timing.MicroSeconds(2),
                                          ts: Trace.Types.Timing.MicroSeconds(85),
                                          args: {
                                            data: {
                                              url: fontSource,
                                              mimeType: 'font/woff2',
                                            },
                                          },
                                        }] as unknown as Trace.Types.Events.SyntheticNetworkRequest[];
           modelMut.NetworkRequests.byTime = optionalFontRequests;
           fontFaceMock = {fontFamily: 'Roboto', src: fontSource, fontDisplay: 'swap'} as Protocol.CSS.FontFace;
           const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
           assertArrayHasNoNulls(rootCauses);
           const shiftCausesNodeIds = rootCauses.map(cause => {
             return cause.fontChanges;
           });

           // Test no font request is marked as potential layout shift root causes
           assert.strictEqual(shiftCausesNodeIds[0].length, 0);
           assert.strictEqual(shiftCausesNodeIds[1].length, 0);
           assert.strictEqual(shiftCausesNodeIds[2].length, 0);
           assert.strictEqual(shiftCausesNodeIds[3].length, 0);
         });
    });

    describe('Render blocking request', () => {
      const RenderBlockingRequest = [
        {
          dur: Trace.Types.Timing.MicroSeconds(2),
          ts: Trace.Types.Timing.MicroSeconds(0),
          args: {
            data: {
              url: renderBlockSource,
              mimeType: 'text/plain',
              renderBlocking: 'blocking',
            },
          },
        },
        {
          dur: Trace.Types.Timing.MicroSeconds(30),
          ts: Trace.Types.Timing.MicroSeconds(0),
          args: {
            data: {
              url: renderBlockSource,
              mimeType: 'text/css',
              renderBlocking: 'non_blocking',
            },
          },
        },
      ] as Trace.Types.Events.SyntheticNetworkRequest[];

      it('marks render blocks in LayoutInvalidation events as a potential root cause to layout shifts correctly',
         async () => {
           modelMut.NetworkRequests.byTime = RenderBlockingRequest;

           const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
           assertArrayHasNoNulls(rootCauses);
           const shiftCausesNodeIds = rootCauses.map(cause => {
             return cause.renderBlockingRequests;
           });

           // Test the rendering block requests are marked as potential layout shift root causes
           // in the correct order.
           assert.deepEqual(shiftCausesNodeIds[2][0]?.request, RenderBlockingRequest[0]);
           assert.deepEqual(shiftCausesNodeIds[3][0]?.request, RenderBlockingRequest[0]);
           assert.deepEqual(shiftCausesNodeIds[4][0]?.request, RenderBlockingRequest[0]);
         });
    });

    describe('Scripts causing relayout/style recalc', () => {
      it('adds a Layout initiator\'s stack trace to the corresponding layout shift root causes.', async () => {
        const mockStackTrace = [
          {
            scriptId: 0,
            functionName: 'foo',
            columnNumber: 10,
            lineNumber: 1,
            url: 'Main.js',
          },
          {
            scriptId: 2,
            functionName: 'bar',
            columnNumber: 10,
            lineNumber: 20,
            url: 'Main.js',
          },
        ];

        // Mock a Layout event, which corresponds to the last shift.
        // a stack trace.
        modelMut.Renderer.allTraceEntries = [{
          name: 'Layout',
          ts: 82,
        } as unknown as Trace.Types.Events.Event];

        const node = {
          entry: model.Renderer.allTraceEntries[0],
        } as Trace.Helpers.TreeHelpers.TraceEntryNode;
        model.Renderer.entryToNode.set(model.Renderer.allTraceEntries[0], node);
        // Fake out the initiator detection and link the Layout event with a fake InvalidateLayout event.
        model.Initiators.eventToInitiator.set(model.Renderer.allTraceEntries[0], {
          name: 'InvalidateLayout',
          args: {
            data: {
              stackTrace: mockStackTrace,
            },
          },
        } as Trace.Types.Events.Event);

        // Verify the Layout initiator's stack trace is added to the last shift.
        const rootCauses = await Promise.all(shifts.map(shift => layoutShifts.rootCausesForEvent(model, shift)));
        assertArrayHasNoNulls(rootCauses);
        const rootCauseStackTraces = rootCauses.map(cause => {
          return cause.scriptStackTrace;
        });
        const stackTracesForLastShift = rootCauseStackTraces.at(-1);
        if (!stackTracesForLastShift) {
          assert.fail('No stack traces found for layout shift');
          return;
        }
        assert.strictEqual(stackTracesForLastShift, mockStackTrace);
      });
    });
  });
});
