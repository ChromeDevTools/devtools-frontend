// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../../testing/TraceHelpers.js';
import * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';

import * as ApplicationComponents from './components.js';

const makeFrame = (overrides: Partial<SDK.ResourceTreeModel.ResourceTreeFrame> = {}) => {
  const newFrame: SDK.ResourceTreeModel.ResourceTreeFrame = {
    resourceTreeModel: () => ({
      target: () => ({}),
    }),
    ...overrides,
  } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
  return newFrame;
};

function mockBuildStackTraceRows(
    stackTrace: Protocol.Runtime.StackTrace,
    _target: SDK.Target.Target|null,
    _linkifier: Components.Linkifier.Linkifier,
    _tabStops: boolean|undefined,
    _updateCallback?: (arg0: (Components.JSPresentationUtils.StackTraceRegularRow|
                              Components.JSPresentationUtils.StackTraceAsyncRow)[]) => void,
    ): (Components.JSPresentationUtils.StackTraceRegularRow|Components.JSPresentationUtils.StackTraceAsyncRow)[] {
  const fakeProject = {id: () => 'http://www.example.com', type: () => Workspace.Workspace.projectTypes.Network} as
      Workspace.Workspace.Project;
  return stackTrace.callFrames.map(callFrame => {
    const url = callFrame.url as Platform.DevToolsPath.UrlString;
    const link = Components.Linkifier.Linkifier.linkifyURL(url);
    Components.Linkifier.Linkifier.bindUILocationForTest(
        link,
        new Workspace.UISourceCode.UILocation(
            new Workspace.UISourceCode.UISourceCode(fakeProject, url, Common.ResourceType.resourceTypes.Script), 1));
    return {
      functionName: callFrame.functionName,
      link,
      rowCountHide: false,
    };
  });
}

const fakeScriptId = '1' as Protocol.Runtime.ScriptId;

describeWithEnvironment('StackTrace', () => {
  it('does not generate rows when there is no data', () => {
    const component = new ApplicationComponents.StackTrace.StackTrace();
    const rows = component.createRowTemplates();
    assert.deepEqual(rows, []);
  });

  it('generates rows from stack trace data', () => {
    setupIgnoreListManagerEnvironment();
    const frame = makeFrame({
      getCreationStackTraceData: () => ({
        creationStackTrace: {
          callFrames: [
            {
              functionName: 'function1',
              url: 'http://www.example.com/script1.js',
              lineNumber: 15,
              columnNumber: 10,
              scriptId: fakeScriptId,
            },
            {
              functionName: 'function2',
              url: 'http://www.example.com/script2.js',
              lineNumber: 20,
              columnNumber: 5,
              scriptId: fakeScriptId,
            },
          ],
        },
        creationStackTraceTarget: {} as SDK.Target.Target,
      }),
    });
    const component = new ApplicationComponents.StackTrace.StackTrace();
    renderElementIntoDOM(component);
    component.data = {
      frame,
      buildStackTraceRows: mockBuildStackTraceRows,
    };

    assert.isNotNull(component.shadowRoot);
    const expandableList =
        getElementWithinComponent(component, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    const expandButton = expandableList.shadowRoot!.querySelector('button.arrow-icon-button');
    assert.instanceOf(expandButton, HTMLButtonElement);
    dispatchClickEvent(expandButton);

    const stackTraceRows = getElementsWithinComponent(
        expandableList, 'devtools-stack-trace-row', ApplicationComponents.StackTrace.StackTraceRow);
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assert.isNotNull(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1 \xA0@\xA0www.example.com/script1.js',
      'function2 \xA0@\xA0www.example.com/script2.js',
    ]);
  });

  it('hides hidden rows behind "show all" button', async () => {
    // Initialize ignore listing
    const {ignoreListManager} = setupIgnoreListManagerEnvironment();
    ignoreListManager.ignoreListURL('http://www.example.com/hidden.js' as Platform.DevToolsPath.UrlString);
    const frame = makeFrame({
      getCreationStackTraceData: () => ({
        creationStackTrace: {
          callFrames: [
            {
              functionName: 'function1',
              url: 'http://www.example.com/script.js',
              lineNumber: 15,
              columnNumber: 10,
              scriptId: fakeScriptId,
            },
            {
              functionName: 'function2',
              url: 'http://www.example.com/hidden.js',
              lineNumber: 20,
              columnNumber: 5,
              scriptId: fakeScriptId,
            },
          ],
        },
        creationStackTraceTarget: {} as SDK.Target.Target,
      }),
    });
    const component = new ApplicationComponents.StackTrace.StackTrace();
    renderElementIntoDOM(component);
    component.data = {
      frame,
      buildStackTraceRows: mockBuildStackTraceRows,
    };

    assert.isNotNull(component.shadowRoot);
    const expandableList =
        getElementWithinComponent(component, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    const expandButton = expandableList.shadowRoot!.querySelector('button.arrow-icon-button');
    assert.instanceOf(expandButton, HTMLButtonElement);
    dispatchClickEvent(expandButton);
    await new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });

    const stackTraceRows = Array.from(expandableList.shadowRoot!.querySelectorAll('[data-stack-trace-row]'));
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assert.isNotNull(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1 \xA0@\xA0www.example.com/script.js',
      'Show 1 more frame',
    ]);

    const stackTraceLinkButton = getElementWithinComponent(
        expandableList, 'devtools-stack-trace-link-button', ApplicationComponents.StackTrace.StackTraceLinkButton);
    const showAllButton = stackTraceLinkButton.shadowRoot!.querySelector('.stack-trace-row button.link');
    assert.instanceOf(showAllButton, HTMLButtonElement);
    dispatchClickEvent(showAllButton);

    const openedStackTraceRows = Array.from(expandableList.shadowRoot!.querySelectorAll('[data-stack-trace-row]'));
    let openedStackTraceText: string[] = [];

    openedStackTraceRows.forEach(row => {
      assert.isNotNull(row.shadowRoot);
      openedStackTraceText =
          openedStackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(openedStackTraceText, [
      'function1 \xA0@\xA0www.example.com/script.js',
      'function2 \xA0@\xA0www.example.com/hidden.js',
      'Show less',
    ]);

    const newStackTraceLinkButton = getElementWithinComponent(
        expandableList, 'devtools-stack-trace-link-button', ApplicationComponents.StackTrace.StackTraceLinkButton);
    const showLessButton = newStackTraceLinkButton.shadowRoot!.querySelector('.stack-trace-row button.link');
    assert.instanceOf(showLessButton, HTMLButtonElement);
    dispatchClickEvent(showLessButton);

    const reclosedStackTraceRows = Array.from(expandableList.shadowRoot!.querySelectorAll('[data-stack-trace-row]'));
    stackTraceText = [];

    reclosedStackTraceRows.forEach(row => {
      assert.isNotNull(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1 \xA0@\xA0www.example.com/script.js',
      'Show 1 more frame',
    ]);
  });
});
