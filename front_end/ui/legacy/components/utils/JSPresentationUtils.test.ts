// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import {createTarget} from '../../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../../testing/MockConnection.js';

import * as Components from './utils.js';

describeWithMockConnection('JSPresentationUtils', () => {
  function setUpEnvironment() {
    const target = createTarget();
    const linkifier = new Components.Linkifier.Linkifier(100, false);
    linkifier.targetAdded(target);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const forceNew = true;
    const targetManager = target.targetManager();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew, debuggerWorkspaceBinding});
    return {target, linkifier};
  }

  function checkLinkContentForStackTracePreview(url: string, expectedLinkContent: string) {
    const {target, linkifier} = setUpEnvironment();
    const callFrame = {scriptId: 'scriptId', functionName: 'func', url, lineNumber: 0, columnNumber: 0};
    const stackTrace = {callFrames: [callFrame]};
    const options = {tabStops: false, stackTrace} as Components.JSPresentationUtils.Options;
    const {links} = Components.JSPresentationUtils.buildStackTracePreviewContents(target, linkifier, options);
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
