/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';

import {TextEditorAutocompleteController} from './TextEditorAutocompleteController.js';

const UIStrings = {
  /**
  *@description Text in Code Mirror Text Editor of the CodeMirror text editor
  */
  codeEditor: 'Code editor',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/text_editor/CodeMirrorTextEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface Token {
  startColumn: number;
  endColumn: number;
  type: string;
}

export interface Coordinates {
  x: number;
  y: number;
  height: number;
}

// https://crbug.com/1151919 * = CodeMirror.Editor
const editorToDevtoolsWrapper = new WeakMap<any, CodeMirrorTextEditor>();

export class CodeMirrorTextEditor extends
    Common.ObjectWrapper.eventMixin<UI.TextEditor.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
        implements UI.TextEditor.TextEditor {
  private options: UI.TextEditor.Options;
  // https://crbug.com/1151919 * = CodeMirror.Editor
  private codeMirrorInternal: any;
  private readonly codeMirrorElement: HTMLElement;
  private shouldClearHistory: boolean;
  private lineSeparator: string;
  private hasOneLine!: boolean;
  // https://crbug.com/1151919 * = CodeMirror.TextMarker
  private readonly bookmarkForMarker: WeakMap<any, TextEditorBookMark>;
  private readonly selectNextOccurrenceController: SelectNextOccurrenceController;
  private readonly decorations: Platform.MapUtilities.Multimap<number, Decoration>;
  private needsRefresh: boolean;
  private readOnlyInternal: boolean;
  private mimeTypeInternal: string;
  private placeholderElement: HTMLPreElement|null;
  autocompleteController?: TextEditorAutocompleteController;
  private highlightedLine?: any;
  private clearHighlightTimeout?: number;
  private editorSizeInSync?: boolean;
  private lastSelectionInternal?: TextUtils.TextRange.TextRange;
  private selectionSetScheduled?: boolean;

  constructor(options: UI.TextEditor.Options) {
    super();
    this.options = options;

    this.registerRequiredCSS('third_party/codemirror/codemirror.css');
    this.registerRequiredCSS('ui/legacy/components/text_editor/cmdevtools.css');

    const {indentWithTabs, indentUnit} = CodeMirrorTextEditor.getIndentation(
        Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get());
    // @ts-ignore TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
    this.codeMirrorInternal = new CodeMirror(this.element, {
      screenReaderLabel: options.devtoolsAccessibleName || i18nString(UIStrings.codeEditor),
      lineNumbers: options.lineNumbers,
      smartIndent: true,
      electricChars: true,
      indentUnit,
      indentWithTabs,
      lineWrapping: options.lineWrapping,
      lineWiseCopyCut: options.lineWiseCopyCut || false,
      pollInterval: Math.pow(2, 31) - 1,
      matchBrackets: true,
      inputStyle: (options.inputStyle || 'devToolsAccessibleTextArea') as unknown as undefined,
      styleSelectedText: true,
      styleActiveLine: true,
      tabIndex: 0,
    });
    this.codeMirrorElement = this.element.lastElementChild as HTMLElement;

    editorToDevtoolsWrapper.set(this.codeMirrorInternal, this);

    Common.Settings.Settings.instance()
        .moduleSetting('textEditorIndent')
        .addChangeListener(this.updateIndentSize.bind(this));
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    CodeMirror.keyMap['devtools-common'] = {
      'Left': 'goCharLeft',
      'Right': 'goCharRight',
      'Up': 'goLineUp',
      'Down': 'goLineDown',
      'End': 'goLineEnd',
      'Home': 'goLineStartSmart',
      'PageUp': 'goSmartPageUp',
      'PageDown': 'goSmartPageDown',
      'Delete': 'delCharAfter',
      'Backspace': 'delCharBefore',
      'Tab': 'UserIndent',
      'Shift-Tab': 'indentLessOrPass',
      'Enter': 'newlineAndIndent',
      'Ctrl-Space': 'autocomplete',
      'Esc': 'dismiss',
      'Ctrl-M': 'gotoMatchingBracket',
    };
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    CodeMirror.keyMap['devtools-pc'] = {
      'Ctrl-A': 'selectAll',
      'Ctrl-Z': 'undoAndReveal',
      'Shift-Ctrl-Z': 'redoAndReveal',
      'Ctrl-Y': 'redo',
      'Ctrl-Home': 'goDocStart',
      'Ctrl-Up': 'goDocStart',
      'Ctrl-End': 'goDocEnd',
      'Ctrl-Down': 'goDocEnd',
      'Ctrl-Left': 'goGroupLeft',
      'Ctrl-Right': 'goGroupRight',
      'Alt-Left': 'moveCamelLeft',
      'Alt-Right': 'moveCamelRight',
      'Shift-Alt-Left': 'selectCamelLeft',
      'Shift-Alt-Right': 'selectCamelRight',
      'Ctrl-Backspace': 'delGroupBefore',
      'Ctrl-Delete': 'delGroupAfter',
      'Ctrl-/': 'toggleComment',
      'Ctrl-D': 'selectNextOccurrence',
      'Ctrl-U': 'undoLastSelection',
      fallthrough: 'devtools-common',
    };
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    CodeMirror.keyMap['devtools-mac'] = {
      'Cmd-A': 'selectAll',
      'Cmd-Z': 'undoAndReveal',
      'Shift-Cmd-Z': 'redoAndReveal',
      'Cmd-Up': 'goDocStart',
      'Cmd-Down': 'goDocEnd',
      'Alt-Left': 'goGroupLeft',
      'Alt-Right': 'goGroupRight',
      'Ctrl-Left': 'moveCamelLeft',
      'Ctrl-Right': 'moveCamelRight',
      'Ctrl-A': 'goLineLeft',
      'Ctrl-E': 'goLineRight',
      'Ctrl-B': 'goCharLeft',
      'Ctrl-F': 'goCharRight',
      'Ctrl-Alt-B': 'goGroupLeft',
      'Ctrl-Alt-F': 'goGroupRight',
      'Ctrl-H': 'delCharBefore',
      'Ctrl-D': 'delCharAfter',
      'Ctrl-K': 'killLine',
      'Ctrl-T': 'transposeChars',
      'Ctrl-P': 'goLineUp',
      'Ctrl-N': 'goLineDown',
      'Shift-Ctrl-Left': 'selectCamelLeft',
      'Shift-Ctrl-Right': 'selectCamelRight',
      'Cmd-Left': 'goLineStartSmart',
      'Cmd-Right': 'goLineEnd',
      'Cmd-Backspace': 'delLineLeft',
      'Alt-Backspace': 'delGroupBefore',
      'Alt-Delete': 'delGroupAfter',
      'Cmd-/': 'toggleComment',
      'Cmd-D': 'selectNextOccurrence',
      'Cmd-U': 'undoLastSelection',
      fallthrough: 'devtools-common',
    };

    if (options.bracketMatchingSetting) {
      options.bracketMatchingSetting.addChangeListener(this.enableBracketMatchingIfNeeded, this);
    }
    this.enableBracketMatchingIfNeeded();

    this.codeMirrorInternal.setOption('keyMap', Host.Platform.isMac() ? 'devtools-mac' : 'devtools-pc');

    this.codeMirrorInternal.setOption('flattenSpans', false);

    let maxHighlightLength = options.maxHighlightLength;
    if (typeof maxHighlightLength !== 'number') {
      maxHighlightLength = CodeMirrorTextEditor.maxHighlightLength;
    }
    this.codeMirrorInternal.setOption('maxHighlightLength', maxHighlightLength);
    this.codeMirrorInternal.setOption('mode', null);
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    this.codeMirrorInternal.setOption('crudeMeasuringFrom', 1000);

    this.shouldClearHistory = true;
    this.lineSeparator = '\n';

    this.bookmarkForMarker = new WeakMap();

    CodeMirrorTextEditor.fixWordMovement(this.codeMirrorInternal);

    this.selectNextOccurrenceController = new SelectNextOccurrenceController(this, this.codeMirrorInternal);

    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    this.codeMirrorInternal.on('changes', this.changes.bind(this));
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    this.codeMirrorInternal.on('beforeSelectionChange', this.beforeSelectionChange.bind(this));
    this.codeMirrorInternal.on('cursorActivity', () => {
      this.dispatchEventToListeners(UI.TextEditor.Events.CursorChanged);
    });

    this.element.style.overflow = 'hidden';
    this.codeMirrorElement.classList.add('source-code');
    this.codeMirrorElement.classList.add('fill');

    this.decorations = new Platform.MapUtilities.Multimap();

    this.element.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    this.element.addEventListener('keydown', this.handlePostKeyDown.bind(this), false);

    this.needsRefresh = true;

    this.readOnlyInternal = false;

    this.mimeTypeInternal = '';
    if (options.mimeType) {
      this.setMimeType(options.mimeType);
    }
    if (options.autoHeight) {
      this.codeMirrorInternal.setSize(null, 'auto');
    }

    this.placeholderElement = null;
    if (options.placeholder) {
      this.placeholderElement = document.createElement('pre');
      this.placeholderElement.classList.add('placeholder-text');
      this.placeholderElement.classList.add('CodeMirror-line-like');
      this.placeholderElement.textContent = options.placeholder;
      this.updatePlaceholder();
    }
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static getForCodeMirror(codeMirrorEditor: any): CodeMirrorTextEditor {
    const wrapper = editorToDevtoolsWrapper.get(codeMirrorEditor);
    if (!wrapper) {
      throw new Error('CodeMirrorTextEditor not found');
    }
    return wrapper;
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static autocompleteCommand(codeMirror: any): void {
    const autocompleteController = CodeMirrorTextEditor.getForCodeMirror(codeMirror).autocompleteController;
    if (autocompleteController) {
      autocompleteController.autocomplete(true);
    }
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static undoLastSelectionCommand(codeMirror: any): void {
    CodeMirrorTextEditor.getForCodeMirror(codeMirror).selectNextOccurrenceController.undoLastSelection();
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static selectNextOccurrenceCommand(codeMirror: any): void {
    CodeMirrorTextEditor.getForCodeMirror(codeMirror).selectNextOccurrenceController.selectNextOccurrence();
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static moveCamelLeftCommand(shift: boolean, codeMirror: any): void {
    CodeMirrorTextEditor.getForCodeMirror(codeMirror).doCamelCaseMovement(-1, shift);
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  static moveCamelRightCommand(shift: boolean, codeMirror: any): void {
    CodeMirrorTextEditor.getForCodeMirror(codeMirror).doCamelCaseMovement(1, shift);
  }

  private static getIndentation(indentationValue: string): {
    indentWithTabs: boolean,
    indentUnit: number,
  } {
    const indentWithTabs = /\t/.test(indentationValue);
    const indentUnit = indentWithTabs ? 4 : indentationValue.length;
    return {indentWithTabs, indentUnit};
  }

  static overrideModeWithPrefixedTokens(modeName: string, tokenPrefix: string): void {
    const oldModeName = modeName + '-old';
    if (CodeMirror.modes[oldModeName]) {
      return;
    }

    CodeMirror.defineMode(oldModeName, CodeMirror.modes[modeName]);
    CodeMirror.defineMode(modeName, modeConstructor);

    // @ts-ignore TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
    function modeConstructor(config: any, parserConfig: any): any {
      // TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
      const innerConfig: any = {};
      for (const i in parserConfig) {
        innerConfig[i] = parserConfig[i];
      }
      innerConfig.name = oldModeName;
      const codeMirrorMode = CodeMirror.getMode(config, innerConfig);
      codeMirrorMode.name = modeName;
      if (typeof codeMirrorMode.token === 'undefined') {
        throw new Error('codeMirrorMode.token was unexpectedly undefined');
      }
      codeMirrorMode.token = getTokenFunction(codeMirrorMode.token);
      return codeMirrorMode;
    }

    function getTokenFunction(superToken: (arg0: any, arg1: any) => string | null): (stream: any, state: any) =>
        string | null {
      function childFunc(stream: any, state: any): string|null {
        return tokenOverride(superToken, stream, state);
      }

      return childFunc;
    }
    function tokenOverride(superToken: (arg0: any, arg1: any) => string | null, stream: any, state: any): string|null {
      const token = superToken(stream, state);
      return token ? tokenPrefix + token.split(/ +/).join(' ' + tokenPrefix) : token;
    }
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  private static fixWordMovement(codeMirror: any): void {
    // https://crbug.com/1151919 * = CodeMirror.Editor
    function moveLeft(shift: boolean, codeMirror: any): void {
      codeMirror.setExtending(shift);
      const cursor = codeMirror.getCursor('head');
      codeMirror.execCommand('goGroupLeft');
      const newCursor = codeMirror.getCursor('head');
      if (newCursor.ch === 0 && newCursor.line !== 0) {
        codeMirror.setExtending(false);
        return;
      }

      const skippedText = codeMirror.getRange(newCursor, cursor, '#');
      if (/^\s+$/.test(skippedText)) {
        codeMirror.execCommand('goGroupLeft');
      }
      codeMirror.setExtending(false);
    }

    // https://crbug.com/1151919 * = CodeMirror.Editor
    function moveRight(shift: boolean, codeMirror: any): void {
      codeMirror.setExtending(shift);
      const cursor = codeMirror.getCursor('head');
      codeMirror.execCommand('goGroupRight');
      const newCursor = codeMirror.getCursor('head');
      if (newCursor.ch === 0 && newCursor.line !== 0) {
        codeMirror.setExtending(false);
        return;
      }

      const skippedText = codeMirror.getRange(cursor, newCursor, '#');
      if (/^\s+$/.test(skippedText)) {
        codeMirror.execCommand('goGroupRight');
      }
      codeMirror.setExtending(false);
    }

    const modifierKey = Host.Platform.isMac() ? 'Alt' : 'Ctrl';
    const leftKey = modifierKey + '-Left';
    const rightKey = modifierKey + '-Right';
    const keyMap: {[key: string]: Function} = {};
    keyMap[leftKey] = moveLeft.bind(null, false);
    keyMap[rightKey] = moveRight.bind(null, false);
    keyMap['Shift-' + leftKey] = moveLeft.bind(null, true);
    keyMap['Shift-' + rightKey] = moveRight.bind(null, true);
    codeMirror.addKeyMap(keyMap);
  }

  // https://crbug.com/1151919 * = CodeMirror.Editor
  codeMirror(): any {
    // https://crbug.com/1151919 * = CodeMirror.Editor
    return /** @type {*} */ this.codeMirrorInternal as any;
  }

  widget(): UI.Widget.Widget {
    return this;
  }

  setPlaceholder(placeholder: string): void {
    if (!this.placeholderElement) {
      this.placeholderElement = document.createElement('pre');
      this.placeholderElement.classList.add('placeholder-text');
      this.placeholderElement.classList.add('CodeMirror-line-like');
    }
    this.placeholderElement.textContent = placeholder || '';
    this.updatePlaceholder();
  }

  private normalizePositionForOverlappingColumn(lineNumber: number, lineLength: number, charNumber: number): {
    lineNumber: number,
    columnNumber: number,
  } {
    const linesCount = this.codeMirrorInternal.lineCount();
    let columnNumber: number|0 = charNumber;
    if (charNumber < 0 && lineNumber > 0) {
      --lineNumber;
      columnNumber = this.line(lineNumber).length;
    } else if (charNumber >= lineLength && lineNumber < linesCount - 1) {
      ++lineNumber;
      columnNumber = 0;
    } else {
      columnNumber = Platform.NumberUtilities.clamp(charNumber, 0, lineLength);
    }
    return {lineNumber: lineNumber, columnNumber: columnNumber};
  }

  private camelCaseMoveFromPosition(lineNumber: number, columnNumber: number, direction: number): {
    lineNumber: number,
    columnNumber: number,
  } {
    function valid(charNumber: number, length: number): boolean {
      return charNumber >= 0 && charNumber < length;
    }

    function isWordStart(text: string, charNumber: number): boolean {
      const position = charNumber;
      const nextPosition = charNumber + 1;
      return valid(position, text.length) && valid(nextPosition, text.length) &&
          TextUtils.TextUtils.Utils.isWordChar(text[position]) &&
          TextUtils.TextUtils.Utils.isWordChar(text[nextPosition]) &&
          TextUtils.TextUtils.Utils.isUpperCase(text[position]) &&
          TextUtils.TextUtils.Utils.isLowerCase(text[nextPosition]);
    }

    function isWordEnd(text: string, charNumber: number): boolean {
      const position = charNumber;
      const prevPosition = charNumber - 1;
      return valid(position, text.length) && valid(prevPosition, text.length) &&
          TextUtils.TextUtils.Utils.isWordChar(text[position]) &&
          TextUtils.TextUtils.Utils.isWordChar(text[prevPosition]) &&
          TextUtils.TextUtils.Utils.isUpperCase(text[position]) &&
          TextUtils.TextUtils.Utils.isLowerCase(text[prevPosition]);
    }

    function constrainPosition(lineNumber: number, lineLength: number, columnNumber: number): {
      lineNumber: number,
      columnNumber: number,
    } {
      return {lineNumber: lineNumber, columnNumber: Platform.NumberUtilities.clamp(columnNumber, 0, lineLength)};
    }

    const text = this.line(lineNumber);
    const length = text.length;

    if ((columnNumber === length && direction === 1) || (columnNumber === 0 && direction === -1)) {
      return this.normalizePositionForOverlappingColumn(lineNumber, length, columnNumber + direction);
    }

    let charNumber = direction === 1 ? columnNumber : columnNumber - 1;

    // Move through initial spaces if any.
    while (valid(charNumber, length) && TextUtils.TextUtils.Utils.isSpaceChar(text[charNumber])) {
      charNumber += direction;
    }
    if (!valid(charNumber, length)) {
      return constrainPosition(lineNumber, length, charNumber);
    }

    if (TextUtils.TextUtils.Utils.isStopChar(text[charNumber])) {
      while (valid(charNumber, length) && TextUtils.TextUtils.Utils.isStopChar(text[charNumber])) {
        charNumber += direction;
      }
      if (!valid(charNumber, length)) {
        return constrainPosition(lineNumber, length, charNumber);
      }
      return {lineNumber: lineNumber, columnNumber: direction === -1 ? charNumber + 1 : charNumber};
    }

    charNumber += direction;
    while (valid(charNumber, length) && !isWordStart(text, charNumber) && !isWordEnd(text, charNumber) &&
           TextUtils.TextUtils.Utils.isWordChar(text[charNumber])) {
      charNumber += direction;
    }

    if (!valid(charNumber, length)) {
      return constrainPosition(lineNumber, length, charNumber);
    }
    if (isWordStart(text, charNumber) || isWordEnd(text, charNumber)) {
      return {lineNumber: lineNumber, columnNumber: charNumber};
    }

    return {lineNumber: lineNumber, columnNumber: direction === -1 ? charNumber + 1 : charNumber};
  }

  private doCamelCaseMovement(direction: number, shift: boolean): void {
    const selections = this.selections();
    for (let i = 0; i < selections.length; ++i) {
      const selection = selections[i];
      const move = this.camelCaseMoveFromPosition(selection.endLine, selection.endColumn, direction);
      selection.endLine = move.lineNumber;
      selection.endColumn = move.columnNumber;
      if (!shift) {
        selections[i] = selection.collapseToEnd();
      }
    }
    this.setSelections(selections);
  }

  dispose(): void {
    if (this.options.bracketMatchingSetting) {
      this.options.bracketMatchingSetting.removeChangeListener(this.enableBracketMatchingIfNeeded, this);
    }
  }

  private enableBracketMatchingIfNeeded(): void {
    this.codeMirrorInternal.setOption(
        // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
        'autoCloseBrackets',
        (this.options.bracketMatchingSetting && this.options.bracketMatchingSetting.get()) ? {explode: false} : false);
  }

  wasShown(): void {
    if (this.needsRefresh) {
      this.refresh();
    }
  }

  protected refresh(): void {
    if (this.isShowing()) {
      this.codeMirrorInternal.refresh();
      this.needsRefresh = false;
      return;
    }
    this.needsRefresh = true;
  }

  willHide(): void {
    delete this.editorSizeInSync;
  }

  undo(): void {
    this.codeMirrorInternal.undo();
  }

  redo(): void {
    this.codeMirrorInternal.redo();
  }

  private handleKeyDown(e: Event): void {
    const keyboardEvent = e as KeyboardEvent;
    if (keyboardEvent.key === 'Tab' &&
        Common.Settings.Settings.instance().moduleSetting('textEditorTabMovesFocus').get()) {
      keyboardEvent.consume(false);
      return;
    }
    if (this.autocompleteController && this.autocompleteController.keyDown(keyboardEvent)) {
      keyboardEvent.consume(true);
    }
  }

  private handlePostKeyDown(e: Event): void {
    if (e.defaultPrevented) {
      e.consume(true);
    }
  }

  configureAutocomplete(config: UI.TextEditor.AutocompleteConfig|null): void {
    if (this.autocompleteController) {
      this.autocompleteController.dispose();
      delete this.autocompleteController;
    }

    if (config) {
      this.autocompleteController = new TextEditorAutocompleteController(this, this.codeMirrorInternal, config);
    }
  }

  cursorPositionToCoordinates(lineNumber: number, column: number): Coordinates|null {
    if (lineNumber >= this.codeMirrorInternal.lineCount() || lineNumber < 0 || column < 0 ||
        column > this.codeMirrorInternal.getLine(lineNumber).length) {
      return null;
    }
    const metrics = this.codeMirrorInternal.cursorCoords(new CodeMirror.Pos(lineNumber, column));
    return {x: metrics.left, y: metrics.top, height: metrics.bottom - metrics.top};
  }

  coordinatesToCursorPosition(x: number, y: number): TextUtils.TextRange.TextRange|null {
    const element = this.element.ownerDocument.elementFromPoint(x, y);
    if (!element || !element.isSelfOrDescendant(this.codeMirrorInternal.getWrapperElement())) {
      return null;
    }
    const gutterBox = this.codeMirrorInternal.getGutterElement().boxInWindow();
    if (x >= gutterBox.x && x <= gutterBox.x + gutterBox.width && y >= gutterBox.y &&
        y <= gutterBox.y + gutterBox.height) {
      return null;
    }
    const coords = this.codeMirrorInternal.coordsChar({left: x, top: y});
    return TextUtils.CodeMirrorUtils.toRange(coords, coords);
  }

  visualCoordinates(lineNumber: number, columnNumber: number): {
    x: number,
    y: number,
  } {
    const metrics = this.codeMirrorInternal.cursorCoords(new CodeMirror.Pos(lineNumber, columnNumber));
    return {x: metrics.left, y: metrics.top};
  }

  tokenAtTextPosition(lineNumber: number, columnNumber: number): Token|null {
    if (lineNumber < 0 || lineNumber >= this.codeMirrorInternal.lineCount()) {
      return null;
    }
    const token = this.codeMirrorInternal.getTokenAt(new CodeMirror.Pos(lineNumber, (columnNumber || 0) + 1));
    if (!token) {
      return null;
    }
    return {startColumn: token.start, endColumn: token.end, type: token.type as string};
  }

  isClean(generation: number): boolean {
    return this.codeMirrorInternal.isClean(generation);
  }

  markClean(): number {
    return this.codeMirrorInternal.changeGeneration(true);
  }

  private hasLongLines(): boolean {
    function lineIterator(lineHandle: {
      text: string,
    }): boolean {
      if (lineHandle.text.length > CodeMirrorTextEditor.LongLineModeLineLengthThreshold) {
        hasLongLines = true;
      }
      return hasLongLines;
    }
    let hasLongLines = false;
    this.codeMirrorInternal.eachLine(lineIterator);
    return hasLongLines;
  }

  private enableLongLinesMode(): void {
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    this.codeMirrorInternal.setOption('styleSelectedText', false);
  }

  private disableLongLinesMode(): void {
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    this.codeMirrorInternal.setOption('styleSelectedText', true);
  }

  private updateIndentSize(updatedValue: {
    data: any,
  }): void {
    const {indentWithTabs, indentUnit} = CodeMirrorTextEditor.getIndentation(updatedValue.data as string);

    this.codeMirrorInternal.setOption('indentUnit', indentUnit);
    this.codeMirrorInternal.setOption('indentWithTabs', indentWithTabs);
  }

  setMimeType(mimeType: string): void {
    this.mimeTypeInternal = mimeType;

    const rewrittenMimeType = this.rewriteMimeType(mimeType);
    const modeOption = this.codeMirrorInternal.getOption('mode');
    if (modeOption !== rewrittenMimeType) {
      this.codeMirrorInternal.setOption('mode', rewrittenMimeType);
    }
  }

  setHighlightMode(mode: Object): void {
    this.mimeTypeInternal = '';
    this.codeMirrorInternal.setOption('mode', mode);
  }

  protected rewriteMimeType(mimeType: string): string {
    // Overridden in SourcesTextEditor
    return mimeType;
  }

  protected mimeType(): string {
    return this.mimeTypeInternal;
  }

  setReadOnly(readOnly: boolean): void {
    if (this.readOnlyInternal === readOnly) {
      return;
    }
    this.clearPositionHighlight();
    this.readOnlyInternal = readOnly;
    this.element.classList.toggle('CodeMirror-readonly', readOnly);
    this.codeMirrorInternal.setOption('readOnly', readOnly);
  }

  readOnly(): boolean {
    return Boolean(this.codeMirrorInternal.getOption('readOnly'));
  }

  setLineNumberFormatter(formatter: (arg0: number) => string): void {
    this.codeMirrorInternal.setOption('lineNumberFormatter', formatter);
  }

  addKeyDownHandler(handler: (arg0: KeyboardEvent) => void): void {
    this.codeMirrorInternal.on(
        'keydown', /**
    * @param {*} CodeMirror
    * @param {!KeyboardEvent} event
    */
        (CodeMirror: any, event: KeyboardEvent) => handler(event));
  }

  addBookmark(lineNumber: number, columnNumber: number, element: HTMLElement, type: symbol, insertBefore?: boolean):
      TextEditorBookMark {
    const marker = this.codeMirrorInternal.setBookmark(
        new CodeMirror.Pos(lineNumber, columnNumber), {widget: element, insertLeft: insertBefore});

    const bookmark = new TextEditorBookMark(marker, type, this);
    this.bookmarkForMarker.set(marker, bookmark);
    this.updateDecorations(lineNumber);
    return bookmark;
  }

  bookmarks(range: TextUtils.TextRange.TextRange, type?: symbol): TextEditorBookMark[] {
    const pos = TextUtils.CodeMirrorUtils.toPos(range);
    let markers = this.codeMirrorInternal.findMarksAt(pos.start);
    if (!range.isEmpty()) {
      const middleMarkers = this.codeMirrorInternal.findMarks(pos.start, pos.end);
      const endMarkers = this.codeMirrorInternal.findMarksAt(pos.end);
      markers = markers.concat(middleMarkers, endMarkers);
    }
    const bookmarks: TextEditorBookMark[] = [];
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const bookmark = this.bookmarkForMarker.get(marker);
      if (bookmark && (!type || bookmark.type() === type)) {
        bookmarks.push(bookmark);
      }
    }
    return bookmarks;
  }

  focus(): void {
    this.codeMirrorInternal.focus();
  }

  hasFocus(): boolean {
    return this.codeMirrorInternal.hasFocus();
  }

  operation(operation: () => any): void {
    this.codeMirrorInternal.operation(operation);
  }

  scrollLineIntoView(lineNumber: number): void {
    this.innerRevealLine(lineNumber, this.codeMirrorInternal.getScrollInfo());
  }

  innerRevealLine(lineNumber: number, scrollInfo: {
    left: number,
    top: number,
    width: number,
    height: number,
    clientWidth: number,
    clientHeight: number,
  }): void {
    const topLine = this.codeMirrorInternal.lineAtHeight(scrollInfo.top, 'local');
    const bottomLine = this.codeMirrorInternal.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
    const linesPerScreen = bottomLine - topLine + 1;
    if (lineNumber < topLine) {
      const topLineToReveal = Math.max(lineNumber - (linesPerScreen / 2) + 1, 0) | 0;
      this.codeMirrorInternal.scrollIntoView(new CodeMirror.Pos(topLineToReveal, 0));
    } else if (lineNumber > bottomLine) {
      const bottomLineToReveal = Math.min(lineNumber + (linesPerScreen / 2) - 1, this.linesCount - 1) | 0;
      this.codeMirrorInternal.scrollIntoView(new CodeMirror.Pos(bottomLineToReveal, 0));
    }
  }

  addDecoration(element: HTMLElement, lineNumber: number, startColumn?: number, endColumn?: number): void {
    const widget = this.codeMirrorInternal.addLineWidget(lineNumber, element);
    let update: (() => void)|null = null;
    if (typeof startColumn !== 'undefined') {
      if (typeof endColumn === 'undefined') {
        endColumn = Infinity;
      }
      update = this.updateFloatingDecoration.bind(this, element, lineNumber, startColumn, endColumn);
      update();
    }

    this.decorations.set(lineNumber, {element: element, update: update, widget: widget});
  }

  private updateFloatingDecoration(element: HTMLElement, lineNumber: number, startColumn: number, endColumn: number):
      void {
    const base = this.codeMirrorInternal.cursorCoords(new CodeMirror.Pos(lineNumber, 0), 'page');
    const start = this.codeMirrorInternal.cursorCoords(new CodeMirror.Pos(lineNumber, startColumn), 'page');
    const end = this.codeMirrorInternal.charCoords(new CodeMirror.Pos(lineNumber, endColumn), 'page');
    element.style.width = (end.right - start.left) + 'px';
    element.style.left = (start.left - base.left) + 'px';
  }

  updateDecorations(lineNumber: number): void {
    this.decorations.get(lineNumber).forEach(innerUpdateDecorations);

    function innerUpdateDecorations(decoration: Decoration): void {
      if (decoration.update) {
        decoration.update();
      }
    }
  }

  removeDecoration(element: Element, lineNumber: number): void {
    this.decorations.get(lineNumber).forEach(innerRemoveDecoration.bind(this));

    function innerRemoveDecoration(this: CodeMirrorTextEditor, decoration: Decoration): void {
      if (decoration.element !== element) {
        return;
      }
      this.codeMirrorInternal.removeLineWidget(decoration.widget);
      this.decorations.delete(lineNumber, decoration);
    }
  }

  revealPosition(lineNumber: number, columnNumber?: number, shouldHighlight?: boolean): void {
    lineNumber = Platform.NumberUtilities.clamp(lineNumber, 0, this.codeMirrorInternal.lineCount() - 1);
    if (typeof columnNumber !== 'number') {
      columnNumber = 0;
    }
    columnNumber = Platform.NumberUtilities.clamp(columnNumber, 0, this.codeMirrorInternal.getLine(lineNumber).length);

    this.clearPositionHighlight();
    this.highlightedLine = this.codeMirrorInternal.getLineHandle(lineNumber);
    if (!this.highlightedLine) {
      return;
    }
    this.scrollLineIntoView(lineNumber);
    if (shouldHighlight) {
      this.codeMirrorInternal.addLineClass(
          this.highlightedLine, null, this.readOnlyInternal ? 'cm-readonly-highlight' : 'cm-highlight');
      if (!this.readOnlyInternal) {
        this.clearHighlightTimeout = window.setTimeout(this.clearPositionHighlight.bind(this), 2000);
      }
    }
    this.setSelection(TextUtils.TextRange.TextRange.createFromLocation(lineNumber, columnNumber));
  }

  clearPositionHighlight(): void {
    if (this.clearHighlightTimeout) {
      clearTimeout(this.clearHighlightTimeout);
    }
    delete this.clearHighlightTimeout;

    if (this.highlightedLine) {
      this.codeMirrorInternal.removeLineClass(
          // @ts-ignore the `null` argument should be a string?
          this.highlightedLine, null, this.readOnlyInternal ? 'cm-readonly-highlight' : 'cm-highlight');
    }
    delete this.highlightedLine;
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [];
  }

  private updatePaddingBottom(width: number, height: number): void {
    let newPaddingBottom = 0;
    const linesElement = this.codeMirrorElement.getElementsByClassName('CodeMirror-lines')[0] as HTMLElement;

    if (this.options.padBottom) {
      const scrollInfo = this.codeMirrorInternal.getScrollInfo();
      const lineCount = this.codeMirrorInternal.lineCount();
      if (lineCount > 1) {
        newPaddingBottom =
            // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
            Math.max(
                scrollInfo.clientHeight -
                    this.codeMirrorInternal.getLineHandle(this.codeMirrorInternal.lastLine()).height,
                0);
      }
    }
    const stringPaddingBottomValue = String(newPaddingBottom) + 'px';
    if (linesElement.style.paddingBottom !== stringPaddingBottomValue) {
      linesElement.style.paddingBottom = stringPaddingBottomValue;
      this.codeMirrorInternal.setSize(width, height);
    }
  }

  toggleScrollPastEof(enableScrolling: boolean): void {
    if (this.options.padBottom === enableScrolling) {
      return;
    }

    this.options.padBottom = enableScrolling;
    this.resizeEditor();
  }

  private resizeEditor(): void {
    const parentElement = this.element.parentElement;
    if (!parentElement || !this.isShowing()) {
      return;
    }
    this.codeMirrorInternal.operation(() => {
      const scrollLeft = this.codeMirrorInternal.doc.scrollLeft;
      const scrollTop = this.codeMirrorInternal.doc.scrollTop;
      const width = parentElement.offsetWidth;
      const height = parentElement.offsetHeight - this.element.offsetTop;
      if (this.options.autoHeight) {
        this.codeMirrorInternal.setSize(width, 'auto');
      } else {
        this.codeMirrorInternal.setSize(width, height);
        this.updatePaddingBottom(width, height);
      }
      this.codeMirrorInternal.scrollTo(scrollLeft, scrollTop);
    });
  }

  onResize(): void {
    if (this.autocompleteController) {
      this.autocompleteController.clearAutocomplete();
    }
    this.resizeEditor();
    this.editorSizeInSync = true;
    if (this.selectionSetScheduled) {
      delete this.selectionSetScheduled;
      if (this.lastSelectionInternal) {
        this.setSelection(this.lastSelectionInternal);
      }
    }
  }

  editRange(range: TextUtils.TextRange.TextRange, text: string, origin?: string): TextUtils.TextRange.TextRange {
    const pos = TextUtils.CodeMirrorUtils.toPos(range);
    this.codeMirrorInternal.replaceRange(text, pos.start, pos.end, origin);
    const newRange = TextUtils.CodeMirrorUtils.toRange(
        pos.start, this.codeMirrorInternal.posFromIndex(this.codeMirrorInternal.indexFromPos(pos.start) + text.length));
    this.dispatchEventToListeners(UI.TextEditor.Events.TextChanged, {oldRange: range, newRange: newRange});
    return newRange;
  }

  clearAutocomplete(): void {
    if (this.autocompleteController) {
      this.autocompleteController.clearAutocomplete();
    }
  }

  wordRangeForCursorPosition(lineNumber: number, column: number, isWordChar: (arg0: string) => boolean):
      TextUtils.TextRange.TextRange {
    const line = this.line(lineNumber);
    let wordStart: number = column;
    if (column !== 0 && isWordChar(line.charAt(column - 1))) {
      wordStart = column - 1;
      while (wordStart > 0 && isWordChar(line.charAt(wordStart - 1))) {
        --wordStart;
      }
    }
    let wordEnd = column;
    while (wordEnd < line.length && isWordChar(line.charAt(wordEnd))) {
      ++wordEnd;
    }
    return new TextUtils.TextRange.TextRange(lineNumber, wordStart, lineNumber, wordEnd);
  }

  // https://crbug.com/1151919 first * = CodeMirror.Editor, second * = CodeMirror.EditorChangeLinkedList
  private changes(codeMirror: any, changes: any): void {
    if (!changes.length) {
      return;
    }

    this.updatePlaceholder();

    // We do not show "scroll beyond end of file" span for one line documents, so we need to check if "document has one line" changed.
    const hasOneLine = this.codeMirrorInternal.lineCount() === 1;
    if (hasOneLine !== this.hasOneLine) {
      this.resizeEditor();
    }
    this.hasOneLine = hasOneLine;

    this.decorations.valuesArray().forEach(decoration => this.codeMirrorInternal.removeLineWidget(decoration.widget));
    this.decorations.clear();

    const edits = [];
    let currentEdit;

    for (let changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
      const changeObject = changes[changeIndex];
      const edit = TextUtils.CodeMirrorUtils.changeObjectToEditOperation(changeObject);
      if (currentEdit && edit.oldRange.equal(currentEdit.newRange)) {
        currentEdit.newRange = edit.newRange;
      } else {
        currentEdit = edit;
        edits.push(currentEdit);
      }
    }

    for (let i = 0; i < edits.length; i++) {
      this.dispatchEventToListeners(
          UI.TextEditor.Events.TextChanged, {oldRange: edits[i].oldRange, newRange: edits[i].newRange});
    }
  }

  // https://crbug.com/1151919 first * = CodeMirror.Editor, second and third * = CodeMirror.Pos
  private beforeSelectionChange(_codeMirror: any, _selection: {
    ranges: Array<{
      head: any,
      anchor: any,
    }>,
  }): void {
    this.selectNextOccurrenceController.selectionWillChange();
  }

  scrollToLine(lineNumber: number): void {
    const pos = new CodeMirror.Pos(lineNumber, 0);
    const coords = this.codeMirrorInternal.charCoords(pos, 'local');
    this.codeMirrorInternal.scrollTo(0, coords.top);
  }

  firstVisibleLine(): number {
    return this.codeMirrorInternal.lineAtHeight(this.codeMirrorInternal.getScrollInfo().top, 'local');
  }

  scrollTop(): number {
    return this.codeMirrorInternal.getScrollInfo().top;
  }

  setScrollTop(scrollTop: number): void {
    this.codeMirrorInternal.scrollTo(0, scrollTop);
  }

  lastVisibleLine(): number {
    const scrollInfo = this.codeMirrorInternal.getScrollInfo();
    return this.codeMirrorInternal.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
  }

  selection(): TextUtils.TextRange.TextRange {
    const start = this.codeMirrorInternal.getCursor('anchor');
    const end = this.codeMirrorInternal.getCursor('head');

    return TextUtils.CodeMirrorUtils.toRange(start, end);
  }

  selections(): TextUtils.TextRange.TextRange[] {
    const selectionList = this.codeMirrorInternal.listSelections();
    const result = [];
    for (let i = 0; i < selectionList.length; ++i) {
      const selection = selectionList[i];
      result.push(TextUtils.CodeMirrorUtils.toRange(selection.anchor, selection.head));
    }
    return result;
  }

  lastSelection(): TextUtils.TextRange.TextRange|null {
    return this.lastSelectionInternal || null;
  }

  setSelection(textRange: TextUtils.TextRange.TextRange, dontScroll?: boolean): void {
    this.lastSelectionInternal = textRange;
    if (!this.editorSizeInSync) {
      this.selectionSetScheduled = true;
      return;
    }
    const pos = TextUtils.CodeMirrorUtils.toPos(textRange);
    // https://crbug.com/1151919 both * = CodeMirror.Position
    const startAsPosition = (pos.start as any);
    const endAsPosition = (pos.end as any);
    const scroll = !dontScroll;
    this.codeMirrorInternal.setSelection(startAsPosition, endAsPosition, {scroll});
  }

  setSelections(ranges: TextUtils.TextRange.TextRange[], primarySelectionIndex?: number): void {
    const selections = [];
    for (let i = 0; i < ranges.length; ++i) {
      const selection = TextUtils.CodeMirrorUtils.toPos(ranges[i]);
      selections.push({anchor: selection.start, head: selection.end});
    }
    primarySelectionIndex = primarySelectionIndex || 0;
    this.codeMirrorInternal.setSelections(selections, primarySelectionIndex, {scroll: false});
  }

  private detectLineSeparator(text: string): void {
    this.lineSeparator = text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  }

  setText(text: string): void {
    if (text.length > CodeMirrorTextEditor.MaxEditableTextSize) {
      this.configureAutocomplete(null);
      this.setReadOnly(true);
    }
    this.codeMirrorInternal.setValue(text);
    if (this.shouldClearHistory) {
      this.codeMirrorInternal.clearHistory();
      this.shouldClearHistory = false;
    }
    this.detectLineSeparator(text);

    if (this.hasLongLines()) {
      this.enableLongLinesMode();
    } else {
      this.disableLongLinesMode();
    }

    if (!this.isShowing()) {
      this.refresh();
    }
  }

  text(textRange?: TextUtils.TextRange.TextRange): string {
    if (!textRange) {
      return this.codeMirrorInternal.getValue(this.lineSeparator);
    }
    const pos = TextUtils.CodeMirrorUtils.toPos(textRange.normalize());
    return this.codeMirrorInternal.getRange(pos.start, pos.end, this.lineSeparator);
  }

  textWithCurrentSuggestion(): string {
    if (!this.autocompleteController) {
      return this.text();
    }
    return this.autocompleteController.textWithCurrentSuggestion();
  }

  fullRange(): TextUtils.TextRange.TextRange {
    const lineCount = this.linesCount;
    const lastLine = this.codeMirrorInternal.getLine(lineCount - 1);
    return TextUtils.CodeMirrorUtils.toRange(
        new CodeMirror.Pos(0, 0), new CodeMirror.Pos(lineCount - 1, lastLine.length));
  }

  currentLineNumber(): number {
    return this.codeMirrorInternal.getCursor().line;
  }

  line(lineNumber: number): string {
    return this.codeMirrorInternal.getLine(lineNumber);
  }

  get linesCount(): number {
    return this.codeMirrorInternal.lineCount();
  }

  newlineAndIndent(): void {
    this.codeMirrorInternal.execCommand('newlineAndIndent');
  }

  textEditorPositionHandle(lineNumber: number, columnNumber: number): TextEditorPositionHandle {
    return new CodeMirrorPositionHandle(this.codeMirrorInternal, new CodeMirror.Pos(lineNumber, columnNumber));
  }

  private updatePlaceholder(): void {
    if (!this.placeholderElement) {
      return;
    }

    this.placeholderElement.remove();

    if (this.linesCount === 1 && !this.line(0)) {
      // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
      this.codeMirrorInternal.display.lineSpace.insertBefore(
          // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
          this.placeholderElement, this.codeMirrorInternal.display.lineSpace.firstChild);
    }
  }

  static readonly maxHighlightLength = 1000;
  static readonly LongLineModeLineLengthThreshold = 2000;
  static readonly MaxEditableTextSize = 1024 * 1024 * 10;
}

CodeMirrorTextEditor.overrideModeWithPrefixedTokens('css', 'css-');
CodeMirrorTextEditor.overrideModeWithPrefixedTokens('javascript', 'js-');
CodeMirrorTextEditor.overrideModeWithPrefixedTokens('xml', 'xml-');

// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.autocomplete = CodeMirrorTextEditor.autocompleteCommand;
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.undoLastSelection = CodeMirrorTextEditor.undoLastSelectionCommand;
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.selectNextOccurrence = CodeMirrorTextEditor.selectNextOccurrenceCommand;
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.moveCamelLeft = CodeMirrorTextEditor.moveCamelLeftCommand.bind(null, false);
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.selectCamelLeft = CodeMirrorTextEditor.moveCamelLeftCommand.bind(null, true);
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.moveCamelRight = CodeMirrorTextEditor.moveCamelRightCommand.bind(null, false);
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.selectCamelRight = CodeMirrorTextEditor.moveCamelRightCommand.bind(null, true);

// @ts-ignore https://crbug.com/1151919 * = CodeMirror.Editor
CodeMirror.commands.UserIndent = function(codeMirror: any): void {
  const ranges = codeMirror.listSelections();
  if (ranges.length === 0) {
    return;
  }

  if (codeMirror.somethingSelected()) {
    codeMirror.indentSelection('add');
    return;
  }

  const indentation = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
  codeMirror.replaceSelection(indentation);
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore TS doesn't find the property even though it's defined in codemirror-legacy.d.ts
CodeMirror.commands.indentLessOrPass = function(codeMirror: any): Object|undefined {
  const selections = codeMirror.listSelections();
  if (selections.length === 1) {
    const range = TextUtils.CodeMirrorUtils.toRange(selections[0].anchor, selections[0].head);
    if (range.isEmpty() && !/^\s/.test(codeMirror.getLine(range.startLine))) {
      return CodeMirror.Pass;
    }
  }
  codeMirror.execCommand('indentLess');
  return undefined;
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.gotoMatchingBracket = function(codeMirror: any): void {
  const updatedSelections = [];
  const selections = codeMirror.listSelections();
  for (let i = 0; i < selections.length; ++i) {
    const selection = selections[i];
    const cursor = selection.head;
    // @ts-ignore findMatchingBracket types are incorrect
    const matchingBracket = codeMirror.findMatchingBracket(cursor, false, {maxScanLines: 10000});
    let updatedHead = cursor;
    if (matchingBracket && matchingBracket.match) {
      const columnCorrection = CodeMirror.cmpPos(matchingBracket.from, cursor) === 0 ? 1 : 0;
      updatedHead = new CodeMirror.Pos(matchingBracket.to.line, matchingBracket.to.ch + columnCorrection);
    }
    updatedSelections.push({anchor: updatedHead, head: updatedHead});
  }
  codeMirror.setSelections(updatedSelections);
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.undoAndReveal = function(codemirror: any): void {
  const scrollInfo = codemirror.getScrollInfo();
  codemirror.execCommand('undo');
  const cursor = codemirror.getCursor('start');
  CodeMirrorTextEditor.getForCodeMirror(codemirror).innerRevealLine(cursor.line, scrollInfo);
  const autocompleteController = CodeMirrorTextEditor.getForCodeMirror(codemirror).autocompleteController;
  if (autocompleteController) {
    autocompleteController.clearAutocomplete();
  }
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.redoAndReveal = function(codemirror: any): void {
  const scrollInfo = codemirror.getScrollInfo();
  codemirror.execCommand('redo');
  const cursor = codemirror.getCursor('start');
  CodeMirrorTextEditor.getForCodeMirror(codemirror).innerRevealLine(cursor.line, scrollInfo);
  const autocompleteController = CodeMirrorTextEditor.getForCodeMirror(codemirror).autocompleteController;
  if (autocompleteController) {
    autocompleteController.clearAutocomplete();
  }
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.dismiss = function(codemirror: any): Object|undefined {
  const selections = codemirror.listSelections();
  const selection = selections[0];
  if (selections.length === 1) {
    if (TextUtils.CodeMirrorUtils.toRange(selection.anchor, selection.head).isEmpty()) {
      return CodeMirror.Pass;
    }
    codemirror.setSelection(selection.anchor, selection.anchor, {scroll: false});
    CodeMirrorTextEditor.getForCodeMirror(codemirror).scrollLineIntoView(selection.anchor.line);
    return;
  }

  codemirror.setSelection(selection.anchor, selection.head, {scroll: false});
  CodeMirrorTextEditor.getForCodeMirror(codemirror).scrollLineIntoView(selection.anchor.line);
  return undefined;
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.goSmartPageUp = function(codemirror: any): Object|undefined {
  if (CodeMirrorTextEditor.getForCodeMirror(codemirror)
          .selection()
          .equal(TextUtils.TextRange.TextRange.createFromLocation(0, 0))) {
    return CodeMirror.Pass;
  }
  codemirror.execCommand('goPageUp');
  return undefined;
};

// https://crbug.com/1151919 * = CodeMirror.Editor
// @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
CodeMirror.commands.goSmartPageDown = function(codemirror: any): Object|undefined {
  if (CodeMirrorTextEditor.getForCodeMirror(codemirror)
          .selection()
          .equal(CodeMirrorTextEditor.getForCodeMirror(codemirror).fullRange().collapseToEnd())) {
    return CodeMirror.Pass;
  }
  codemirror.execCommand('goPageDown');
  return undefined;
};

export class CodeMirrorPositionHandle implements TextEditorPositionHandle {
  private readonly codeMirror: any;
  private readonly lineHandle: any;
  private readonly columnNumber: any;
  // https://crbug.com/1151919 first * = CodeMirror.Editor, second * = CodeMirror.Pos
  constructor(codeMirror: any, pos: any) {
    this.codeMirror = codeMirror;
    this.lineHandle = codeMirror.getLineHandle(pos.line);
    this.columnNumber = pos.ch;
  }

  resolve(): {
    lineNumber: number,
    columnNumber: number,
  }|null {
    const lineNumber = this.lineHandle ? this.codeMirror.getLineNumber(this.lineHandle) : null;
    if (typeof lineNumber !== 'number') {
      return null;
    }
    return {lineNumber: lineNumber, columnNumber: this.columnNumber};
  }

  equal(argPositionHandle: TextEditorPositionHandle): boolean {
    const positionHandle = argPositionHandle as CodeMirrorPositionHandle;
    return positionHandle.lineHandle === this.lineHandle && positionHandle.columnNumber === this.columnNumber &&
        positionHandle.codeMirror === this.codeMirror;
  }
}

export class SelectNextOccurrenceController {
  private readonly textEditor: CodeMirrorTextEditor;
  private readonly codeMirror: any;
  private muteSelectionListener?: boolean;
  private fullWordSelection?: boolean;
  // https://crbug.com/1151919 * = CodeMirror.Editor
  constructor(textEditor: CodeMirrorTextEditor, codeMirror: any) {
    this.textEditor = textEditor;
    this.codeMirror = codeMirror;
  }

  selectionWillChange(): void {
    if (!this.muteSelectionListener) {
      delete this.fullWordSelection;
    }
  }

  private findRange(selections: TextUtils.TextRange.TextRange[], range: TextUtils.TextRange.TextRange): boolean {
    for (let i = 0; i < selections.length; ++i) {
      if (range.equal(selections[i])) {
        return true;
      }
    }
    return false;
  }

  undoLastSelection(): void {
    this.muteSelectionListener = true;
    this.codeMirror.execCommand('undoSelection');
    this.muteSelectionListener = false;
  }

  selectNextOccurrence(): void {
    const selections = this.textEditor.selections();
    let anyEmptySelection = false;
    for (let i = 0; i < selections.length; ++i) {
      const selection = selections[i];
      anyEmptySelection = anyEmptySelection || selection.isEmpty();
      if (selection.startLine !== selection.endLine) {
        return;
      }
    }
    if (anyEmptySelection) {
      this.expandSelectionsToWords(selections);
      return;
    }

    const last = selections[selections.length - 1];
    let next: (TextUtils.TextRange.TextRange|null)|TextUtils.TextRange.TextRange = last;
    do {
      next = next ? this.findNextOccurrence(next, Boolean(this.fullWordSelection)) : null;
    } while (next && this.findRange(selections, next) && !next.equal(last));

    if (!next) {
      return;
    }
    selections.push(next);

    this.muteSelectionListener = true;
    this.textEditor.setSelections(selections, selections.length - 1);
    delete this.muteSelectionListener;

    this.textEditor.scrollLineIntoView(next.startLine);
  }

  private expandSelectionsToWords(selections: TextUtils.TextRange.TextRange[]): void {
    const newSelections = [];
    for (let i = 0; i < selections.length; ++i) {
      const selection = selections[i];
      const startRangeWord = this.textEditor.wordRangeForCursorPosition(
                                 selection.startLine, selection.startColumn, TextUtils.TextUtils.Utils.isWordChar) ||
          TextUtils.TextRange.TextRange.createFromLocation(selection.startLine, selection.startColumn);
      const endRangeWord = this.textEditor.wordRangeForCursorPosition(
                               selection.endLine, selection.endColumn, TextUtils.TextUtils.Utils.isWordChar) ||
          TextUtils.TextRange.TextRange.createFromLocation(selection.endLine, selection.endColumn);
      const newSelection = new TextUtils.TextRange.TextRange(
          startRangeWord.startLine, startRangeWord.startColumn, endRangeWord.endLine, endRangeWord.endColumn);
      newSelections.push(newSelection);
    }
    this.textEditor.setSelections(newSelections, newSelections.length - 1);
    this.fullWordSelection = true;
  }

  private findNextOccurrence(range: TextUtils.TextRange.TextRange, fullWord: boolean): TextUtils.TextRange.TextRange
      |null {
    range = range.normalize();
    let matchedLineNumber: number|undefined = undefined;
    let matchedColumnNumber: number|undefined = undefined;
    const textToFind = this.textEditor.text(range);
    function findWordInLine(
        wordRegex: RegExp, lineNumber: number, lineText: string, from: number, to: number): boolean {
      if (typeof matchedLineNumber === 'number') {
        return true;
      }
      wordRegex.lastIndex = from;
      const result = wordRegex.exec(lineText);
      if (!result || result.index + textToFind.length > to) {
        return false;
      }
      matchedLineNumber = lineNumber;
      matchedColumnNumber = result.index;
      return true;
    }

    let iteratedLineNumber: number;
    // https://crbug.com/1151919 * = CodeMirror.LineHandle
    function lineIterator(regex: RegExp, lineHandle: any): true|undefined {
      if (findWordInLine(regex, iteratedLineNumber++, lineHandle.text, 0, lineHandle.text.length)) {
        return true;
      }
      return undefined;
    }

    let regexSource = Platform.StringUtilities.escapeForRegExp(textToFind);
    if (fullWord) {
      regexSource = '\\b' + regexSource + '\\b';
    }
    const wordRegex = new RegExp(regexSource, 'g');
    const currentLineText = this.codeMirror.getLine(range.startLine);

    findWordInLine(wordRegex, range.startLine, currentLineText, range.endColumn, currentLineText.length);
    iteratedLineNumber = range.startLine + 1;
    this.codeMirror.eachLine(range.startLine + 1, this.codeMirror.lineCount(), lineIterator.bind(null, wordRegex));
    iteratedLineNumber = 0;
    this.codeMirror.eachLine(0, range.startLine, lineIterator.bind(null, wordRegex));
    findWordInLine(wordRegex, range.startLine, currentLineText, 0, range.startColumn);

    if (typeof matchedLineNumber !== 'number' || typeof matchedColumnNumber !== 'number') {
      return null;
    }
    const textToFindLength = textToFind ? textToFind.length : 0;
    return new TextUtils.TextRange.TextRange(
        matchedLineNumber as number, matchedColumnNumber as number, matchedLineNumber as number,
        matchedColumnNumber + textToFindLength);
  }
}

/**
 * @interface
 */
export interface TextEditorPositionHandle {
  resolve(): {
    lineNumber: number,
    columnNumber: number,
  }|null;

  equal(positionHandle: TextEditorPositionHandle): boolean;
}

export class TextEditorBookMark {
  private readonly marker: any;
  private readonly typeInternal: symbol;
  private readonly editor: CodeMirrorTextEditor;
  // https://crbug.com/1151919 * = CodeMirror.TextMarker
  constructor(marker: any, type: symbol, editor: CodeMirrorTextEditor) {
    this.marker = marker;
    this.typeInternal = type;
    this.editor = editor;
  }

  clear(): void {
    const position = this.marker.find();
    this.marker.clear();
    if (position) {
      // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
      this.editor.updateDecorations(position.line);
    }
  }

  refresh(): void {
    this.marker.changed();
    const position = this.marker.find();
    if (position) {
      // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
      this.editor.updateDecorations(position.line);
    }
  }

  type(): symbol {
    return this.typeInternal;
  }

  position(): TextUtils.TextRange.TextRange|null {
    const pos = this.marker.find();
    // @ts-ignore https://crbug.com/1151919 CodeMirror types are incorrect
    return pos ? TextUtils.TextRange.TextRange.createFromLocation(pos.line, pos.ch) : null;
  }
}
let codeMirrorTextEditorFactoryInstance: CodeMirrorTextEditorFactory;

export class CodeMirrorTextEditorFactory implements UI.TextEditor.TextEditorFactory {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): CodeMirrorTextEditorFactory {
    const {forceNew} = opts;
    if (!codeMirrorTextEditorFactoryInstance || forceNew) {
      codeMirrorTextEditorFactoryInstance = new CodeMirrorTextEditorFactory();
    }

    return codeMirrorTextEditorFactoryInstance;
  }
  createEditor(options: UI.TextEditor.Options): CodeMirrorTextEditor {
    return new CodeMirrorTextEditor(options);
  }
}

// CodeMirror uses an offscreen <textarea> to detect input. Due to inconsistencies in the many browsers it supports,
// it simplifies things by regularly checking if something is in the textarea, adding those characters to the document,
// and then clearing the textarea. This breaks assistive technology that wants to read from CodeMirror, because the
// <textarea> that they interact with is constantly empty.
// Because we target up-to-date Chrome, we can guarantee consistent input events. This lets us leave the current
// line from the editor in our <textarea>. CodeMirror still expects a mostly empty <textarea>, so we pass CodeMirror a
// fake <textarea> that only contains the users input.
// @ts-ignore
export class DevToolsAccessibleTextArea extends CodeMirror.inputStyles.textarea {
  textarea!: HTMLTextAreaElement;
  contextMenuPending: boolean;
  composing: boolean;
  cm: any;
  prevInput!: string;

  // https://crbug.com/1151919 * = CodeMirror.Editor
  constructor(codeMirror: any) {
    super(codeMirror);
    this.cm = codeMirror;
    this.contextMenuPending = false;
    this.composing = false;
  }

  init(display: Object): void {
    super.init(display);
    this.textarea.addEventListener('compositionstart', this.onCompositionStart.bind(this));
  }

  private onCompositionStart(): void {
    if (this.textarea.selectionEnd === this.textarea.value.length) {
      return;
    }
    // CodeMirror always expects the caret to be at the end of the textarea
    // When in IME composition mode, clip the textarea to how CodeMirror expects it,
    // and then let CodeMirror do it's thing.
    this.textarea.value = this.textarea.value.substring(0, this.textarea.selectionEnd);
    this.textarea.setSelectionRange(this.textarea.value.length, this.textarea.value.length);
    this.prevInput = this.textarea.value;
  }

  reset(typing?: boolean): void {
    if (this.textAreaBusy(Boolean(typing))) {
      super.reset(typing);
      return;
    }

    // When navigating around the document, keep the current visual line in the textarea.
    const cursor = this.cm.getCursor();
    let start, end;
    if (this.cm.getOption('lineWrapping')) {
      // To get the visual line, compute the leftmost and rightmost character positions.
      const top = this.cm.charCoords(cursor, 'page').top;
      start = this.cm.coordsChar({left: -Infinity, top});
      end = this.cm.coordsChar({left: Infinity, top});
    } else {
      // Limit the line to 1000 characters to prevent lag.
      const offset = Math.floor(cursor.ch / 1000) * 1000;
      start = {ch: offset, line: cursor.line};
      end = {ch: offset + 1000, line: cursor.line};
    }
    this.textarea.value = this.cm.getRange(start, end);
    const caretPosition = cursor.ch - start.ch;
    this.textarea.setSelectionRange(caretPosition, caretPosition);
    this.prevInput = this.textarea.value;
  }

  /**
   * If the user is currently typing into the textarea or otherwise
   * modifying it, we don't want to clobber their work.
   */
  protected textAreaBusy(typing: boolean): boolean {
    return typing || this.contextMenuPending || this.composing || this.cm.somethingSelected();
  }

  poll(): boolean {
    if (this.contextMenuPending || this.composing) {
      return super.poll();
    }
    const text = this.textarea.value;
    let start = 0;
    const length = Math.min(this.prevInput.length, text.length);
    while (start < length && this.prevInput[start] === text[start]) {
      ++start;
    }
    let end = 0;
    while (end < length - start && this.prevInput[this.prevInput.length - end - 1] === text[text.length - end - 1]) {
      ++end;
    }

    // CodeMirror expects the user to be typing into a blank <textarea>.
    // Pass a fake textarea into super.poll that only contains the users input.
    const placeholder = this.textarea;
    this.textarea = document.createElement('textarea');
    this.textarea.value = text.substring(start, text.length - end);
    this.textarea.setSelectionRange(placeholder.selectionStart - start, placeholder.selectionEnd - start);
    this.prevInput = '';
    const result = super.poll();
    this.prevInput = text;
    this.textarea = placeholder;
    return result;
  }
}

// @ts-ignore
CodeMirror.inputStyles.devToolsAccessibleTextArea = DevToolsAccessibleTextArea;

export interface Decoration {
  element: Element;
  // https://crbug.com/1151919 * = CodeMirror.LineWidget
  widget: any;
  update: (() => void)|null;
}
