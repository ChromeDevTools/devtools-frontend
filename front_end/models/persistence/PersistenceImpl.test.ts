// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {createFileSystemFileForPersistenceTests} from '../../testing/PersistenceHelpers.js';
import {
  createContentProviderUISourceCode,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import * as Bindings from '../bindings/bindings.js';
import * as Breakpoints from '../breakpoints/breakpoints.js';
import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';

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
    assert.exists(uiSourceCode);

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
       assert.exists(binding);

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

       assertBreakLocationUiSourceCodes([networkUiSourceCode, fileSystemUiSourceCode]);
       project.dispose();
     });

  // Replaces web test: http/tests/devtools/persistence/automapping-bind-committed-network-sourcecode.js
  it('it marks the filesystem UISourceCode dirty when the network UISourceCode was committed before the binding was established',
     async () => {
       const url = 'https://example.com/script.js' as Platform.DevToolsPath.UrlString;
       const origContent = 'window.foo = () => "foo";\n';
       const {uiSourceCode: networkUISourceCode} = createContentProviderUISourceCode({
         url,
         content: origContent,
         mimeType: 'text/javascript',
         projectType: Workspace.Workspace.projectTypes.Network,
         metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
       });

       // Modify the content of the network UISourceCode.
       const content = origContent.replace(/foo/g, 'bar');
       networkUISourceCode.addRevision(content);

       // Add a filesystem version of 'script.js' with the original content.
       const mappingPromise =
           Persistence.Persistence.PersistenceImpl.instance().once(Persistence.Persistence.Events.BindingCreated);
       const localUrl = 'file:///var/www/script.js' as Platform.DevToolsPath.UrlString;
       const {uiSourceCode} = createFileSystemUISourceCode({
         url: localUrl,
         mimeType: 'text/javascript',
         content: origContent,
         autoMapping: true,
         metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
       });

       const {network, fileSystem} = await mappingPromise;
       assert.strictEqual(network, networkUISourceCode);
       assert.strictEqual(fileSystem, uiSourceCode);
       assert.isTrue(fileSystem.isDirty());
       assert.strictEqual(fileSystem.workingCopy(), content);
     });
});
