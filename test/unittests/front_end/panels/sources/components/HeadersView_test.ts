// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../../front_end/core/host/host.js';
import * as Workspace from '../../../../../../front_end/models/workspace/workspace.js';
import * as SourcesComponents from '../../../../../../front_end/panels/sources/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchFocusEvent,
  dispatchFocusOutEvent,
  dispatchInputEvent,
  dispatchKeyDownEvent,
  dispatchPasteEvent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../helpers/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../../helpers/UISourceCodeHelpers.js';
import {recordedMetricsContain, resetRecordedMetrics} from '../../../helpers/UserMetricsHelpers.js';

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';

const {assert} = chai;
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describe('HeadersView', async () => {
  const commitWorkingCopySpy = sinon.spy();

  before(async () => {
    await initializeGlobalVars();
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  beforeEach(() => {
    commitWorkingCopySpy.resetHistory();
    resetRecordedMetrics();
  });

  async function renderEditor(): Promise<SourcesComponents.HeadersView.HeadersViewComponent> {
    const editor = new SourcesComponents.HeadersView.HeadersViewComponent();
    editor.data = {
      headerOverrides: [
        {
          applyTo: '*',
          headers: [
            {
              name: 'server',
              value: 'DevTools Unit Test Server',
            },
            {
              name: 'access-control-allow-origin',
              value: '*',
            },
          ],
        },
        {
          applyTo: '*.jpg',
          headers: [
            {
              name: 'jpg-header',
              value: 'only for jpg files',
            },
          ],
        },
      ],
      parsingError: false,
      uiSourceCode: {
        name: () => '.headers',
        setWorkingCopy: () => {},
        commitWorkingCopy: commitWorkingCopySpy,
      } as unknown as Workspace.UISourceCode.UISourceCode,
    };
    renderElementIntoDOM(editor);
    assertShadowRoot(editor.shadowRoot);
    await coordinator.done();
    return editor;
  }

  async function renderEditorWithinWrapper(): Promise<SourcesComponents.HeadersView.HeadersViewComponent> {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const headers = `[
      {
        "applyTo": "*",
        "headers": [
          {
            "name": "server",
            "value": "DevTools Unit Test Server"
          },
          {
            "name": "access-control-allow-origin",
            "value": "*"
          }
        ]
      },
      {
        "applyTo": "*.jpg",
        "headers": [{
          "name": "jpg-header",
          "value": "only for jpg files"
        }]
      }
    ]`;
    const {uiSourceCode, project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/example.html' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/html',
      content: headers,
    });
    uiSourceCode.commitWorkingCopy = commitWorkingCopySpy;
    project.canSetFileContent = () => true;

    const editorWrapper = new SourcesComponents.HeadersView.HeadersView(uiSourceCode);
    await uiSourceCode.requestContent();
    await coordinator.done();
    const editor = editorWrapper.getComponent();
    renderElementIntoDOM(editor);
    assertShadowRoot(editor.shadowRoot);
    await coordinator.done();
    workspace.removeProject(project);
    return editor;
  }

  async function changeEditable(editable: HTMLElement, value: string): Promise<void> {
    dispatchFocusEvent(editable, {bubbles: true});
    editable.innerText = value;
    dispatchInputEvent(editable, {inputType: 'insertText', data: value, bubbles: true, composed: true});
    dispatchFocusOutEvent(editable, {bubbles: true});
    await coordinator.done();
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));
  }

  async function pressButton(shadowRoot: ShadowRoot, rowIndex: number, selector: string): Promise<void> {
    const rowElements = shadowRoot.querySelectorAll('.row');
    const button = rowElements[rowIndex].querySelector(selector);
    assertElement(button, HTMLElement);
    button.click();
    await coordinator.done();
  }

  function getRowContent(shadowRoot: ShadowRoot): string[] {
    const rows = Array.from(shadowRoot.querySelectorAll('.row'));
    return rows.map(row => {
      return Array.from(row.querySelectorAll('div, .editable'))
          .map(element => (element as HTMLElement).innerText)
          .join('');
    });
  }

  function getSingleRowContent(shadowRoot: ShadowRoot, rowIndex: number): string {
    const rows = Array.from(shadowRoot.querySelectorAll('.row'));
    assert.isTrue(rows.length > rowIndex);
    return Array.from(rows[rowIndex].querySelectorAll('div, .editable'))
        .map(element => (element as HTMLElement).innerText)
        .join('');
  }

  function isWholeElementContentSelected(element: HTMLElement): boolean {
    const textContent = element.textContent;
    if (!textContent || textContent.length < 1 || !element.hasSelection()) {
      return false;
    }
    const selection = element.getComponentSelection();
    if (!selection || selection.rangeCount < 1) {
      return false;
    }
    if (selection.anchorNode !== selection.focusNode) {
      return false;
    }
    const range = selection.getRangeAt(0);
    return (range.endOffset - range.startOffset === textContent.length);
  }

  it('shows an error message when parsingError is true', async () => {
    const editor = new SourcesComponents.HeadersView.HeadersViewComponent();
    editor.data = {
      headerOverrides: [],
      parsingError: true,
      uiSourceCode: {
        name: () => '.headers',
      } as Workspace.UISourceCode.UISourceCode,
    };
    renderElementIntoDOM(editor);
    assertShadowRoot(editor.shadowRoot);
    await coordinator.done();

    const errorHeader = editor.shadowRoot.querySelector('.error-header');
    assert.strictEqual(errorHeader?.textContent, 'Error when parsing \'.headers\'.');
  });

  it('displays data and allows editing', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);

    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    const addRuleButton = editor.shadowRoot.querySelector('.add-block');
    assertElement(addRuleButton, HTMLElement);
    assert.strictEqual(addRuleButton.textContent?.trim(), 'Add override rule');

    const learnMoreLink = editor.shadowRoot.querySelector('.learn-more-row x-link');
    assertElement(learnMoreLink, HTMLElement);
    assert.strictEqual(learnMoreLink.title, 'https://goo.gle/devtools-override');

    const editables = editor.shadowRoot.querySelectorAll('.editable');
    await changeEditable(editables[0] as HTMLElement, 'index.html');
    await changeEditable(editables[1] as HTMLElement, 'content-type');
    await changeEditable(editables[4] as HTMLElement, 'example.com');
    await changeEditable(editables[7] as HTMLElement, 'is image');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:index.html',
      'content-type:DevTools Unit Test Server',
      'access-control-allow-origin:example.com',
      'Apply to:*.jpg',
      'jpg-header:is image',
    ]);
    assert.strictEqual(commitWorkingCopySpy.callCount, 4);
  });

  it('resets edited value to previous state on Escape key', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 1), 'server:DevTools Unit Test Server');

    const editables = editor.shadowRoot.querySelectorAll('.editable');
    assert.strictEqual(editables.length, 8);
    const headerValue = editables[2] as HTMLElement;
    headerValue.focus();
    headerValue.innerText = 'discard_me';
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 1), 'server:discard_me');

    dispatchKeyDownEvent(headerValue, {
      key: 'Escape',
      bubbles: true,
    });
    await coordinator.done();
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 1), 'server:DevTools Unit Test Server');

    const headerName = editables[1] as HTMLElement;
    headerName.focus();
    headerName.innerText = 'discard_me_2';
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 1), 'discard_me_2:DevTools Unit Test Server');

    dispatchKeyDownEvent(headerName, {
      key: 'Escape',
      bubbles: true,
    });
    await coordinator.done();
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 1), 'server:DevTools Unit Test Server');
  });

  it('selects the whole content when clicking on an editable field', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const editables = editor.shadowRoot.querySelectorAll('.editable');

    let element = editables[0] as HTMLElement;
    element.focus();
    assert.isTrue(isWholeElementContentSelected(element));

    element = editables[1] as HTMLElement;
    element.focus();
    assert.isTrue(isWholeElementContentSelected(element));

    element = editables[2] as HTMLElement;
    element.focus();
    assert.isTrue(isWholeElementContentSelected(element));
  });

  it('un-selects the content when an editable field loses focus', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const editables = editor.shadowRoot.querySelectorAll('.editable');

    const element = editables[0] as HTMLElement;
    element.focus();
    assert.isTrue(isWholeElementContentSelected(element));
    element.blur();
    assert.isFalse(element.hasSelection());
  });

  it('handles pressing \'Enter\' key by removing focus and moving it to the next field if possible', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const editables = editor.shadowRoot.querySelectorAll('.editable');
    assert.strictEqual(editables.length, 8);

    const lastHeaderName = editables[6] as HTMLSpanElement;
    const lastHeaderValue = editables[7] as HTMLSpanElement;
    assert.isFalse(lastHeaderName.hasSelection());
    assert.isFalse(lastHeaderValue.hasSelection());

    lastHeaderName.focus();
    assert.isTrue(isWholeElementContentSelected(lastHeaderName));
    assert.isFalse(lastHeaderValue.hasSelection());

    dispatchKeyDownEvent(lastHeaderName, {key: 'Enter', bubbles: true});
    assert.isFalse(lastHeaderName.hasSelection());
    assert.isTrue(isWholeElementContentSelected(lastHeaderValue));

    dispatchKeyDownEvent(lastHeaderValue, {key: 'Enter', bubbles: true});
    for (const editable of editables) {
      assert.isFalse(editable.hasSelection());
    }
  });

  it('sets empty \'ApplyTo\' to \'*\'', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const editables = editor.shadowRoot.querySelectorAll('.editable');
    assert.strictEqual(editables.length, 8);

    const applyTo = editables[5] as HTMLSpanElement;
    assert.strictEqual(applyTo.innerHTML, '*.jpg');

    applyTo.innerText = '';
    dispatchInputEvent(applyTo, {inputType: 'deleteContentBackward', data: null, bubbles: true});
    assert.strictEqual(applyTo.innerHTML, '');

    dispatchFocusOutEvent(applyTo, {bubbles: true});
    assert.strictEqual(applyTo.innerHTML, '*');
    assert.strictEqual(commitWorkingCopySpy.callCount, 1);
  });

  it('removes the entire header when the header name is deleted', async () => {
    const editor = await renderEditorWithinWrapper();
    assertShadowRoot(editor.shadowRoot);
    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    const editables = editor.shadowRoot.querySelectorAll('.editable');
    assert.strictEqual(editables.length, 8);

    const headerName = editables[1] as HTMLSpanElement;
    assert.strictEqual(headerName.innerHTML, 'server');

    headerName.innerText = '';
    dispatchInputEvent(headerName, {inputType: 'deleteContentBackward', data: null, bubbles: true});
    assert.strictEqual(headerName.innerHTML, '');

    dispatchFocusOutEvent(headerName, {bubbles: true});
    await coordinator.done();

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);
    assert.strictEqual(commitWorkingCopySpy.callCount, 1);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));
  });

  it('allows adding headers', async () => {
    const editor = await renderEditorWithinWrapper();
    await coordinator.done();
    assertShadowRoot(editor.shadowRoot);

    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    await pressButton(editor.shadowRoot, 1, '.add-header');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'header-name-1:header value',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));

    const editables = editor.shadowRoot.querySelectorAll('.editable');
    await changeEditable(editables[3] as HTMLElement, 'cache-control');
    await changeEditable(editables[4] as HTMLElement, 'max-age=1000');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'cache-control:max-age=1000',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);
  });

  it('allows adding "ApplyTo"-blocks', async () => {
    const editor = await renderEditorWithinWrapper();
    await coordinator.done();
    assertShadowRoot(editor.shadowRoot);

    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    const button = editor.shadowRoot.querySelector('.add-block');
    assertElement(button, HTMLElement);
    button.click();
    await coordinator.done();

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
      'Apply to:*',
      'header-name-1:header value',
    ]);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));

    const editables = editor.shadowRoot.querySelectorAll('.editable');
    await changeEditable(editables[8] as HTMLElement, 'articles/*');
    await changeEditable(editables[9] as HTMLElement, 'cache-control');
    await changeEditable(editables[10] as HTMLElement, 'max-age=1000');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
      'Apply to:articles/*',
      'cache-control:max-age=1000',
    ]);
  });

  it('allows removing headers', async () => {
    const editor = await renderEditorWithinWrapper();
    await coordinator.done();
    assertShadowRoot(editor.shadowRoot);

    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    await pressButton(editor.shadowRoot, 1, '.remove-header');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));

    let hiddenDeleteElements = await editor.shadowRoot.querySelectorAll('.row.padded > .remove-header[hidden]');
    assert.isTrue(hiddenDeleteElements.length === 0, 'remove-header button is visible');

    await pressButton(editor.shadowRoot, 1, '.remove-header');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'header-name-1:header value',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    hiddenDeleteElements = await editor.shadowRoot.querySelectorAll('.row.padded > .remove-header[hidden]');
    assert.isTrue(hiddenDeleteElements.length === 1, 'remove-header button is hidden');
  });

  it('allows removing "ApplyTo"-blocks', async () => {
    const editor = await renderEditorWithinWrapper();
    await coordinator.done();
    assertShadowRoot(editor.shadowRoot);

    let rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*',
      'server:DevTools Unit Test Server',
      'access-control-allow-origin:*',
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);

    await pressButton(editor.shadowRoot, 0, '.remove-block');

    rows = getRowContent(editor.shadowRoot);
    assert.deepEqual(rows, [
      'Apply to:*.jpg',
      'jpg-header:only for jpg files',
    ]);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));
  });

  it('removes formatting for pasted content', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const editables = editor.shadowRoot.querySelectorAll('.editable');
    assert.strictEqual(editables.length, 8);
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 2), 'access-control-allow-origin:*');

    const headerValue = editables[4] as HTMLSpanElement;
    headerValue.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', 'foo\nbar');
    dt.setData('text/html', 'This is <b>bold</b>');
    dispatchPasteEvent(headerValue, {clipboardData: dt, bubbles: true});
    await coordinator.done();
    assert.deepEqual(getSingleRowContent(editor.shadowRoot, 2), 'access-control-allow-origin:foo bar');
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeadersFileEdited));
  });

  it('shows context menu', async () => {
    const editor = await renderEditor();
    assertShadowRoot(editor.shadowRoot);
    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    editor.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    assert.isTrue(contextMenuShow.calledOnce);
  });
});
