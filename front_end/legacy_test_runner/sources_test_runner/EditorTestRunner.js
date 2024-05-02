// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const createTestEditor = function(clientHeight, textEditorDelegate) {
  const textEditor =
      new SourceFrame.SourcesTextEditor(textEditorDelegate || new SourceFrame.SourcesTextEditorDelegate());
  clientHeight = clientHeight || 100;
  textEditor.element.style.height = clientHeight + 'px';
  textEditor.element.style.flex = 'none';
  textEditor.show(UI.InspectorView.InspectorView.instance().element);
  return textEditor;
};

function textWithSelection(text, selections) {
  if (!selections.length) {
    return text;
  }

  function lineWithCursor(line, column, cursorChar) {
    return line.substring(0, column) + cursorChar + line.substring(column);
  }

  const lines = text.split('\n');
  selections.sort(TextUtils.TextRange.TextRange.comparator);

  for (let i = selections.length - 1; i >= 0; --i) {
    let selection = selections[i];
    selection = selection.normalize();
    const endCursorChar = (selection.isEmpty() ? '|' : '<');
    lines[selection.endLine] = lineWithCursor(lines[selection.endLine], selection.endColumn, endCursorChar);

    if (!selection.isEmpty()) {
      lines[selection.startLine] = lineWithCursor(lines[selection.startLine], selection.startColumn, '>');
    }
  }

  return lines.join('\n');
}

export const dumpTextWithSelection = function(textEditor, dumpWhiteSpaces) {
  let text = textWithSelection(textEditor.text(), textEditor.selections());

  if (dumpWhiteSpaces) {
    text = text.replace(/ /g, '.');
  }

  TestRunner.addResult(text);
};

export const setLineSelections = function(editor, selections) {
  const coords = [];

  for (let i = 0; i < selections.length; ++i) {
    const selection = selections[i];

    if (typeof selection.column === 'number') {
      selection.from = selection.column;
      selection.to = selection.column;
    }

    coords.push(new TextUtils.TextRange.TextRange(selection.line, selection.from, selection.line, selection.to));
  }

  editor.setSelections(coords);
};

export const typeIn = function(editor, typeText, callback) {
  callback = callback || new Function();
  const noop = new Function();

  for (let charIndex = 0; charIndex < typeText.length; ++charIndex) {
    const iterationCallback = (charIndex + 1 === typeText.length ? callback : noop);

    switch (typeText[charIndex]) {
      case '\n':
        fakeKeyEvent(editor, 'Enter', null, iterationCallback);
        break;
      case 'L':
        fakeKeyEvent(editor, 'ArrowLeft', null, iterationCallback);
        break;
      case 'R':
        fakeKeyEvent(editor, 'ArrowRight', null, iterationCallback);
        break;
      case 'U':
        fakeKeyEvent(editor, 'ArrowUp', null, iterationCallback);
        break;
      case 'D':
        fakeKeyEvent(editor, 'ArrowDown', null, iterationCallback);
        break;
      default:
        fakeKeyEvent(editor, typeText[charIndex], null, iterationCallback);
    }
  }
};

const eventCodes = {
  Enter: 13,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40
};

function createCodeMirrorFakeEvent(editor, eventType, code, charCode, modifiers) {
  function eventPreventDefault() {
    this.handled = true;
  }

  const event = {
    _handled: false,
    type: eventType,
    keyCode: code,
    charCode: charCode,
    preventDefault: eventPreventDefault,
    stopPropagation: function() {},
    target: editor.codeMirror().display.input.textarea
  };

  if (modifiers) {
    for (let i = 0; i < modifiers.length; ++i) {
      event[modifiers[i]] = true;
    }
  }

  return event;
}

function fakeCodeMirrorKeyEvent(editor, eventType, code, charCode, modifiers) {
  const event = createCodeMirrorFakeEvent(editor, eventType, code, charCode, modifiers);

  switch (eventType) {
    case 'keydown':
      editor.codeMirror().triggerOnKeyDown(event);
      break;
    case 'keypress':
      editor.codeMirror().triggerOnKeyPress(event);
      break;
    case 'keyup':
      editor.codeMirror().triggerOnKeyUp(event);
      break;
    default:
      throw new Error('Unknown KeyEvent type');
  }

  return event.handled;
}

function fakeCodeMirrorInputEvent(editor, character) {
  if (typeof character !== 'string') {
    return;
  }
  const input = editor.codeMirror().display.input;
  const value = input.textarea.value;
  const newValue =
      value.substring(0, input.textarea.selectionStart) + character + value.substring(input.textarea.selectionEnd);
  const caretPosition = input.textarea.selectionStart + character.length;
  input.textarea.value = newValue;
  input.textarea.setSelectionRange(caretPosition, caretPosition);
  input.poll();
}

export const fakeKeyEvent = function(editor, originalCode, modifiers, callback) {
  modifiers = modifiers || [];
  let code;
  let charCode;

  if (originalCode === '\'') {
    code = 222;
    charCode = 0;
  } else if (originalCode === '"') {
    code = 222;
    modifiers.push('shiftKey');
    charCode = 34;
  } else if (originalCode === '(') {
    code = '9'.charCodeAt(0);
    modifiers.push('shiftKey');
    charCode = originalCode.charCodeAt(0);
  }

  code = code || eventCodes[originalCode] || originalCode;

  if (typeof code === 'string') {
    code = code.charCodeAt(0);
  }

  if (fakeCodeMirrorKeyEvent(editor, 'keydown', code, charCode, modifiers)) {
    callback();
    return;
  }

  if (fakeCodeMirrorKeyEvent(editor, 'keypress', code, charCode, modifiers)) {
    callback();
    return;
  }

  const inputReadPromise = new Promise(x => editor.codeMirror().on('inputRead', x));
  fakeCodeMirrorInputEvent(editor, originalCode);
  fakeCodeMirrorKeyEvent(editor, 'keyup', code, charCode, modifiers);
  inputReadPromise.then(callback);
};

export const dumpSelectionStats = function(textEditor) {
  const listHashMap = {};
  const sortedKeys = [];
  const selections = textEditor.selections();

  for (let i = 0; i < selections.length; ++i) {
    const selection = selections[i];
    const text = textEditor.text(selection);

    if (!listHashMap[text]) {
      listHashMap[text] = 1;
      sortedKeys.push(text);
    } else {
      ++listHashMap[text];
    }
  }

  for (let i = 0; i < sortedKeys.length; ++i) {
    let keyName = sortedKeys[i];

    if (!keyName.length) {
      keyName = '<Empty string>';
    } else {
      keyName = '\'' + keyName + '\'';
    }

    TestRunner.addResult(keyName + ': ' + listHashMap[sortedKeys[i]]);
  }
};
