// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

import {describeWithRealConnection} from '../../helpers/RealConnection.js';

describeWithRealConnection('BreakpointManager', () => {
  it('allows awaiting on scheduled update in debugger', async () => {
    const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    if (!breakpointManager) {
      assert.fail('Cannot get breakpointManager');
      return;
    }
    const fileSystem = {
      id: () => 'FILE_SYSTEM_ID',
    } as unknown as Persistence.FileSystemWorkspaceBinding.FileSystem;

    const URL = 'file:///tmp/example.html' as Platform.DevToolsPath.UrlString;
    const SCRIPT_ID = 'SCRIPT_ID' as Protocol.Runtime.ScriptId;
    const BREAKPOINT_ID = 'BREAKPOINT_ID' as Protocol.Debugger.BreakpointId;
    const uiSourceCode =
        new Workspace.UISourceCode.UISourceCode(fileSystem, URL, Common.ResourceType.resourceTypes.Document);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.mainTarget();
    if (!target) {
      assert.fail('Cannot get target');
      return;
    }

    class TestDebuggerModel extends SDK.DebuggerModel.DebuggerModel {
      constructor(target: SDK.Target.Target) {
        super(target);
      }

      async setBreakpointByURL(
          _url: Platform.DevToolsPath.UrlString, _lineNumber: number, _columnNumber?: number,
          _condition?: string): Promise<SDK.DebuggerModel.SetBreakpointResult> {
        return Promise.resolve(
            {breakpointId: BREAKPOINT_ID, locations: [new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, 42)]});
      }

      scriptForId(scriptId: string): SDK.Script.Script|null {
        if (scriptId === SCRIPT_ID) {
          return new SDK.Script.Script(
              this, scriptId as Protocol.Runtime.ScriptId, URL, 0, 0, 0, 0, 0, '', false, false, undefined, false, 0,
              null, null, null, null, null, null);
        }
        return null;
      }
    }

    const debuggerModel = new TestDebuggerModel(target);
    const breakpoint = await breakpointManager.setBreakpoint(uiSourceCode, 42, 0, '', true);

    const modelBreakpoint = new Bindings.BreakpointManager.ModelBreakpoint(
        debuggerModel, breakpoint, breakpointManager.debuggerWorkspaceBinding);
    const mapping = {
      rawLocationToUILocation: (_: SDK.DebuggerModel.Location) => null,
      uiLocationToRawLocations:
          (_uiSourceCode: Workspace.UISourceCode.UISourceCode, _lineNumber: number,
           _columnNumber?: number) => [new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, 13)],
    };
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().addSourceMapping(mapping);
    assert.isNull(breakpoint.currentState);
    const update = modelBreakpoint.scheduleUpdateInDebugger();
    assert.isNull(breakpoint.currentState);
    await update;
    assert.strictEqual(breakpoint.currentState?.positions[0]?.lineNumber, 13);
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    breakpointManager.removeBreakpoint(breakpoint, true);
  });
});
