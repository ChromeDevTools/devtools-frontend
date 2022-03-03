// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../front_end/core/common/common.js';
import * as CodeMirror from '../../../../../../front_end/third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../../../../../front_end/ui/components/text_editor/text_editor.js';
import {renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

function makeState(doc: string, extensions: CodeMirror.Extension = []) {
  return CodeMirror.EditorState.create({
    doc,
    extensions: [
      extensions,
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.autocompletion,
    ],
  });
}

describeWithEnvironment('TextEditor', () => {
  describe('component', () => {
    it('has a state property', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('one'));
      assert.strictEqual(editor.state.doc.toString(), 'one');
      editor.state = makeState('two');
      assert.strictEqual(editor.state.doc.toString(), 'two');
      renderElementIntoDOM(editor);
      assert.strictEqual(editor.editor.state.doc.toString(), 'two');
      editor.editor.dispatch({changes: {from: 3, insert: '!'}});
      editor.remove();
      assert.strictEqual(editor.editor.state.doc.toString(), 'two!');
    });

    it('sets an aria-label attribute', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));
      assert.strictEqual(editor.editor.contentDOM.getAttribute('aria-label'), 'Code editor');
    });

    it('can highlight whitespace', () => {
      const editor = new TextEditor.TextEditor.TextEditor(
          makeState('line1  \n  line2( )\n\tline3  ', TextEditor.Config.showWhitespace.instance()));
      renderElementIntoDOM(editor);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces').length, 0);
      Common.Settings.Settings.instance().moduleSetting('showWhitespacesInEditor').set('all');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces').length, 4);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedTab').length, 1);
      Common.Settings.Settings.instance().moduleSetting('showWhitespacesInEditor').set('trailing');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces').length, 0);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace').length, 2);
      Common.Settings.Settings.instance().moduleSetting('showWhitespacesInEditor').set('none');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces').length, 0);
      editor.remove();
    });
  });

  describe('configuration', () => {
    it('can guess indentation', () => {
      assert.strictEqual(
          TextEditor.Config.guessIndent(CodeMirror.Text.of(['hello():', '    world();', '    return;'])), '    ');
      assert.strictEqual(
          TextEditor.Config.guessIndent(CodeMirror.Text.of(['hello():', '\tworld();', '\treturn;'])), '\t');
    });

    it('can detect line separators', () => {
      assert.strictEqual(makeState('one\r\ntwo\r\nthree').lineBreak, '\r\n');
      assert.strictEqual(makeState('one\ntwo\nthree').lineBreak, '\n');
      assert.strictEqual(makeState('one\r\ntwo\nthree').lineBreak, '\n');
    });

    it('handles dynamic reconfiguration', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));
      renderElementIntoDOM(editor);

      assert.strictEqual(editor.state.facet(CodeMirror.indentUnit), '    ');
      Common.Settings.Settings.instance().moduleSetting('textEditorIndent').set('\t');
      assert.strictEqual(editor.state.facet(CodeMirror.indentUnit), '\t');
      Common.Settings.Settings.instance().moduleSetting('textEditorIndent').set('    ');
    });
  });

  describe('autocompletion', () => {
    it('can complete builtins and keywords', async () => {
      const state = makeState('c', CodeMirror.javascript.javascriptLanguage);
      const result =
          await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 1, false));
      assert.isNotNull(result);
      const completions = result ? result.options : [];
      assert.isTrue(completions.some(o => o.label === 'clear'));
      assert.isTrue(completions.some(o => o.label === 'continue'));
    });

    async function testQueryType(
        code: string,
        pos: number,
        type?: TextEditor.JavaScript.QueryType,
        range: string = '',
        related?: string,
        ): Promise<void> {
      const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
      const query = TextEditor.JavaScript.getQueryType(CodeMirror.syntaxTree(state), pos, state.doc);
      if (type === undefined) {
        assert.isNull(query);
      } else {
        assert.isNotNull(query);
        if (query) {
          assert.strictEqual(query.type, type);
          assert.strictEqual(code.slice(query.from ?? pos, pos), range);
          assert.strictEqual(query.relatedNode && code.slice(query.relatedNode.from, query.relatedNode.to), related);
        }
      }
    }

    it('recognizes expression queries', async () => {
      await testQueryType('foo', 3, TextEditor.JavaScript.QueryType.Expression, 'foo');
      await testQueryType('foo ', 4, TextEditor.JavaScript.QueryType.Expression, '');
      await testQueryType('let', 3, TextEditor.JavaScript.QueryType.Expression, 'let');
    });

    it('recognizes propery name queries', async () => {
      await testQueryType('foo.bar', 7, TextEditor.JavaScript.QueryType.PropertyName, 'bar', 'foo.bar');
      await testQueryType('foo.', 4, TextEditor.JavaScript.QueryType.PropertyName, '', 'foo.');
      await testQueryType('if (foo.', 8, TextEditor.JavaScript.QueryType.PropertyName, '', 'foo.');
      await testQueryType('foo.', 4, TextEditor.JavaScript.QueryType.PropertyName, '', 'foo.');
      await testQueryType('foo.\n', 5, TextEditor.JavaScript.QueryType.PropertyName, '', 'foo.');
      await testQueryType('new foo.bar().', 14, TextEditor.JavaScript.QueryType.PropertyName, '', 'new foo.bar().');
      await testQueryType('foo?.', 5, TextEditor.JavaScript.QueryType.PropertyName, '', 'foo?.');
      await testQueryType('foo?.b', 6, TextEditor.JavaScript.QueryType.PropertyName, 'b', 'foo?.b');
    });

    it('recognizes property expression queries', async () => {
      await testQueryType('foo[', 4, TextEditor.JavaScript.QueryType.PropertyExpression, '', 'foo[');
      await testQueryType('foo[ ', 5, TextEditor.JavaScript.QueryType.PropertyExpression, '', 'foo[');
      await testQueryType('foo["ba', 7, TextEditor.JavaScript.QueryType.PropertyExpression, '"ba', 'foo["ba');
    });

    describe('potential map key retrievals', () => {
      it('recognizes potential maps', async () => {
        await testQueryType('foo.get(', 8, TextEditor.JavaScript.QueryType.PotentiallyRetrievingFromMap, '', 'foo');
        await testQueryType('foo\n.get(', 9, TextEditor.JavaScript.QueryType.PotentiallyRetrievingFromMap, '', 'foo');
      });

      it('leaves other expressions as-is', async () => {
        await testQueryType('foo.method(', 11, TextEditor.JavaScript.QueryType.Expression);
        await testQueryType('5 + (', 5, TextEditor.JavaScript.QueryType.Expression);
        await testQueryType('functionCall(', 13, TextEditor.JavaScript.QueryType.Expression);
      });
    });

    it('does not complete in inappropriate places', async () => {
      await testQueryType('"foo bar"', 4);
      await testQueryType('x["foo" + "bar', 14);
      await testQueryType('// comment', 10);
    });
  });
});
