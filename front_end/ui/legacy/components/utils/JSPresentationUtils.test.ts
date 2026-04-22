// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type * as Bindings from '../../../../models/bindings/bindings.js';
import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../../testing/TestUniverse.js';

import * as Components from './utils.js';

const {urlString} = Platform.DevToolsPath;

describe('JSPresentationUtils', () => {
  setupRuntimeHooks();
  setupSettingsHooks();
  setupLocaleHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  function setUpEnvironment() {
    const target = universe.createTarget({});
    return {target, debuggerWorkspaceBinding: universe.debuggerWorkspaceBinding};
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

  it('renders stack trace, and re-renders on update', async () => {
    const {target, debuggerWorkspaceBinding} = setUpEnvironment();
    const stackTrace = await createStackTrace(target, debuggerWorkspaceBinding);
    const component = new Components.JSPresentationUtils.StackTracePreviewContent();
    component.options = {tabStops: false, ignoreListManager: universe.ignoreListManager};
    component.stackTrace = stackTrace;
    await component.updateComplete;

    assert.lengthOf(component.linkElements, 3);
    assert.strictEqual(component.linkElements[0].textContent, 'www.google.com/script.js:1');

    // Modify stack trace and re-render.
    // @ts-expect-error
    stackTrace.syncFragment.frames[0].line = 100;
    stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    await component.updateComplete;

    assert.lengthOf(component.linkElements, 3);
    assert.strictEqual(component.linkElements[0].textContent, 'www.google.com/script.js:101');
  });

  it('renders expandable stack trace', async () => {
    const {target, debuggerWorkspaceBinding} = setUpEnvironment();
    const stackTrace = await createStackTrace(target, debuggerWorkspaceBinding);

    const component = new Components.JSPresentationUtils.StackTracePreviewContent();
    component.options = {expandable: true, ignoreListManager: universe.ignoreListManager};
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

  it('toggles ignore-listed frames when clicking Show more/less', async () => {
    const {target, debuggerWorkspaceBinding} = setUpEnvironment();
    const stackTrace = await createStackTrace(target, debuggerWorkspaceBinding);

    const ignoreListManager = universe.ignoreListManager;
    ignoreListManager.ignoreListURL(urlString`bar.js`);

    const component = new Components.JSPresentationUtils.StackTracePreviewContent();
    component.options = {expandable: true, ignoreListManager};
    renderElementIntoDOM(component);

    component.stackTrace = stackTrace;
    await component.updateComplete;

    // Expand to see frames
    const expandButton = component.contentElement.querySelector('button');
    assert.exists(expandButton);
    expandButton.click();
    await component.updateComplete;

    // Initially show-hidden-rows should be false
    assert.isFalse(component.element.classList.contains('show-hidden-rows'));

    // Find and click "Show more"
    const showMoreLink = component.contentElement.querySelector('.show-all-link .link') as HTMLElement;
    assert.exists(showMoreLink);
    showMoreLink.click();
    await component.updateComplete;

    // Now show-hidden-rows should be true
    assert.isTrue(component.element.classList.contains('show-hidden-rows'));

    // Find and click "Show less"
    const showLessLink = component.contentElement.querySelector('.show-less-link .link') as HTMLElement;
    assert.exists(showLessLink);
    showLessLink.click();
    await component.updateComplete;

    // Now show-hidden-rows should be false again
    assert.isFalse(component.element.classList.contains('show-hidden-rows'));
  });
});
