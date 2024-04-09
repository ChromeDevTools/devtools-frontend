// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  createFakeSetting,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import * as TextEditor from './text_editor.js';

const {Direction} = TextEditor.TextEditorHistory;

function setCodeMirrorContent(editor: CodeMirror.EditorView, content: string) {
  editor.dispatch({
    changes: {from: 0, to: editor.state.doc.length, insert: content},
  });
  assert.strictEqual(editor.state.doc.toString(), content);
}

function setCursorPosition(editor: CodeMirror.EditorView, pos: number) {
  editor.dispatch({
    selection: CodeMirror.EditorSelection.cursor(pos),
  });
  assert.strictEqual(editor.state.selection.main.head, pos);
}

describeWithEnvironment('TextEditorHistory', () => {
  let history: TextEditor.AutocompleteHistory.AutocompleteHistory;
  let editor: CodeMirror.EditorView;
  let textEditor: TextEditor.TextEditor.TextEditor;
  let editorHistory: TextEditor.TextEditorHistory.TextEditorHistory;

  beforeEach(() => {
    const setting = createFakeSetting('history', []);
    history = new TextEditor.AutocompleteHistory.AutocompleteHistory(setting);
    textEditor = new TextEditor.TextEditor.TextEditor();
    editor = textEditor.editor;  // Triggers actual editor creation.
    renderElementIntoDOM(textEditor);
    editorHistory = new TextEditor.TextEditorHistory.TextEditorHistory(textEditor, history);
  });

  afterEach(() => {
    // Manually remove the text editor from the DOM. The TextEditor
    // "disconnect" callback requires a settings environment.
    textEditor.remove();
  });

  describe('moveHistory', () => {
    it('can move through the history backwards', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      editorHistory.moveHistory(Direction.BACKWARD);

      assert.strictEqual(editor.state.doc.toString(), 'entry 2');
    });

    it('can move through the history forwards', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');
      editorHistory.moveHistory(Direction.BACKWARD);
      editorHistory.moveHistory(Direction.BACKWARD);

      editorHistory.moveHistory(Direction.FORWARD);

      assert.strictEqual(editor.state.doc.toString(), 'entry 2');
    });

    it('does not forget about the current input', () => {
      history.pushHistoryItem('entry 1');
      setCodeMirrorContent(editor, 'temporary content');

      editorHistory.moveHistory(Direction.BACKWARD);
      editorHistory.moveHistory(Direction.FORWARD);

      assert.strictEqual(editor.state.doc.toString(), 'temporary content');
    });

    it('does not go backwards if the cursor is not in the first line', () => {
      history.pushHistoryItem('entry 1');
      const editorText = 'first line\nsecond line';
      setCodeMirrorContent(editor, editorText);
      setCursorPosition(editor, editorText.length);

      assert.isFalse(editorHistory.moveHistory(Direction.BACKWARD));

      assert.strictEqual(editor.state.doc.toString(), editorText);
    });

    it('does go backwards if the cursor is not in the first line, but force is specified', () => {
      history.pushHistoryItem('entry 1');
      const editorText = 'first line\nsecond line';
      setCodeMirrorContent(editor, editorText);
      setCursorPosition(editor, editorText.length);

      assert.isTrue(editorHistory.moveHistory(Direction.BACKWARD, /* force */ true));

      assert.strictEqual(editor.state.doc.toString(), 'entry 1');
    });

    it('does not go forwards if the cursor is not in the last line', () => {
      history.pushHistoryItem('first line\nsecond line');
      editorHistory.moveHistory(Direction.BACKWARD);
      setCursorPosition(editor, 5);  // Somewhere on the first line.

      assert.isFalse(editorHistory.moveHistory(Direction.FORWARD));

      assert.strictEqual(editor.state.doc.toString(), 'first line\nsecond line');
    });

    it('does go forwards if the cursor is not in the last line, but force is specified', () => {
      history.pushHistoryItem('first line\nsecond line');
      editorHistory.moveHistory(Direction.BACKWARD);
      setCursorPosition(editor, 5);  // Somewhere on the first line.

      assert.isTrue(editorHistory.moveHistory(Direction.FORWARD, /* force */ true));

      assert.strictEqual(editor.state.doc.toString(), '');
    });

    it('sets the cursor to the end of the first line when moving backwards', () => {
      history.pushHistoryItem('first line\nsecond line');

      editorHistory.moveHistory(Direction.BACKWARD);

      assert.strictEqual(editor.state.selection.main.head, 10);
    });
  });

  describe('historyCompletions', () => {
    it('has no completions when there is no input and the user does not explicitly request completions', () => {
      history.pushHistoryItem('x == 5');

      const completions = editorHistory.historyCompletions(new CodeMirror.CompletionContext(editor.state, 0, false));

      assert.isNull(completions);
    });

    it('has completions when there is no input but the user explicitly requests completions', () => {
      history.pushHistoryItem('x == 5');

      const {options} = editorHistory.historyCompletions(new CodeMirror.CompletionContext(editor.state, 0, true))!;
      assert.lengthOf(options, 1);
    });

    it('has no completions if the caret is not at the end of the input', () => {
      history.pushHistoryItem('x === 5');
      setCodeMirrorContent(editor, 'x =');

      const completions = editorHistory.historyCompletions(new CodeMirror.CompletionContext(editor.state, 1, false));

      assert.isNull(completions);
    });

    it('has matching completions', () => {
      history.pushHistoryItem('x === 5');
      history.pushHistoryItem('y < 42');
      history.pushHistoryItem('x > 10');
      setCodeMirrorContent(editor, 'x ');

      const {options} = editorHistory.historyCompletions(new CodeMirror.CompletionContext(editor.state, 2, false))!;
      assert.lengthOf(options, 2);
      assert.strictEqual(options[0].label, 'x > 10');
      assert.strictEqual(options[1].label, 'x === 5');
    });
  });
});
