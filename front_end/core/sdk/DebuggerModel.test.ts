// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithLocale} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;
const SCRIPT_ID_ONE = '1' as Protocol.Runtime.ScriptId;
const SCRIPT_ID_TWO = '2' as Protocol.Runtime.ScriptId;

describe('DebuggerModel', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  describe('breakpoint activation', () => {
    it('deactivates breakpoints on construction with inactive breakpoints', async () => {
      const connection = new MockCDPConnection();
      let breakpointsDeactivated = false;
      connection.setHandler('Debugger.setBreakpointsActive', request => {
        if (request.active === false) {
          breakpointsDeactivated = true;
        }
        return {result: {}};
      });
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(false);
      createTarget({connection});
      assert.isTrue(breakpointsDeactivated);
    });

    it('deactivates breakpoints for suspended target', async () => {
      const connection = new MockCDPConnection();
      let breakpointsDeactivated = false;
      connection.setHandler('Debugger.setBreakpointsActive', request => {
        if (request.active === false) {
          breakpointsDeactivated = true;
        }
        return {result: {}};
      });

      const target = createTarget({connection});

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
      const connection = new MockCDPConnection();
      let breakpointsDeactivated = false;
      let breakpointsActivated = false;
      connection.setHandler('Debugger.setBreakpointsActive', request => {
        if (request.active) {
          breakpointsActivated = true;
        } else {
          breakpointsDeactivated = true;
        }
        return {result: {}};
      });

      // Deactivate breakpoints befroe the target is created.
      Common.Settings.Settings.instance().moduleSetting('breakpoints-active').set(false);
      const target = createTarget({connection});
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
      const connection = new MockCDPConnection();
      const target = createTarget({connection});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const url = 'http://localhost/index.html';
      connection.dispatchEvent(
          'Debugger.scriptParsed', {
            scriptId: SCRIPT_ID_ONE,
            url,
            startLine: 0,
            startColumn: 0,
            endLine: 1,
            endColumn: 10,
            executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
            hash: '',
            buildId: '',
            isLiveEdit: false,
            sourceMapURL: undefined,
            hasSourceURL: false,
            length: 10,
          },
          target.sessionId);
      connection.dispatchEvent(
          'Debugger.scriptParsed', {
            scriptId: SCRIPT_ID_TWO,
            url,
            startLine: 20,
            startColumn: 0,
            endLine: 21,
            endColumn: 10,
            executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
            hash: '',
            buildId: '',
            isLiveEdit: false,
            sourceMapURL: undefined,
            hasSourceURL: false,
            length: 10,
          },
          target.sessionId);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 0)?.scriptId, SCRIPT_ID_ONE);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 20, 1)?.scriptId, SCRIPT_ID_TWO);
      assert.isNull(debuggerModel?.createRawLocationByURL(url, 5, 5));
    });
  });

  const breakpointId1 = 'fs.js:1' as Protocol.Debugger.BreakpointId;
  const breakpointId2 = 'unsupported' as Protocol.Debugger.BreakpointId;

  describe('setBreakpointByURL', () => {
    it('correctly sets only a single breakpoint in Node.js internal scripts', async () => {
      const connection = new MockCDPConnection();
      connection.setHandler('Debugger.setBreakpointByUrl', ({url}) => {
        if (url === 'fs.js') {
          return {
            result: {
              breakpointId: breakpointId1,
              locations: [],
            }
          };
        }
        return {
          result: {
            breakpointId: breakpointId2,
            locations: [],
          }
        };
      });

      const target = createTarget({connection});
      target.markAsNodeJSForTest();
      const model = new SDK.DebuggerModel.DebuggerModel(target);
      const {breakpointId} = await model.setBreakpointByURL(urlString`fs.js`, 1);
      assert.strictEqual(breakpointId, breakpointId1);
    });
  });

  describe('scriptsForSourceURL', () => {
    it('returns the latest script at the front of the result for scripts with the same URL', () => {
      const connection = new MockCDPConnection();
      const target = createTarget({connection});
      const url = 'http://localhost/index.html';
      connection.dispatchEvent(
          'Debugger.scriptParsed', {
            scriptId: SCRIPT_ID_ONE,
            url,
            startLine: 0,
            startColumn: 0,
            endLine: 1,
            endColumn: 10,
            executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
            hash: '',
            buildId: '',
            isLiveEdit: false,
            sourceMapURL: undefined,
            hasSourceURL: false,
            length: 10,
          },
          target.sessionId);
      connection.dispatchEvent(
          'Debugger.scriptParsed', {
            scriptId: SCRIPT_ID_TWO,
            url,
            startLine: 20,
            startColumn: 0,
            endLine: 21,
            endColumn: 10,
            executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
            buildId: '',
            hash: '',
            isLiveEdit: false,
            sourceMapURL: undefined,
            hasSourceURL: false,
            length: 10,
          },
          target.sessionId);

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const scripts = debuggerModel?.scriptsForSourceURL(url) || [];

      assert.strictEqual(scripts[0].scriptId, SCRIPT_ID_TWO);
      assert.strictEqual(scripts[1].scriptId, SCRIPT_ID_ONE);
    });
  });

  describeWithLocale('Scope', () => {
    it('Scope.typeName covers every enum value', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const scriptUrl = urlString`https://script-host/script.js`;
      const script = new SDK.Script.Script(
          debuggerModel, SCRIPT_ID_ONE, scriptUrl, 0, 0, 0, 0, 0, '', false, false, undefined, false, 0, null, null,
          null, null, null, null, null);
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
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
        workspace,
      });
    });

    it('with empty call frame list will invoke plain step-into', async () => {
      const connection = new MockCDPConnection();
      const target =
          createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.FRAME, connection});
      const stepIntoRequestPromise = new Promise<void>(resolve => {
        connection.setHandler('Debugger.stepInto', () => {
          resolve();
          return {result: {}};
        });
      });

      connection.dispatchEvent(
          'Debugger.paused', {
            callFrames: [],
            reason: Protocol.Debugger.PausedEventReason.Other,
          },
          target.sessionId);

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
      assert.deepEqual(consoleMessages[0].text, expectedWarning);
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
