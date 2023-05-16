// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as ExpandableList from '../../../../../../front_end/ui/components/expandable_list/expandable_list.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as Components from '../../../../../../front_end/ui/legacy/components/utils/utils.js';
import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  getElementsWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const makeFrame =
    (overrides: Partial<SDK.ResourceTreeModel.ResourceTreeFrame> = {}): SDK.ResourceTreeModel.ResourceTreeFrame => {
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
  return stackTrace.callFrames.map(
      callFrame => ({
        functionName: callFrame.functionName,
        ignoreListHide: callFrame.url.includes('hidden'),
        link: Components.Linkifier.Linkifier.linkifyURL(callFrame.url as Platform.DevToolsPath.UrlString),
        rowCountHide: false,
      }));
}

const fakeScriptId = '1' as Protocol.Runtime.ScriptId;

describeWithLocale('StackTrace', () => {
  it('does not generate rows when there is no data', () => {
    const component = new ApplicationComponents.StackTrace.StackTrace();
    const rows = component.createRowTemplates();
    assert.deepEqual(rows, []);
  });

  it('generates rows from stack trace data', () => {
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
      frame: frame,
      buildStackTraceRows: mockBuildStackTraceRows,
    };

    assertShadowRoot(component.shadowRoot);
    const expandableList =
        getElementWithinComponent(component, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    assertShadowRoot(expandableList.shadowRoot);
    const expandButton = expandableList.shadowRoot.querySelector('button.arrow-icon-button');
    assertElement(expandButton, HTMLButtonElement);
    dispatchClickEvent(expandButton);

    const stackTraceRows = getElementsWithinComponent(
        expandableList, 'devtools-stack-trace-row', ApplicationComponents.StackTrace.StackTraceRow);
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assertShadowRoot(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1\xA0@\xA0www.example.com/script1.js',
      'function2\xA0@\xA0www.example.com/script2.js',
    ]);
  });

  it('hides hidden rows behind "show all" button', async () => {
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
      frame: frame,
      buildStackTraceRows: mockBuildStackTraceRows,
    };

    assertShadowRoot(component.shadowRoot);
    const expandableList =
        getElementWithinComponent(component, 'devtools-expandable-list', ExpandableList.ExpandableList.ExpandableList);
    assertShadowRoot(expandableList.shadowRoot);
    const expandButton = expandableList.shadowRoot.querySelector('button.arrow-icon-button');
    assertElement(expandButton, HTMLButtonElement);
    dispatchClickEvent(expandButton);
    await new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });

    const stackTraceRows = Array.from(expandableList.shadowRoot.querySelectorAll('[data-stack-trace-row]'));
    let stackTraceText: string[] = [];

    stackTraceRows.forEach(row => {
      assertShadowRoot(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1\xA0@\xA0www.example.com/script.js',
      'Show 1 more frame',
    ]);

    const stackTraceLinkButton = getElementWithinComponent(
        expandableList, 'devtools-stack-trace-link-button', ApplicationComponents.StackTrace.StackTraceLinkButton);
    assertShadowRoot(stackTraceLinkButton.shadowRoot);
    const showAllButton = stackTraceLinkButton.shadowRoot.querySelector('.stack-trace-row button.link');
    assertElement(showAllButton, HTMLButtonElement);
    dispatchClickEvent(showAllButton);

    const openedStackTraceRows = Array.from(expandableList.shadowRoot.querySelectorAll('[data-stack-trace-row]'));
    let openedStackTraceText: string[] = [];

    openedStackTraceRows.forEach(row => {
      assertShadowRoot(row.shadowRoot);
      openedStackTraceText =
          openedStackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(openedStackTraceText, [
      'function1\xA0@\xA0www.example.com/script.js',
      'function2\xA0@\xA0www.example.com/hidden.js',
      'Show less',
    ]);

    const newStackTraceLinkButton = getElementWithinComponent(
        expandableList, 'devtools-stack-trace-link-button', ApplicationComponents.StackTrace.StackTraceLinkButton);
    assertShadowRoot(newStackTraceLinkButton.shadowRoot);
    const showLessButton = newStackTraceLinkButton.shadowRoot.querySelector('.stack-trace-row button.link');
    assertElement(showLessButton, HTMLButtonElement);
    dispatchClickEvent(showLessButton);

    const reclosedStackTraceRows = Array.from(expandableList.shadowRoot.querySelectorAll('[data-stack-trace-row]'));
    stackTraceText = [];

    reclosedStackTraceRows.forEach(row => {
      assertShadowRoot(row.shadowRoot);
      stackTraceText = stackTraceText.concat(getCleanTextContentFromElements(row.shadowRoot, '.stack-trace-row'));
    });

    assert.deepEqual(stackTraceText, [
      'function1\xA0@\xA0www.example.com/script.js',
      'Show 1 more frame',
    ]);
  });
});
