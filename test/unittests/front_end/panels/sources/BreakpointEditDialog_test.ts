// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as CodeMirror from '../../../../../front_end/third_party/codemirror.next/codemirror.next.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import {dispatchKeyDownEvent} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

function setCodeMirrorContent(editor: CodeMirror.EditorView, content: string) {
  editor.dispatch({
    changes: {from: 0, to: editor.state.doc.length, insert: content},
  });
}

// Note that we currently don't install a fake RuntimeModel + ExecutionContext for these tests.
// This means the 'BreakpointEditDialog' won't be able to check whether the
// condition is a complete JavaScript expression or not and simply assume it is.
describeWithEnvironment('BreakpointEditDialog', () => {
  it('reports a committed condition when the Enter key is pressed', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(resolve => {
      const dialog = new Sources.BreakpointEditDialog.BreakpointEditDialog(0, '', false, resolve);
      const {editorForTest: {editor}} = dialog;
      setCodeMirrorContent(editor, 'x === 5');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
    });

    const {committed, condition} = await resultPromise;
    assert.isTrue(committed);
    assert.strictEqual(condition, 'x === 5');
  });

  it('does not report a commited condition when the ESC key is pressed', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(resolve => {
      const dialog = new Sources.BreakpointEditDialog.BreakpointEditDialog(0, '', false, resolve);
      const {editorForTest: {editor}} = dialog;
      setCodeMirrorContent(editor, 'hello');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Escape'});
    });

    const {committed} = await resultPromise;
    assert.isFalse(committed);
  });

  it('wraps the condition in a console.log for logpoints', async () => {
    const resultPromise = new Promise<Sources.BreakpointEditDialog.BreakpointEditDialogResult>(resolve => {
      const dialog = new Sources.BreakpointEditDialog.BreakpointEditDialog(0, '', true, resolve);
      const {editorForTest: {editor}} = dialog;
      setCodeMirrorContent(editor, 'x');

      dispatchKeyDownEvent(editor.contentDOM, {key: 'Enter'});
    });

    const {condition} = await resultPromise;
    assert.include(condition, 'console.log(x)');
  });

  it('prefills the input with the old condition', async () => {
    const dialog = new Sources.BreakpointEditDialog.BreakpointEditDialog(0, 'x === 42', false, () => {});
    const {editorForTest: {editor}} = dialog;

    assert.strictEqual(editor.state.doc.sliceString(0), 'x === 42');
  });
});
