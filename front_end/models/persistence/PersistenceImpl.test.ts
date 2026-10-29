// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {createFileSystemFileForPersistenceTests} from '../../testing/PersistenceHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {
  createContentProviderUISourceCode,
  createFileSystemUISourceCode,
} from '../../testing/UISourceCodeHelpers.js';
import * as Breakpoints from '../breakpoints/breakpoints.js';
import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';

const {urlString} = Platform.DevToolsPath;

describe('PersistenceImpl', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  const FILE_SYSTEM_BREAK_ID = 'BREAK_ID' as Protocol.Debugger.BreakpointId;
  const FILE_SYSTEM_SCRIPT_ID = 'FILE_SYSTEM_SCRIPT' as Protocol.Runtime.ScriptId;
  const NETWORK_BREAKPOINT_ID = 'BREAKPOINT_ID';

  let backend: MockDebuggerBackend;
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
    url: urlString`http://www.google.com/script.js`,
    content: 'console.log(1);\nconsole.log(2);\n',
    startLine: 0,
    startColumn: 0,
    hasSourceURL: false,
  };

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    breakpointManager = backend.universe.breakpointManager;
    // Eagerly instantiate persistence so it registers listeners on the workspace before we add files.
    void backend.universe.persistence;
    target = backend.createTarget();
  });

  afterEach(() => {
    backend.universe.dispose();
  });

  async function setBreakpointOnFileSystem(
      fileSystemUiSourceCode: Workspace.UISourceCode.UISourceCode, breakpointLine: number) {
    const fileSystemBreakpointResponse =
        backend.responderToBreakpointByUrlRequest(fileSystemUiSourceCode.url(), breakpointLine)({
          result: {
            breakpointId: FILE_SYSTEM_BREAK_ID,
            locations: [
              {
                scriptId: FILE_SYSTEM_SCRIPT_ID,
                lineNumber: breakpointLine,
                columnNumber: 0,
              },
            ],
          },
        });

    // Set the breakpoint on the file system uiSourceCode.
    await breakpointManager.setBreakpoint(fileSystemUiSourceCode, breakpointLine, 0, ...DEFAULT_BREAKPOINT);
    await fileSystemBreakpointResponse;
  }

  async function attachNetworkScript(breakpointLine: number) {
    const script = await backend.addScript(target, SCRIPT_DESCRIPTION, null);
    const uiSourceCode = backend.universe.debuggerWorkspaceBinding.uiSourceCodeForScript(script);
    assert.exists(uiSourceCode);

    // Set the breakpoint response for our upcoming request to set the breakpoint on the network file.
    await backend.responderToBreakpointByUrlRequest(script.sourceURL, breakpointLine)({
      result: {
        breakpointId: NETWORK_BREAKPOINT_ID as Protocol.Debugger.BreakpointId,
        locations: [
          {
            scriptId: script.scriptId,
            lineNumber: breakpointLine,
            columnNumber: 0,
          },
        ],
      },
    });
    return uiSourceCode;
  }

  function assertBreakLocationUiSourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]) {
    const locations = breakpointManager.allBreakpointLocations();
    assert.deepEqual(locations.map(loc => loc.uiLocation.uiSourceCode), uiSourceCodes);
  }

  it('moves breakpoint from file system uiSourceCode to the network uiSourceCode when binding is created', async () => {
    const fileSystemPath = urlString`file://path/to/filesystem`;
    const fileSystemFileUrl = urlString`${fileSystemPath + '/script.js'}`;
    const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
        {
          fileSystemPath,
          fileSystemFileUrl,
          type: Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
        },
        SCRIPT_DESCRIPTION.url, SCRIPT_DESCRIPTION.content, target, backend.universe);
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
       const fileSystemPath = urlString`file://path/to/filesystem`;
       const fileSystemFileUrl = urlString`${fileSystemPath + '/script.js'}`;
       const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemFileForPersistenceTests(
           {
             fileSystemPath,
             fileSystemFileUrl,
             type: Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
           },
           SCRIPT_DESCRIPTION.url, SCRIPT_DESCRIPTION.content, target, backend.universe);
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
       const persistence = backend.universe.persistence;
       const binding = persistence.binding(fileSystemUiSourceCode);
       assert.exists(binding);

       // Set the breakpoint response for our upcoming request on the file system.
       const moveResponse = backend.responderToBreakpointByUrlRequest(fileSystemUiSourceCode.url(), breakpointLine)({
         result: {
           breakpointId: FILE_SYSTEM_BREAK_ID,
           locations: [
             {
               scriptId: FILE_SYSTEM_SCRIPT_ID,
               lineNumber: breakpointLine,
               columnNumber: 0,
             },
           ],
         },
       });

       await persistence.removeBinding(binding);
       await moveResponse;

       assertBreakLocationUiSourceCodes([networkUiSourceCode, fileSystemUiSourceCode]);
       project.dispose();
     });

  // Replaces web test: http/tests/devtools/persistence/automapping-bind-committed-network-sourcecode.js
  it('it marks the filesystem UISourceCode dirty when the network UISourceCode was committed before the binding was established',
     async () => {
       const url = urlString`https://example.com/script.js`;
       const origContent = 'window.foo = () => "foo";\n';
       const {uiSourceCode: networkUISourceCode} = createContentProviderUISourceCode({
         url,
         content: origContent,
         mimeType: 'text/javascript',
         projectType: Workspace.Workspace.projectTypes.Network,
         metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
         universe: backend.universe,
       });

       // Modify the content of the network UISourceCode.
       const content = origContent.replace(/foo/g, 'bar');
       networkUISourceCode.addRevision(content);

       // Add a filesystem version of 'script.js' with the original content.
       const mappingPromise = backend.universe.persistence.once(Persistence.Persistence.Events.BindingCreated);
       const localUrl = urlString`file:///var/www/script.js`;
       const {uiSourceCode} = createFileSystemUISourceCode({
         url: localUrl,
         mimeType: 'text/javascript',
         content: origContent,
         autoMapping: true,
         metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, origContent.length),
         universe: backend.universe,
       });
       const {network, fileSystem} = await mappingPromise;
       assert.strictEqual(network, networkUISourceCode);
       assert.strictEqual(fileSystem, uiSourceCode);
       assert.isTrue(fileSystem.isDirty());
       assert.strictEqual(fileSystem.workingCopy(), content);
     });

  it('syncs content between network and filesystem UISourceCodes', async () => {
    const url = urlString`https://example.com/script.js`;
    const content = 'window.foo = 1;\n';
    const {uiSourceCode: networkUISourceCode} = createContentProviderUISourceCode({
      url,
      content,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, content.length),
      universe: backend.universe,
    });

    const mappingPromise = backend.universe.persistence.once(Persistence.Persistence.Events.BindingCreated);
    const localUrl = urlString`file:///var/www/script.js`;
    const {uiSourceCode: fileSystemUISourceCode} = createFileSystemUISourceCode({
      url: localUrl,
      mimeType: 'text/javascript',
      content,
      autoMapping: true,
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, content.length),
      universe: backend.universe,
    });

    const {network, fileSystem} = await mappingPromise;

    assert.strictEqual(network, networkUISourceCode);
    assert.strictEqual(fileSystem, fileSystemUISourceCode);

    const persistence = backend.universe.persistence;

    // Helper to wait for sync
    const waitForSync = () => new Promise<void>(resolve => {
      const stub = sinon.stub(persistence as unknown as {contentSyncedForTest: () => void}, 'contentSyncedForTest')
                       .callsFake(() => {
                         stub.restore();
                         resolve();
                       });
    });

    // 1. Change filesystem content (revision) -> verify network working copy matches.
    let syncPromise = waitForSync();
    fileSystemUISourceCode.addRevision('window.foo = 2;\n');
    await syncPromise;
    assert.strictEqual(networkUISourceCode.workingCopy(), 'window.foo = 2;\n');
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), 'window.foo = 2;\n');

    // 2. Change filesystem working copy -> verify network working copy matches.
    syncPromise = waitForSync();
    fileSystemUISourceCode.setWorkingCopy('window.foo = 3;\n');
    await syncPromise;
    assert.strictEqual(networkUISourceCode.workingCopy(), 'window.foo = 3;\n');
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), 'window.foo = 3;\n');

    // 3. Reset filesystem working copy -> verify network working copy matches (reverts to last revision, which is 'window.foo = 2;\n')
    syncPromise = waitForSync();
    fileSystemUISourceCode.resetWorkingCopy();
    await syncPromise;
    assert.strictEqual(networkUISourceCode.workingCopy(), 'window.foo = 2;\n');
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), 'window.foo = 2;\n');

    // 4. Change network content (revision) -> verify filesystem working copy matches.
    syncPromise = waitForSync();
    networkUISourceCode.addRevision('window.foo = 4;\n');
    await syncPromise;
    assert.strictEqual(networkUISourceCode.workingCopy(), 'window.foo = 4;\n');
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), 'window.foo = 4;\n');

    // 5. Change network working copy -> verify filesystem working copy matches.
    syncPromise = waitForSync();
    networkUISourceCode.setWorkingCopy('window.foo = 5;\n');
    await syncPromise;
    assert.strictEqual(networkUISourceCode.workingCopy(), 'window.foo = 5;\n');
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), 'window.foo = 5;\n');
  });

  it('syncs Node.js contents correctly', async () => {
    target.markAsNodeJSForTest();

    const content = ['', '', 'var express = require("express");', '//TODO'].join('\n');
    const fsContent = Persistence.Persistence.NodeShebang + content;
    const nodeContent = Persistence.Persistence.NodePrefix + content + Persistence.Persistence.NodeSuffix;

    // 1. Add Network UISourceCode
    const url = urlString`http://127.0.0.1:8000/nodejs.js`;
    const {uiSourceCode: networkUISourceCode} = createContentProviderUISourceCode({
      url,
      content: nodeContent,
      mimeType: 'text/javascript',
      projectType: Workspace.Workspace.projectTypes.Network,
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, fsContent.length),
      universe: backend.universe,
      target,
    });

    // 2. Add FileSystem UISourceCode
    const mappingPromise = backend.universe.persistence.once(Persistence.Persistence.Events.BindingCreated);
    const localUrl = urlString`file:///var/www/nodejs.js`;
    const {uiSourceCode: fileSystemUISourceCode} = createFileSystemUISourceCode({
      url: localUrl,
      mimeType: 'text/javascript',
      content: fsContent,
      autoMapping: true,
      metadata: new Workspace.UISourceCode.UISourceCodeMetadata(null, fsContent.length),
      universe: backend.universe,
    });

    const {network, fileSystem} = await mappingPromise;

    assert.strictEqual(network, networkUISourceCode);
    assert.strictEqual(fileSystem, fileSystemUISourceCode);

    // 3. changeNetworkUISourceCodeRevision
    let newContent = nodeContent.replace('//TODO', 'network();\n//TODO');
    const syncedCommitted = fileSystemUISourceCode.once(Workspace.UISourceCode.Events.WorkingCopyCommitted);
    networkUISourceCode.addRevision(newContent);
    await syncedCommitted;
    assert.strictEqual(networkUISourceCode.workingCopy(), newContent);
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), fsContent.replace('//TODO', 'network();\n//TODO'));

    // 4. setNetworkUISourceCodeWorkingCopy
    newContent = nodeContent.replace('//TODO', 'workingCopy1();\n//TODO');
    const syncedChanged = fileSystemUISourceCode.once(Workspace.UISourceCode.Events.WorkingCopyChanged);
    networkUISourceCode.setWorkingCopy(newContent);
    await syncedChanged;
    assert.strictEqual(networkUISourceCode.workingCopy(), newContent);
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), fsContent.replace('//TODO', 'workingCopy1();\n//TODO'));

    // 5. changeFileSystemFile
    newContent = fsContent.replace('//TODO', 'filesystem();\n//TODO');
    const syncedCommittedNetwork = networkUISourceCode.once(Workspace.UISourceCode.Events.WorkingCopyCommitted);
    fileSystemUISourceCode.setContent(newContent, false);
    await syncedCommittedNetwork;
    assert.strictEqual(networkUISourceCode.workingCopy(), nodeContent.replace('//TODO', 'filesystem();\n//TODO'));
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), newContent);

    // 6. setFileSystemUISourceCodeWorkingCopy
    newContent = fsContent.replace('//TODO', 'workingCopy2();\n//TODO');
    const syncedChangedNetwork = networkUISourceCode.once(Workspace.UISourceCode.Events.WorkingCopyChanged);
    fileSystemUISourceCode.setWorkingCopy(newContent);
    await syncedChangedNetwork;
    assert.strictEqual(networkUISourceCode.workingCopy(), nodeContent.replace('//TODO', 'workingCopy2();\n//TODO'));
    assert.strictEqual(fileSystemUISourceCode.workingCopy(), newContent);
  });
});
