// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {createTarget} from '../../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../../testing/MockConnection.js';

import * as Components from './utils.js';

// TODO(crbug.com/456517732): remove when all usages of runtimeStackTrace are migrated.
describeWithMockConnection('JSPresentationUtils (legacy stack trace)', () => {
  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false);
    linkifier.targetAdded(target);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = target.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    return {target, linkifier};
  }

  function checkLinkContentForStackTracePreview(url: string, expectedLinkContent: string) {
    const {target, linkifier} = setUpEnvironment();
    const callFrame = {scriptId: 'scriptId', functionName: 'func', url, lineNumber: 0, columnNumber: 0};
    const stackTrace = {callFrames: [callFrame]};
    const options = {tabStops: false, runtimeStackTrace: stackTrace} as Components.JSPresentationUtils.Options;
    const {linkElements: links} =
        new Components.JSPresentationUtils.StackTracePreviewContent(undefined, target, linkifier, options);
    assert.lengthOf(links, 1);
    assert.strictEqual(links[0].textContent, expectedLinkContent);
  }

  it('uses \'unknown\' as link content if url is not available', () => {
    const url = '';
    const expectedLinkContent = 'unknown';
    checkLinkContentForStackTracePreview(url, expectedLinkContent);
  });

  it('uses url as link content if url is available', () => {
    const url = 'https://www.google.com/script.js';
    const expectedLinkContent = 'www.google.com/script.js:1';
    checkLinkContentForStackTracePreview(url, expectedLinkContent);
  });
});

describeWithMockConnection('JSPresentationUtils', () => {
  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false);
    linkifier.targetAdded(target);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = target.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    return {target, debuggerWorkspaceBinding, linkifier};
  }

  async function createStackTrace(
      target: SDK.Target.Target, debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding) {
    const url = 'https://www.google.com/script.js';
    const scriptId = '1' as Protocol.Runtime.ScriptId;
    return await debuggerWorkspaceBinding.createStackTraceFromProtocolRuntime(
        {
          callFrames: [
            {scriptId, url, lineNumber: 0, columnNumber: 10, functionName: 'foo'},
            {scriptId, url: 'bar.js', lineNumber: 1, columnNumber: 20, functionName: 'bar'},
            {scriptId, url: 'baz.js', lineNumber: 2, columnNumber: 30, functionName: 'baz'},
          ],
        },
        target);
  }

  async function checkLinkContentForStackTracePreview(
      target: SDK.Target.Target, linkifier: Components.Linkifier.Linkifier,
      stackTrace: StackTrace.StackTrace.StackTrace, expectedNumLinks: number, expectedLinkContent: string) {
    const options = {tabStops: false};
    const component =
        new Components.JSPresentationUtils.StackTracePreviewContent(undefined, target, linkifier, options);
    component.stackTrace = stackTrace;
    await component.updateComplete;
    assert.lengthOf(component.linkElements, expectedNumLinks);
    assert.strictEqual(component.linkElements[0].textContent, expectedLinkContent);
  }

  it('renders stack trace, and re-renders on update', async () => {
    const {target, debuggerWorkspaceBinding, linkifier} = setUpEnvironment();
    const stackTrace = await createStackTrace(target, debuggerWorkspaceBinding);
    const expectedNumLinks = 3;
    await checkLinkContentForStackTracePreview(
        target, linkifier, stackTrace, expectedNumLinks, 'www.google.com/script.js:1');

    // Modify stack trace and re-render.
    // @ts-expect-error
    stackTrace.syncFragment.frames[0].line = 100;
    stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    await checkLinkContentForStackTracePreview(
        target, linkifier, stackTrace, expectedNumLinks, 'www.google.com/script.js:101');
  });

  it('renders expandable stack trace', async () => {
    const {target, debuggerWorkspaceBinding, linkifier} = setUpEnvironment();
    const stackTrace = await createStackTrace(target, debuggerWorkspaceBinding);

    const options = {expandable: true};
    const component =
        new Components.JSPresentationUtils.StackTracePreviewContent(undefined, target, linkifier, options);
    renderElementIntoDOM(component);
    assert.isFalse(component.hasContent());
    component.stackTrace = stackTrace;
    await component.updateComplete;
    assert.deepEqual(component.contentElement.deepInnerText().split('\n'), ['\tfoo\t@\twww.google.com/script.js:1']);
    const expandButton = component.contentElement.querySelector('button');
    assert.exists(expandButton);
    expandButton.click();
    await component.updateComplete;
    assert.isTrue(component.hasContent());
    assert.deepEqual(component.contentElement.deepInnerText().split('\n'), [
      '\tfoo\t@\twww.google.com/script.js:1',
      '\tbar\t@\tbar.js:2',
      '\tbaz\t@\tbaz.js:3',
    ]);
  });
});
