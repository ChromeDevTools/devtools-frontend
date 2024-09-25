// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const SCRIPT_ID_ONE = '1' as Protocol.Runtime.ScriptId;
const SCRIPT_ID_TWO = '2' as Protocol.Runtime.ScriptId;

describeWithMockConnection('DebuggerModel', () => {
  describe('breakpoint activation', () => {
    beforeEach(() => {
      // Dummy handlers for unblocking target suspension.
      setMockConnectionResponseHandler('Debugger.setAsyncCallStackDepth', () => ({}));
      setMockConnectionResponseHandler('Debugger.disable', () => ({}));
      setMockConnectionResponseHandler('DOM.disable', () => ({}));
      setMockConnectionResponseHandler('CSS.disable', () => ({}));
      setMockConnectionResponseHandler('Overlay.disable', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowGridOverlays', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowFlexOverlays', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowScrollSnapOverlays', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowContainerQueryOverlays', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowIsolatedElements', () => ({}));
      setMockConnectionResponseHandler('Overlay.setShowViewportSizeOnResize', () => ({}));
      setMockConnectionResponseHandler('Target.setAutoAttach', () => ({}));

      // Dummy handlers for unblocking target resumption.
      setMockConnectionResponseHandler('Debugger.enable', () => ({}));
      setMockConnectionResponseHandler('Debugger.setPauseOnExceptions', () => ({}));
      setMockConnectionResponseHandler('DOM.enable', () => ({}));
      setMockConnectionResponseHandler('Overlay.enable', () => ({}));
      setMockConnectionResponseHandler('CSS.enable', () => ({}));
    });

    it('deactivates breakpoints on construction with inactive breakpoints', async () => {
      let breakpointsDeactivated = false;
      setMockConnectionResponseHandler('Debugger.setBreakpointsActive', request => {
        if (request.active === false) {
          breakpointsDeactivated = true;
        }
        return {};
      });
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(false);
      createTarget();
      assert.isTrue(breakpointsDeactivated);
    });

    it('deactivates breakpoints for suspended target', async () => {
      let breakpointsDeactivated = false;
      setMockConnectionResponseHandler('Debugger.setBreakpointsActive', request => {
        if (request.active === false) {
          breakpointsDeactivated = true;
        }
        return {};
      });

      const target = createTarget();

      await target.suspend();

      // Deactivate breakpoints while suspended.
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(false);

      // Verify that the backend received the message.
      assert.isTrue(breakpointsDeactivated);

      // Resume and verify that the setBreakpointsActive(false) is called again when the target resumes.
      // This is only needed for older backends (before crbug.com/1357046 is fixed).
      breakpointsDeactivated = false;
      await target.resume();
      assert.isTrue(breakpointsDeactivated);
    });

    it('activates breakpoints for suspended target', async () => {
      let breakpointsDeactivated = false;
      let breakpointsActivated = false;
      setMockConnectionResponseHandler('Debugger.setBreakpointsActive', request => {
        if (request.active) {
          breakpointsActivated = true;
        } else {
          breakpointsDeactivated = true;
        }
        return {};
      });

      // Deactivate breakpoints befroe the target is created.
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(false);
      const target = createTarget();
      assert.isTrue(breakpointsDeactivated);

      await target.suspend();

      // Activate breakpoints while suspended.
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(true);

      // Verify that the backend received the message.
      assert.isTrue(breakpointsActivated);
    });
  });

  describe('createRawLocationFromURL', () => {
    it('yields correct location in the presence of multiple scripts with the same URL', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const url = 'http://localhost/index.html';
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_ONE,
        url,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_TWO,
        url,
        startLine: 20,
        startColumn: 0,
        endLine: 21,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 0)?.scriptId, SCRIPT_ID_ONE);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 20, 1)?.scriptId, SCRIPT_ID_TWO);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 5, 5), null);
    });
  });

  const breakpointId1 = 'fs.js:1' as Protocol.Debugger.BreakpointId;
  const breakpointId2 = 'unsupported' as Protocol.Debugger.BreakpointId;

  describe('setBreakpointByURL', () => {
    it('correctly sets only a single breakpoint in Node.js internal scripts', async () => {
      setMockConnectionResponseHandler('Debugger.setBreakpointByUrl', ({url}) => {
        if (url === 'fs.js') {
          return {
            breakpointId: breakpointId1,
            locations: [],
            getError() {
              return undefined;
            },
          };
        }
        return {
          breakpointId: breakpointId2,
          locations: [],
          getError() {
            return undefined;
          },
        };
      });

      const target = createTarget();
      target.markAsNodeJSForTest();
      const model = new SDK.DebuggerModel.DebuggerModel(target);
      const {breakpointId} = await model.setBreakpointByURL('fs.js' as Platform.DevToolsPath.UrlString, 1);
      assert.strictEqual(breakpointId, breakpointId1);
    });
  });

  describe('scriptsForSourceURL', () => {
    it('returns the latest script at the front of the result for scripts with the same URL', () => {
      const target = createTarget();
      const url = 'http://localhost/index.html';
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_ONE,
        url,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_TWO,
        url,
        startLine: 20,
        startColumn: 0,
        endLine: 21,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const scripts = debuggerModel?.scriptsForSourceURL(url) || [];

      assert.strictEqual(scripts[0].scriptId, SCRIPT_ID_TWO);
      assert.strictEqual(scripts[1].scriptId, SCRIPT_ID_ONE);
    });
  });

  describe('Scope', () => {
    it('Scope.typeName covers every enum value', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;
      const script = new SDK.Script.Script(
          debuggerModel, SCRIPT_ID_ONE, scriptUrl, 0, 0, 0, 0, 0, '', false, false, undefined, false, 0, null, null,
          null, null, null, null);
      const scopeTypes: Protocol.Debugger.ScopeType[] = [
        Protocol.Debugger.ScopeType.Global,
        Protocol.Debugger.ScopeType.Local,
        Protocol.Debugger.ScopeType.With,
        Protocol.Debugger.ScopeType.Closure,
        Protocol.Debugger.ScopeType.Catch,
        Protocol.Debugger.ScopeType.Block,
        Protocol.Debugger.ScopeType.Script,
        Protocol.Debugger.ScopeType.Eval,
        Protocol.Debugger.ScopeType.Module,
        Protocol.Debugger.ScopeType.WasmExpressionStack,
      ];
      for (const scopeType of scopeTypes) {
        const payload: Protocol.Debugger.CallFrame = {
          callFrameId: '0' as Protocol.Debugger.CallFrameId,
          functionName: 'test',
          functionLocation: undefined,
          location: {
            scriptId: SCRIPT_ID_ONE,
            lineNumber: 0,
            columnNumber: 0,
          },
          url: 'test-url',
          scopeChain: [{
            type: scopeType,
            object: {type: 'object'} as Protocol.Runtime.RemoteObject,
          }],
          this: {type: 'object'} as Protocol.Runtime.RemoteObject,
          returnValue: undefined,
          canBeRestarted: false,
        };
        const callFrame = new SDK.DebuggerModel.CallFrame(debuggerModel, script, payload, 0);
        const scope = new SDK.DebuggerModel.Scope(callFrame, 0);
        assert.notEqual('', scope.typeName());
      }
    });
  });

  describe('pause', () => {
    let target: SDK.Target.Target;
    let backend: MockProtocolBackend;
    let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

    beforeEach(() => {
      target = createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME});
      const targetManager = target.targetManager();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
          {forceNew: false, resourceMapping, targetManager});
      backend = new MockProtocolBackend();
      Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: false, debuggerWorkspaceBinding});
    });

    it('with empty call frame list will invoke plain step-into', async () => {
      const stepIntoRequestPromise = new Promise<void>(resolve => {
        setMockConnectionResponseHandler('Debugger.stepInto', () => {
          resolve();
          return {};
        });
      });
      backend.dispatchDebuggerPauseWithNoCallFrames(target, Protocol.Debugger.PausedEventReason.Other);
      await stepIntoRequestPromise;
    });
  });
});

describe('DebuggerModel', () => {
  describe('selectSymbolSource', () => {
    const embeddedDwarfSymbols:
        Protocol.Debugger.DebugSymbols = {type: Protocol.Debugger.DebugSymbolsType.EmbeddedDWARF, externalURL: ''};
    const externalDwarfSymbols:
        Protocol.Debugger.DebugSymbols = {type: Protocol.Debugger.DebugSymbolsType.ExternalDWARF, externalURL: 'abc'};
    const sourceMapSymbols:
        Protocol.Debugger.DebugSymbols = {type: Protocol.Debugger.DebugSymbolsType.SourceMap, externalURL: 'abc'};

    beforeEach(() => {
      Common.Console.Console.instance({forceNew: true});
    });

    function testSelectSymbolSource(
        debugSymbols: Protocol.Debugger.DebugSymbols[]|null, expectedSymbolType: Protocol.Debugger.DebugSymbolsType,
        expectedWarning?: string) {
      const selectedSymbol = SDK.DebuggerModel.DebuggerModel.selectSymbolSource(debugSymbols);
      assert.isNotNull(selectedSymbol);
      assert.strictEqual(selectedSymbol.type, expectedSymbolType);

      const consoleMessages = Common.Console.Console.instance().messages();
      if (!expectedWarning) {
        assert.lengthOf(consoleMessages, 0);
        return;
      }

      assert.lengthOf(consoleMessages, 1);
      assert.deepStrictEqual(consoleMessages[0].text, expectedWarning);
    }

    it('prioritizes external DWARF over all types', () => {
      const debugSymbols = [embeddedDwarfSymbols, externalDwarfSymbols, sourceMapSymbols];
      const expectedSelectedSymbol = Protocol.Debugger.DebugSymbolsType.ExternalDWARF;
      const expectedWarning = 'Multiple debug symbols for script were found. Using ExternalDWARF';
      testSelectSymbolSource(debugSymbols, expectedSelectedSymbol, expectedWarning);
    });

    it('prioritizes embedded DWARF if source maps and embedded DWARF exist', () => {
      const debugSymbols = [embeddedDwarfSymbols, sourceMapSymbols];
      const expectedSymbolType = Protocol.Debugger.DebugSymbolsType.EmbeddedDWARF;
      const expectedWarning = 'Multiple debug symbols for script were found. Using EmbeddedDWARF';
      testSelectSymbolSource(debugSymbols, expectedSymbolType, expectedWarning);
    });

    it('picks source maps if no DWARF is available', () => {
      const debugSymbols = [sourceMapSymbols];
      const expectedSymbolType = Protocol.Debugger.DebugSymbolsType.SourceMap;
      testSelectSymbolSource(debugSymbols, expectedSymbolType);
    });

    it('returns null if nothing is available', () => {
      const selectedSymbol = SDK.DebuggerModel.DebuggerModel.selectSymbolSource([]);
      assert.isNull(selectedSymbol);

      const consoleMessages = Common.Console.Console.instance().messages();
      assert.lengthOf(consoleMessages, 0);
    });
  });

  describe('sortAndMergeRanges', () => {
    function createRange(
        scriptId: Protocol.Runtime.ScriptId, startLine: number, startColumn: number, endLine: number,
        endColumn: number): Protocol.Debugger.LocationRange {
      return {
        scriptId,
        start: {lineNumber: startLine, columnNumber: startColumn},
        end: {lineNumber: endLine, columnNumber: endColumn},
      };
    }

    function sortAndMerge(locationRange: Protocol.Debugger.LocationRange[]) {
      return SDK.DebuggerModel.sortAndMergeRanges(locationRange.concat());
    }

    function assertIsMaximallyMerged(locationRange: Protocol.Debugger.LocationRange[]) {
      for (let i = 1; i < locationRange.length; ++i) {
        const prev = locationRange[i - 1];
        const curr = locationRange[i];
        assert.isTrue(prev.scriptId <= curr.scriptId);
        if (prev.scriptId === curr.scriptId) {
          assert.isTrue(prev.end.lineNumber <= curr.start.lineNumber);
          if (prev.end.lineNumber === curr.start.lineNumber) {
            assert.isTrue(prev.end.columnNumber <= curr.start.columnNumber);
          }
        }
      }
    }

    it('can be reduced if equal', () => {
      const testRange = createRange(SCRIPT_ID_ONE, 0, 3, 3, 3);
      const locationRangesToBeReduced = [
        testRange,
        testRange,
      ];
      const reduced = sortAndMerge(locationRangesToBeReduced);
      assert.deepEqual(reduced, [testRange]);
      assertIsMaximallyMerged(reduced);
    });

    it('can be reduced if overlapping (multiple ranges)', () => {
      const locationRangesToBeReduced = [
        createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
        createRange(SCRIPT_ID_ONE, 0, 3, 3, 3),
        createRange(SCRIPT_ID_ONE, 5, 3, 10, 10),
        createRange(SCRIPT_ID_TWO, 5, 4, 10, 10),
      ];
      const locationRangesExpected = [
        createRange(SCRIPT_ID_ONE, 0, 3, 10, 10),
        locationRangesToBeReduced[3],
      ];
      const reduced = sortAndMerge(locationRangesToBeReduced);
      assert.deepEqual(reduced, locationRangesExpected);
      assertIsMaximallyMerged(reduced);
    });

    it('can be reduced if overlapping (same start, different end)', () => {
      const locationRangesToBeReduced = [
        createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
        createRange(SCRIPT_ID_ONE, 0, 5, 3, 3),
      ];
      const locationRangesExpected = [
        createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      ];
      const reduced = sortAndMerge(locationRangesToBeReduced);
      assert.deepEqual(reduced, locationRangesExpected);
      assertIsMaximallyMerged(reduced);
    });

    it('can be reduced if overlapping (different start, same end)', () => {
      const locationRangesToBeReduced = [
        createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
        createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      ];
      const locationRangesExpected = [
        createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
      ];
      const reduced = sortAndMerge(locationRangesToBeReduced);
      assert.deepEqual(reduced, locationRangesExpected);
      assertIsMaximallyMerged(reduced);
    });

    it('can be reduced if overlapping (start == other.end)', () => {
      const locationRangesToBeReduced = [
        createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
        createRange(SCRIPT_ID_ONE, 5, 3, 10, 3),
      ];
      const locationRangesExpected = [
        createRange(SCRIPT_ID_ONE, 0, 3, 10, 3),
      ];
      const reduced = sortAndMerge(locationRangesToBeReduced);
      assert.deepEqual(reduced, locationRangesExpected);
      assertIsMaximallyMerged(reduced);
    });
  });
});
