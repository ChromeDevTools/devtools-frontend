// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Breakpoints from '../../../../../front_end/models/breakpoints/breakpoints.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createFileSystemFileForPersistenceTests} from '../../helpers/PersistenceHelpers.js';

describeWithMockConnection('PersistenceImpl', () => {
  const FILE_SYSTEM_BREAK_ID = 'BREAK_ID' as Protocol.Debugger.BreakpointId;
  const FILE_SYSTEM_SCRIPT_ID = 'FILE_SYSTEM_SCRIPT' as Protocol.Runtime.ScriptId;
  const NETWORK_BREAKPOINT_ID = 'BREAKPOINT_ID';

  let backend: MockProtocolBackend;
  let target: SDK.Target.Target;
  let breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;

  const DEFAULT_BREAKPOINT:
      [Breakpoints.BreakpointManager.UserCondition, boolean, boolean, Breakpoints.BreakpointManager.BreakpointOrigin] =
          [
            Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION,
            true,   // enabled
            false,  // isLogpoint
            Breakpoints.BreakpointManager.BreakpointOrigin.OTHER,
          ];

  const SCRIPT_DESCRIPTION = {
    url: 'http://www.google.com/script.js' as Platform.DevToolsPath.UrlString,
    content: 'console.log(1);\nconsole.log(2);\n',
    startLine: 0,
    startColumn: 0,
    hasSourceURL: false,
  };

  beforeEach(() => {
    target = createTarget();

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance(
        {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});

    backend = new MockProtocolBackend();
    Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
  });

  async function setBreakpointOnFileSystem(
      fileSystemUiSourceCode: Workspace.UISourceCode.UISourceCode, breakpointLine: number) {
    const fileSystemBreakpointResponse =
        backend.responderToBreakpointByUrlRequest(fileSystemUiSourceCode.url(), breakpointLine)({
          breakpointId: FILE_SYSTEM_BREAK_ID,
          locations: [
            {
              scriptId: FILE_SYSTEM_SCRIPT_ID,
              lineNumber: breakpointLine,
              columnNumber: 0,
            },
          ],
        });

    // Set the breakpoint on the file system uiSourceCode.
    await breakpointManager.setBreakpoint(fileSystemUiSourceCode, breakpointLine, 0, ...DEFAULT_BREAKPOINT);
    await fileSystemBreakpointResponse;
  }

  async function attachNetworkScript(breakpointLine: number) {
    const script = await backend.addScript(target, SCRIPT_DESCRIPTION, null);
    const uiSourceCode =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForScript(script);
    assertNotNullOrUndefined(uiSourceCode);

    // Set the breakpoint response for our upcoming request to set the breakpoint on the network file.
    await backend.responderToBreakpointByUrlRequest(script.sourceURL, breakpointLine)({
      breakpointId: NETWORK_BREAKPOINT_ID as Protocol.Debugger.BreakpointId,
      locations: [
        {
          scriptId: script.scriptId,
          lineNumber: breakpointLine,
          columnNumber: 0,
        },
      ],
    });
    return uiSourceCode;
  }

  function assertBreakLocationUiSourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]) {
    const locations = breakpointManager.allBreakpointLocations();
    assert.deepEqual(locations.map(loc => loc.uiLocation.uiSourceCode), uiSourceCodes);
  }

  it('moves breakpoint from file system uiSourceCode to the network uiSourceCode when binding is created', async () => {
    const fileSystemPath = 'file://path/to/filesystem' as Platform.DevToolsPath.UrlString;
    const fileSystemFileUrl = fileSystemPath + '/script.js' as Platform.DevToolsPath.UrlString;
    const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
        {fileSystemPath, fileSystemFileUrl, type: ''}, SCRIPT_DESCRIPTION.url, SCRIPT_DESCRIPTION.content, target);
    const breakpointLine = 0;

    // Set the breakpoint response for our upcoming request.
    await setBreakpointOnFileSystem(fileSystemUiSourceCode, breakpointLine);

    // We should only have one breakpoint location: the one on the file system.
    assertBreakLocationUiSourceCodes([fileSystemUiSourceCode]);

    // Add the script.
    const networkUiSourceCode = await attachNetworkScript(breakpointLine);

    // We should only have one breakpoint location: the one on the network.
    assertBreakLocationUiSourceCodes([networkUiSourceCode]);

    project.dispose();

    assertBreakLocationUiSourceCodes([networkUiSourceCode]);
  });

  it('copies breakpoint from network uiSourceCode to the file system uiSourceCode when binding is removed ',
     async () => {
       const fileSystemPath = 'file://path/to/filesystem' as Platform.DevToolsPath.UrlString;
       const fileSystemFileUrl = fileSystemPath + '/script.js' as Platform.DevToolsPath.UrlString;
       const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
           {fileSystemPath, fileSystemFileUrl, type: ''}, SCRIPT_DESCRIPTION.url, SCRIPT_DESCRIPTION.content, target);
       const breakpointLine = 0;

       // Set the breakpoint response for our upcoming request.
       await setBreakpointOnFileSystem(fileSystemUiSourceCode, breakpointLine);

       // We should only have one breakpoint location: the one on the file system.
       assertBreakLocationUiSourceCodes([fileSystemUiSourceCode]);

       // Add the script.
       const networkUiSourceCode = await attachNetworkScript(breakpointLine);

       // We should only have one breakpoint location: the one on the network.
       assertBreakLocationUiSourceCodes([networkUiSourceCode]);

       // Prepare to remove the binding. This will cause the breakpoint from the network to be copied
       // over to the file system uiSourceCode.
       const persistence = Persistence.Persistence.PersistenceImpl.instance();
       const binding = persistence.binding(fileSystemUiSourceCode);
       assertNotNullOrUndefined(binding);

       // Set the breakpoint response for our upcoming request on the file system.
       const moveResponse = backend.responderToBreakpointByUrlRequest(fileSystemUiSourceCode.url(), breakpointLine)({
         breakpointId: FILE_SYSTEM_BREAK_ID,
         locations: [
           {
             scriptId: FILE_SYSTEM_SCRIPT_ID,
             lineNumber: breakpointLine,
             columnNumber: 0,
           },
         ],
       });

       await persistence.removeBinding(binding);
       await moveResponse;

       assertBreakLocationUiSourceCodes([fileSystemUiSourceCode, networkUiSourceCode]);
       project.dispose();
     });
});
