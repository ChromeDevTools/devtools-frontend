// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, dispatchKeyDownEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as Sources from './sources.js';

function setCodeMirrorContent(editor: CodeMirror.EditorView, content: string) {
  editor.dispatch({
    changes: {from: 0, to: editor.state.doc.length, insert: content},
  });
}

async function getDialogAndEditor(
    editorLineNumber: number, oldCondition: string, isLogpoint: boolean,
    onFinish: (result: Sources.BreakpointEditDialog.BreakpointEditDialogResult) => void) {
  const dialog = new Sources.BreakpointEditDialog.BreakpointEditDialog();

  dialog.editorLineNumber = editorLineNumber;
  dialog.oldCondition = oldCondition;
  dialog.breakpointType =
      isLogpoint ? SDK.DebuggerModel.BreakpointType.LOGPOINT : SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT;
  dialog.onFinish = onFinish;

  await dialog.updateComplete;

  const textEditor = dialog.contentElement.querySelector('devtools-text-editor');
  assert.exists(textEditor);

  return {dialog, editor: textEditor.editor};
}

function setBreakpointType(
    dialog: Sources.BreakpointEditDialog.BreakpointEditDialog, newType: SDK.DebuggerModel.BreakpointType) {
  const selectElement = dialog.contentElement.querySelector<HTMLSelectElement>('devtools-toolbar select');
  selectElement!.value = newType;
  selectElement!.dispatchEvent(new Event('change'));
}

// Note that we currently don't install a fake RuntimeModel + ExecutionContext for these tests.
// This means the 'BreakpointEditDialog' won't be able to check whether the
// condition is a complete JavaScript expression or not and simply assume it is.
describeWithEnvironment('BreakpointEditDialog', function() {
  it('reports a committed condition when the Enter key is pressed', async () => {
    const resultPromise =
        new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async (resolve, reject) => {
          try {
            const {editor, dialog} = await getDialogAndEditor(0, '', false, resolve);
            setCodeMirrorContent(editor, 'x === 5');

            renderElementIntoDOM(dialog);
            await assertScreenshot('sources/breakpoint-edit-dialog.png');

            dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
          } catch (e) {
            reject(e);
          }
        });

    const {committed, condition} = await resultPromise;
    assert.isTrue(committed);
    assert.strictEqual(condition, 'x === 5');
  });

  it('does not report a commited condition when the ESC key is pressed', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async resolve => {
      const {editor} = await getDialogAndEditor(0, '', false, resolve);
      setCodeMirrorContent(editor, 'hello');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Escape'});
    });

    const {committed} = await resultPromise;
    assert.isFalse(committed);
  });

  it('commits condition when close button is clicked', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async resolve => {
      const {dialog, editor} = await getDialogAndEditor(0, '', false, resolve);
      setCodeMirrorContent(editor, 'x === 5');

      dialog.contentElement.querySelector<HTMLElement>('.dialog-header > devtools-icon')!.click();
    });

    const {committed, condition} = await resultPromise;
    assert.isTrue(committed);
    assert.strictEqual(condition, 'x === 5');
  });

  it('leaves the condition as-is for logpoints', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async resolve => {
      const {editor} = await getDialogAndEditor(0, '', true, resolve);
      setCodeMirrorContent(editor, 'x');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
    });

    const {condition} = await resultPromise;
    assert.strictEqual(condition, 'x');
  });

  it('result includes isLogpoint for logpoints', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async resolve => {
      const {editor} = await getDialogAndEditor(0, '', true, resolve);
      setCodeMirrorContent(editor, 'x');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
    });

    const {isLogpoint} = await resultPromise;
    assert.isTrue(isLogpoint);
  });

  it('result includes isLogpoint for conditional breakpoints', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(async resolve => {
      const {editor} = await getDialogAndEditor(0, '', false, resolve);
      setCodeMirrorContent(editor, 'x === 5');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
    });

    const {isLogpoint} = await resultPromise;
    assert.isFalse(isLogpoint);
  });

  it('prefills the input with the old condition', async () => {
    const {editor} = await getDialogAndEditor(0, 'x === 42', false, () => {});

    assert.strictEqual(editor.state.doc.sliceString(0), 'x === 42');
  });

  it('focuses the editor input field after changing the breakpoint type', async () => {
    const {dialog, editor} = await getDialogAndEditor(0, '', false, () => {});
    renderElementIntoDOM(dialog.contentElement);

    setBreakpointType(dialog, SDK.DebuggerModel.BreakpointType.LOGPOINT);
    await dialog.updateComplete;

    assert.isTrue(editor.hasFocus);

    dialog.contentElement.remove();  // Cleanup.
  });
});
