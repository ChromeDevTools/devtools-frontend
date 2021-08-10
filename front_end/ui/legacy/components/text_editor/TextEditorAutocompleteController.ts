// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';

import type {CodeMirrorTextEditor} from './CodeMirrorTextEditor.js';

export class TextEditorAutocompleteController implements UI.SuggestBox.SuggestBoxDelegate {
  private textEditor: CodeMirrorTextEditor;
  private codeMirror: any;
  private config: UI.TextEditor.AutocompleteConfig;
  private initialized: boolean;
  private readonly mouseDown: () => void;
  private lastHintText: string;
  private suggestBox: UI.SuggestBox.SuggestBox|null;
  private currentSuggestion: UI.SuggestBox.Suggestion|null;
  private hintElement: HTMLSpanElement;
  private readonly tooltipGlassPane: UI.GlassPane.GlassPane;
  private readonly tooltipElement: HTMLDivElement;
  private queryRange: TextUtils.TextRange.TextRange|null;
  private dictionary?: Common.TextDictionary.TextDictionary;
  private updatedLines?: any;
  private hintMarker?: any|null;
  private anchorBox?: AnchorBox|null;

  // https://crbug.com/1151919 * = CodeMirror.Editor
  constructor(textEditor: CodeMirrorTextEditor, codeMirror: any, config: UI.TextEditor.AutocompleteConfig) {
    this.textEditor = textEditor;
    this.codeMirror = codeMirror;
    this.config = config;
    this.initialized = false;

    this.onScroll = this.onScroll.bind(this);
    this.onCursorActivity = this.onCursorActivity.bind(this);
    this.changes = this.changes.bind(this);
    this.blur = this.blur.bind(this);
    this.beforeChange = this.beforeChange.bind(this);
    this.mouseDown = (): void => {
      this.clearAutocomplete();
      this.tooltipGlassPane.hide();
    };
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.on('changes', this.changes);
    this.lastHintText = '';
    this.suggestBox = null;
    this.currentSuggestion = null;
    this.hintElement = document.createElement('span');
    this.hintElement.classList.add('auto-complete-text');

    this.tooltipGlassPane = new UI.GlassPane.GlassPane();
    this.tooltipGlassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this.tooltipGlassPane.setOutsideClickCallback(this.tooltipGlassPane.hide.bind(this.tooltipGlassPane));
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.classList.add('autocomplete-tooltip');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(this.tooltipGlassPane.contentElement, {
      cssFile: 'ui/legacy/components/text_editor/autocompleteTooltip.css',
      delegatesFocus: undefined,
    });
    shadowRoot.appendChild(this.tooltipElement);

    this.queryRange = null;
  }

  private initializeIfNeeded(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.on('scroll', this.onScroll);
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.on('cursorActivity', this.onCursorActivity);
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.on('mousedown', this.mouseDown);
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.on('blur', this.blur);
    if (this.config.isWordChar) {
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.on('beforeChange', this.beforeChange);
      this.dictionary = new Common.TextDictionary.TextDictionary();
      // @ts-ignore CodeMirror types are wrong.
      this.addWordsFromText(this.codeMirror.getValue());
    }
    UI.ARIAUtils.setAutocomplete(this.textEditor.element, UI.ARIAUtils.AutocompleteInteractionModel.both);
    UI.ARIAUtils.setHasPopup(this.textEditor.element, UI.ARIAUtils.PopupRole.ListBox);
  }

  dispose(): void {
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.off('changes', this.changes);
    if (this.initialized) {
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.off('scroll', this.onScroll);
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.off('cursorActivity', this.onCursorActivity);
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.off('mousedown', this.mouseDown);
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.off('blur', this.blur);
    }
    if (this.dictionary) {
      // @ts-ignore CodeMirror types are wrong.
      this.codeMirror.off('beforeChange', this.beforeChange);
      this.dictionary.reset();
    }
    UI.ARIAUtils.clearAutocomplete(this.textEditor.element);
    UI.ARIAUtils.setHasPopup(this.textEditor.element, UI.ARIAUtils.PopupRole.False);
  }

  private beforeChange(codeMirror: typeof CodeMirror, changeObject: any): void {
    this.updatedLines = this.updatedLines || {};
    for (let i = changeObject.from.line; i <= changeObject.to.line; ++i) {
      if (this.updatedLines[i] === undefined) {
        // @ts-ignore CodeMirror types are wrong.
        this.updatedLines[i] = this.codeMirror.getLine(i);
      }
    }
  }

  private addWordsFromText(text: string): void {
    TextUtils.TextUtils.Utils.textToWords(
        text, this.config.isWordChar as (arg0: string) => boolean, addWord.bind(this));

    function addWord(this: TextEditorAutocompleteController, word: string): void {
      if (this.dictionary && word.length && (word[0] < '0' || word[0] > '9')) {
        this.dictionary.addWord(word);
      }
    }
  }

  private removeWordsFromText(text: string): void {
    TextUtils.TextUtils.Utils.textToWords(
        text, this.config.isWordChar as (arg0: string) => boolean,
        word => this.dictionary && this.dictionary.removeWord(word));
  }

  private substituteRange(lineNumber: number, columnNumber: number): TextUtils.TextRange.TextRange|null {
    let range: TextUtils.TextRange.TextRange|(TextUtils.TextRange.TextRange | null) =
        this.config.substituteRangeCallback ? this.config.substituteRangeCallback(lineNumber, columnNumber) : null;
    if (!range && this.config.isWordChar) {
      range = this.textEditor.wordRangeForCursorPosition(lineNumber, columnNumber, this.config.isWordChar);
    }
    return range;
  }

  private wordsWithQuery(
      queryRange: TextUtils.TextRange.TextRange, substituteRange: TextUtils.TextRange.TextRange,
      force?: boolean): Promise<UI.SuggestBox.Suggestions> {
    const external =
        this.config.suggestionsCallback ? this.config.suggestionsCallback(queryRange, substituteRange, force) : null;
    if (external) {
      return external;
    }

    if (!this.dictionary || (!force && queryRange.isEmpty())) {
      return Promise.resolve([]);
    }

    let completions = this.dictionary.wordsWithPrefix(this.textEditor.text(queryRange));
    const substituteWord = this.textEditor.text(substituteRange);
    if (this.dictionary.wordCount(substituteWord) === 1) {
      completions = completions.filter(word => word !== substituteWord);
    }
    const dictionary = this.dictionary;
    completions.sort((a, b) => dictionary.wordCount(b) - dictionary.wordCount(a) || a.length - b.length);
    return Promise.resolve(completions.map(item => ({
                                             text: item,
                                             title: undefined,
                                             subtitle: undefined,
                                             iconType: undefined,
                                             priority: undefined,
                                             isSecondary: undefined,
                                             subtitleRenderer: undefined,
                                             selectionRange: undefined,
                                             hideGhostText: undefined,
                                             iconElement: undefined,
                                           })));
  }

  private changes(codeMirror: typeof CodeMirror, changes: any[]): void {
    if (!changes.length) {
      return;
    }

    if (this.dictionary && this.updatedLines) {
      for (const lineNumber in this.updatedLines) {
        this.removeWordsFromText(this.updatedLines[lineNumber]);
      }
      delete this.updatedLines;

      const linesToUpdate: {
        [x: string]: string,
      } = {};
      for (let changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
        const changeObject = changes[changeIndex];
        const editInfo = TextUtils.CodeMirrorUtils.changeObjectToEditOperation(changeObject);
        for (let i = editInfo.newRange.startLine; i <= editInfo.newRange.endLine; ++i) {
          // @ts-ignore CodeMirror types are wrong.
          linesToUpdate[String(i)] = this.codeMirror.getLine(i);
        }
      }
      for (const lineNumber in linesToUpdate) {
        this.addWordsFromText(linesToUpdate[lineNumber]);
      }
    }

    let singleCharInput = false;
    let singleCharDelete = false;
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor('head');
    for (let changeIndex = 0; changeIndex < changes.length; ++changeIndex) {
      const changeObject = changes[changeIndex];
      if (changeObject.origin === '+input' && changeObject.text.length === 1 && changeObject.text[0].length === 1 &&
          changeObject.to.line === cursor.line && changeObject.to.ch + 1 === cursor.ch) {
        singleCharInput = true;
        break;
      }
      if (changeObject.origin === '+delete' && changeObject.removed.length === 1 &&
          changeObject.removed[0].length === 1 && changeObject.to.line === cursor.line &&
          changeObject.to.ch - 1 === cursor.ch) {
        singleCharDelete = true;
        break;
      }
    }
    if (this.queryRange) {
      if (singleCharInput) {
        this.queryRange.endColumn++;
      } else if (singleCharDelete) {
        this.queryRange.endColumn--;
      }
      if (singleCharDelete || singleCharInput) {
        this.setHint(this.lastHintText);
      }
    }

    if (singleCharInput || singleCharDelete) {
      queueMicrotask(() => {
        this.autocomplete();
      });
    } else {
      this.clearAutocomplete();
    }
  }

  private blur(): void {
    this.clearAutocomplete();
  }

  private validateSelectionsContexts(mainSelection: TextUtils.TextRange.TextRange): boolean {
    // @ts-ignore CodeMirror types are wrong.
    const selections = this.codeMirror.listSelections();
    if (selections.length <= 1) {
      return true;
    }
    const mainSelectionContext = this.textEditor.text(mainSelection);
    for (let i = 0; i < selections.length; ++i) {
      const wordRange = this.substituteRange(selections[i].head.line, selections[i].head.ch);
      if (!wordRange) {
        return false;
      }
      const context = this.textEditor.text(wordRange);
      if (context !== mainSelectionContext) {
        return false;
      }
    }
    return true;
  }

  autocomplete(force?: boolean): void {
    this.initializeIfNeeded();
    // @ts-ignore CodeMirror types are wrong.
    if (this.codeMirror.somethingSelected()) {
      this.hideSuggestBox();
      return;
    }

    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor('head');
    const substituteRange = this.substituteRange(cursor.line, cursor.ch);
    if (!substituteRange || !this.validateSelectionsContexts(substituteRange)) {
      this.hideSuggestBox();
      return;
    }

    const queryRange = substituteRange.clone();
    queryRange.endColumn = cursor.ch;
    const query = this.textEditor.text(queryRange);
    let hadSuggestBox = false;
    if (this.suggestBox) {
      hadSuggestBox = true;
    }
    this.wordsWithQuery(queryRange, substituteRange, force).then(wordsWithQuery => {
      return wordsAcquired(wordsWithQuery);
    });

    const wordsAcquired = (wordsWithQuery: UI.SuggestBox.Suggestions): void => {
      if (!wordsWithQuery.length || (wordsWithQuery.length === 1 && query === wordsWithQuery[0].text) ||
          (!this.suggestBox && hadSuggestBox)) {
        this.hideSuggestBox();
        this.onSuggestionsShownForTest([]);
        return;
      }
      if (!this.suggestBox) {
        this.suggestBox = new UI.SuggestBox.SuggestBox(this, 20);
        if (this.config.anchorBehavior) {
          this.suggestBox.setAnchorBehavior(this.config.anchorBehavior);
        }
      }

      const oldQueryRange = this.queryRange;
      this.queryRange = queryRange;
      if (!oldQueryRange || queryRange.startLine !== oldQueryRange.startLine ||
          queryRange.startColumn !== oldQueryRange.startColumn) {
        this.updateAnchorBox();
      }
      this.anchorBox &&
          this.suggestBox.updateSuggestions(this.anchorBox, wordsWithQuery, true, !this.isCursorAtEndOfLine(), query);
      if (this.suggestBox.visible()) {
        this.tooltipGlassPane.hide();
      }
      this.onSuggestionsShownForTest(wordsWithQuery);
    };
  }

  private setHint(hint: string): void {
    if (this.queryRange === null) {
      return;
    }
    const query = this.textEditor.text(this.queryRange);
    if (!hint || !this.isCursorAtEndOfLine() || !hint.startsWith(query)) {
      this.clearHint();
      return;
    }
    const suffix = hint.substring(query.length).split('\n')[0];
    this.hintElement.textContent = Platform.StringUtilities.trimEndWithMaxLength(suffix, 10000);
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor('to');
    if (this.hintMarker) {
      const position = this.hintMarker.position();
      if (!position || !position.equal(TextUtils.TextRange.TextRange.createFromLocation(cursor.line, cursor.ch))) {
        this.hintMarker.clear();
        this.hintMarker = null;
      }
    }

    if (!this.hintMarker) {
      this.hintMarker = this.textEditor.addBookmark(
          cursor.line, cursor.ch, this.hintElement as HTMLElement, TextEditorAutocompleteController.HintBookmark, true);
    } else if (this.lastHintText !== hint) {
      this.hintMarker.refresh();
    }
    this.lastHintText = hint;
  }

  private clearHint(): void {
    if (!this.hintElement.textContent) {
      return;
    }
    this.lastHintText = '';
    this.hintElement.textContent = '';
    if (this.hintMarker) {
      this.hintMarker.refresh();
    }
  }

  private onSuggestionsShownForTest(_suggestions: UI.SuggestBox.Suggestions): void {
  }

  private onSuggestionsHiddenForTest(): void {
  }

  clearAutocomplete(): void {
    this.tooltipGlassPane.hide();
    this.hideSuggestBox();
  }

  private hideSuggestBox(): void {
    if (!this.suggestBox) {
      return;
    }
    this.suggestBox.hide();
    this.suggestBox = null;
    this.queryRange = null;
    this.anchorBox = null;
    this.currentSuggestion = null;
    this.textEditor.dispatchEventToListeners(UI.TextEditor.Events.SuggestionChanged);
    this.clearHint();
    this.onSuggestionsHiddenForTest();
  }

  keyDown(event: KeyboardEvent): boolean {
    if (this.tooltipGlassPane.isShowing() && event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
      this.tooltipGlassPane.hide();
      return true;
    }
    if (!this.suggestBox) {
      return false;
    }
    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Tab.code:
        this.suggestBox.acceptSuggestion();
        this.clearAutocomplete();
        return true;
      case UI.KeyboardShortcut.Keys.End.code:
      case UI.KeyboardShortcut.Keys.Right.code:
        if (this.isCursorAtEndOfLine()) {
          this.suggestBox.acceptSuggestion();
          this.clearAutocomplete();
          return true;
        }
        this.clearAutocomplete();
        return false;
      case UI.KeyboardShortcut.Keys.Left.code:
      case UI.KeyboardShortcut.Keys.Home.code:
        this.clearAutocomplete();
        return false;
      case UI.KeyboardShortcut.Keys.Esc.code:
        this.clearAutocomplete();
        return true;
    }
    return this.suggestBox.keyPressed(event);
  }

  private isCursorAtEndOfLine(): boolean {
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor('to');
    // @ts-ignore CodeMirror types are wrong.
    return cursor.ch === this.codeMirror.getLine(cursor.line).length;
  }

  applySuggestion(suggestion: UI.SuggestBox.Suggestion|null, _isIntermediateSuggestion?: boolean): void {
    const oldSuggestion = this.currentSuggestion;
    this.currentSuggestion = suggestion;
    this.setHint(suggestion ? suggestion.text : '');
    if ((oldSuggestion ? oldSuggestion.text : '') !== (suggestion ? suggestion.text : '')) {
      this.textEditor.dispatchEventToListeners(UI.TextEditor.Events.SuggestionChanged);
    }
  }

  acceptSuggestion(): void {
    if (this.currentSuggestion === null || this.queryRange === null) {
      return;
    }
    // @ts-ignore CodeMirror types are wrong.
    const selections = this.codeMirror.listSelections().slice();
    const queryLength = this.queryRange.endColumn - this.queryRange.startColumn;
    const suggestion = this.currentSuggestion.text;
    // @ts-ignore CodeMirror types are wrong.
    this.codeMirror.operation(() => {
      for (let i = selections.length - 1; i >= 0; --i) {
        const start = selections[i].head;
        const end = new CodeMirror.Pos(start.line, start.ch - queryLength);
        // @ts-ignore CodeMirror types are wrong.
        this.codeMirror.replaceRange(suggestion, start, end, '+autocomplete');
      }
    });
  }

  ariaControlledBy(): Element {
    return this.textEditor.element;
  }

  textWithCurrentSuggestion(): string {
    if (!this.queryRange || this.currentSuggestion === null) {
      // @ts-ignore CodeMirror types are wrong.
      return this.codeMirror.getValue();
    }

    // @ts-ignore CodeMirror types are wrong.
    const selections = this.codeMirror.listSelections().slice();
    let last: {
      line: any,
      column: any,
    }|{
      line: number,
      column: number,
    } = {line: 0, column: 0};
    let text = '';
    const queryLength = this.queryRange.endColumn - this.queryRange.startColumn;
    for (const selection of selections) {
      const range = new TextUtils.TextRange.TextRange(
          last.line, last.column, selection.head.line, selection.head.ch - queryLength);
      text += this.textEditor.text(range);
      text += this.currentSuggestion.text;
      last = {line: selection.head.line, column: selection.head.ch};
    }
    const range = new TextUtils.TextRange.TextRange(last.line, last.column, Infinity, Infinity);
    text += this.textEditor.text(range);
    return text;
  }

  private onScroll(): void {
    this.tooltipGlassPane.hide();
    if (!this.suggestBox) {
      return;
    }
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor();
    // @ts-ignore CodeMirror types are wrong.
    const scrollInfo = this.codeMirror.getScrollInfo();
    // @ts-ignore CodeMirror types are wrong.
    const topmostLineNumber = this.codeMirror.lineAtHeight(scrollInfo.top, 'local');
    // @ts-ignore CodeMirror types are wrong.
    const bottomLine = this.codeMirror.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
    if (cursor.line < topmostLineNumber || cursor.line > bottomLine) {
      this.clearAutocomplete();
    } else {
      this.updateAnchorBox();
      this.anchorBox && this.suggestBox.setPosition(this.anchorBox);
    }
  }

  private async updateTooltip(): Promise<void> {
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor();
    const tooltip = this.config.tooltipCallback ? await this.config.tooltipCallback(cursor.line, cursor.ch) : null;
    // @ts-ignore CodeMirror types are wrong.
    const newCursor = this.codeMirror.getCursor();

    if (newCursor.line !== cursor.line && newCursor.ch !== cursor.ch) {
      return;
    }
    if (this.suggestBox && this.suggestBox.visible) {
      return;
    }

    if (!tooltip) {
      this.tooltipGlassPane.hide();
      return;
    }
    const metrics = this.textEditor.cursorPositionToCoordinates(cursor.line, cursor.ch);
    if (!metrics) {
      this.tooltipGlassPane.hide();
      return;
    }

    this.tooltipGlassPane.setContentAnchorBox(new AnchorBox(metrics.x, metrics.y, 0, metrics.height));
    this.tooltipElement.removeChildren();
    this.tooltipElement.appendChild(tooltip);
    this.tooltipGlassPane.show(this.textEditor.element.ownerDocument as Document);
  }

  private onCursorActivity(): void {
    this.updateTooltip();
    if (!this.suggestBox || this.queryRange === null) {
      return;
    }
    // @ts-ignore CodeMirror types are wrong.
    const cursor = this.codeMirror.getCursor();
    let shouldCloseAutocomplete: boolean =
        !(cursor.line === this.queryRange.startLine && this.queryRange.startColumn <= cursor.ch &&
          cursor.ch <= this.queryRange.endColumn);
    // Try not to hide autocomplete when user types in.
    if (cursor.line === this.queryRange.startLine && cursor.ch === this.queryRange.endColumn + 1) {
      // @ts-ignore CodeMirror types are wrong.
      const line = this.codeMirror.getLine(cursor.line);
      shouldCloseAutocomplete = this.config.isWordChar ? !this.config.isWordChar(line.charAt(cursor.ch - 1)) : false;
    }
    if (shouldCloseAutocomplete) {
      this.clearAutocomplete();
    }
    this.onCursorActivityHandledForTest();
  }

  private onCursorActivityHandledForTest(): void {
  }

  private updateAnchorBox(): void {
    if (this.queryRange === null) {
      return;
    }
    const line = this.queryRange.startLine;
    const column = this.queryRange.startColumn;
    const metrics = this.textEditor.cursorPositionToCoordinates(line, column);
    this.anchorBox = metrics ? new AnchorBox(metrics.x, metrics.y, 0, metrics.height) : null;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly HintBookmark = Symbol('hint');
}
