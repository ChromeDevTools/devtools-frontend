// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {AiCodeGenerationParser, TextEditor} from './text_editor.js';

describe('AiCodeGenerationParser', () => {
  function createEditor(doc: string) {
    const editor = new TextEditor.TextEditor(
        CodeMirror.EditorState.create({
          doc,
          extensions: [
            CodeMirror.javascript.javascriptLanguage,
          ],
        }),
    );
    return editor;
  }

  describe('extractCommentText', () => {
    it('extracts text from a single-line comment', () => {
      const code = '// This is a test comment';
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.strictEqual(result?.text, 'This is a test comment');
    });

    it('extracts text from a single-line comment even with trailing whitespace', () => {
      const code = '// Spaced comment  \t ';
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.strictEqual(result?.text, 'Spaced comment');
    });

    it('extracts text from a block comment', () => {
      const code = '/* Simple block */';
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.strictEqual(result?.text, 'Simple block');
      assert.strictEqual(result?.to, code.length);
    });

    it('extracts text from a block comment if cursor in middle of the block', () => {
      const code = '/* Simple block */';
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, 5);
      assert.strictEqual(result?.text, 'Simple block');
      assert.strictEqual(result?.to, code.length);
    });

    it('cleans up multi-line block comments with leading asterisks', () => {
      const code = `/**
    * First line
    * Second line
    */`;
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.strictEqual(result?.text, 'First line\nSecond line');
    });

    it('returns undefined if the cursor is not at a comment', () => {
      const code = 'const x = 10;';
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.isUndefined(result);
    });

    it('handles unclosed block comments by returning undefined (syntax error)', () => {
      const code = `/**
* This is never closed`;
      const editor = createEditor(code);
      const result = AiCodeGenerationParser.AiCodeGenerationParser.extractCommentNodeInfo(editor.state, code.length);
      assert.isUndefined(result);
    });
  });
});
