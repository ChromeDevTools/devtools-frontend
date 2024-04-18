// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import * as TextEditor from './text_editor.js';

function syntaxParserDone(view: CodeMirror.EditorView): Promise<void> {
  return new Promise(resolve => {
    (function check() {
      if (!CodeMirror.syntaxParserRunning(view)) {
        resolve();
      } else {
        window.requestIdleCallback(check);
      }
    })();
  });
}

describe('TextEditor', () => {
  describe('ExecutionPositionHighlighter', () => {
    const {positionHighlighter, setHighlightedPosition, clearHighlightedPosition} =
        TextEditor.ExecutionPositionHighlighter;

    function createEditorView({doc, extensions}: {doc: string, extensions?: CodeMirror.Extension}):
        CodeMirror.EditorView {
      if (extensions === undefined) {
        extensions = [];
      }
      extensions = [extensions, positionHighlighter('cm-executionLine', 'cm-executionToken')];
      const state = CodeMirror.EditorState.create({doc, extensions});
      const parent = renderElementIntoDOM(document.createElement('main'));
      return new CodeMirror.EditorView({state, parent});
    }

    describe('positionHighlighter', () => {
      it('defaults to no position highlighting with no syntax extensions', () => {
        const doc = 'This is some text';
        const view = createEditorView({doc});
        assert.isFalse(CodeMirror.syntaxParserRunning(view));

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 0);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 0);
      });

      it('defaults to no position highlighting with JavaScript syntax', async () => {
        const doc = 'console.log("Hello World!")';
        const extensions = CodeMirror.javascript.javascript();
        const view = createEditorView({doc, extensions});
        await syntaxParserDone(view);

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 0);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 0);
      });
    });

    describe('setHighlightedPosition', () => {
      it('highlights line but not token with no syntax extensions', () => {
        const doc = 'Hello world!';
        const view = createEditorView({doc});
        assert.isFalse(CodeMirror.syntaxParserRunning(view));

        view.dispatch({effects: setHighlightedPosition.of(doc.indexOf('world'))});

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 1);
        assert.strictEqual(view.dom.querySelector('.cm-executionLine')!.textContent, doc);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 0);
      });

      it('highlights line and token with JavaScript syntax', async () => {
        const doc = 'console.log("Hello World!")';
        const extensions = CodeMirror.javascript.javascript();
        const view = createEditorView({doc, extensions});
        await syntaxParserDone(view);

        view.dispatch({effects: setHighlightedPosition.of(doc.indexOf('log'))});

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 1);
        assert.strictEqual(view.dom.querySelector('.cm-executionLine')!.textContent, doc);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 1);
        assert.strictEqual(view.dom.querySelector('.cm-executionToken')!.textContent, 'log');
      });

      it('highlights line immediately with JavaScript syntax', () => {
        const doc = 'console.log("Hello World!");\n'.repeat(1000) + 'foo();';
        const extensions = CodeMirror.javascript.javascript();
        const view = createEditorView({doc, extensions});

        const position = doc.lastIndexOf('foo');
        view.dispatch({
          effects: [
            CodeMirror.EditorView.scrollIntoView(position),
            setHighlightedPosition.of(position),
          ],
        });
        assert.isTrue(CodeMirror.syntaxParserRunning(view));

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 1);
        assert.strictEqual(view.dom.querySelector('.cm-executionLine')!.textContent, doc.slice(position));
      });

      it('highlights token once incremental parser catches up with JavaScript syntax', async () => {
        const doc = 'console.log("Hello World!");\n'.repeat(1000) + 'foo();';
        const extensions = CodeMirror.javascript.javascript();
        const view = createEditorView({doc, extensions});

        const position = doc.lastIndexOf('foo');
        view.dispatch({
          effects: [
            CodeMirror.EditorView.scrollIntoView(position),
            setHighlightedPosition.of(position),
          ],
        });
        await syntaxParserDone(view);

        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 1);
        assert.strictEqual(view.dom.querySelector('.cm-executionToken')!.textContent, 'foo');
      });
    });

    describe('clearHighlightedPosition', () => {
      it('clears any highlighting with JavaScript syntax', async () => {
        const doc = 'console.log("Hello World!")';
        const extensions = CodeMirror.javascript.javascript();
        const view = createEditorView({doc, extensions});
        await syntaxParserDone(view);

        view.dispatch({effects: setHighlightedPosition.of(doc.indexOf('log'))});
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 1);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 1);

        view.dispatch({effects: clearHighlightedPosition.of()});
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionLine'), 0);
        assert.lengthOf(view.dom.querySelectorAll('.cm-executionToken'), 0);
      });
    });
  });
});
