// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {SuggestBox, type SuggestBoxDelegate, type Suggestion} from './SuggestBox.js';
import textPromptStyles from './textPrompt.css.legacy.js';
import * as ThemeSupport from './theme_support/theme_support.js';
import {Tooltip} from './Tooltip.js';
import {ElementFocusRestorer} from './UIUtils.js';

export class TextPrompt extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SuggestBoxDelegate {
  private proxyElement!: HTMLElement|undefined;
  private proxyElementDisplay: string;
  private autocompletionTimeout: number;
  private titleInternal: string;
  private queryRange: TextUtils.TextRange.TextRange|null;
  private previousText: string;
  private currentSuggestion: Suggestion|null;
  private completionRequestId: number;
  private ghostTextElement: HTMLSpanElement;
  private leftParenthesesIndices: number[];
  private loadCompletions!: (this: null, arg1: string, arg2: string, arg3?: boolean|undefined) => Promise<Suggestion[]>;
  private completionStopCharacters!: string;
  private usesSuggestionBuilder!: boolean;
  private elementInternal?: Element;
  private boundOnKeyDown?: ((ev: Event) => void);
  private boundOnInput?: ((ev: Event) => void);
  private boundOnMouseWheel?: ((event: Event) => void);
  private boundClearAutocomplete?: (() => void);
  private boundOnBlur?: ((ev: Event) => void);
  private contentElement?: HTMLElement;
  private suggestBox?: SuggestBox;
  private isEditing?: boolean;
  private focusRestorer?: ElementFocusRestorer;
  private blurListener?: ((arg0: Event) => void);
  private oldTabIndex?: number;
  private completeTimeout?: number;
  private disableDefaultSuggestionForEmptyInputInternal?: boolean;
  private changed: boolean;
  jslogContext: string|undefined = undefined;

  constructor() {
    super();
    this.proxyElementDisplay = 'inline-block';
    this.autocompletionTimeout = DefaultAutocompletionTimeout;
    this.titleInternal = '';
    this.queryRange = null;
    this.previousText = '';
    this.currentSuggestion = null;
    this.completionRequestId = 0;
    this.ghostTextElement = document.createElement('span');
    this.ghostTextElement.classList.add('auto-complete-text');
    this.ghostTextElement.setAttribute('contenteditable', 'false');
    this.leftParenthesesIndices = [];
    this.changed = false;
    ARIAUtils.markAsHidden(this.ghostTextElement);
  }

  initialize(
      completions: (this: null, expression: string, filter: string, force?: boolean|undefined) => Promise<Suggestion[]>,
      stopCharacters?: string, usesSuggestionBuilder?: boolean): void {
    this.loadCompletions = completions;
    this.completionStopCharacters = stopCharacters || ' =:[({;,!+-*/&|^<>.';
    this.usesSuggestionBuilder = usesSuggestionBuilder || false;
  }

  setAutocompletionTimeout(timeout: number): void {
    this.autocompletionTimeout = timeout;
  }

  renderAsBlock(): void {
    this.proxyElementDisplay = 'block';
  }

  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events.
   */
  attach(element: Element): Element {
    return this.attachInternal(element);
  }

  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events
   * or the |blurListener| parameter to register a "blur" event listener on the |element|
   * (since the "blur" event does not bubble.)
   */
  attachAndStartEditing(element: Element, blurListener: (arg0: Event) => void): Element {
    const proxyElement = this.attachInternal(element);
    this.startEditing(blurListener);
    return proxyElement;
  }

  private attachInternal(element: Element): Element {
    if (this.proxyElement) {
      throw 'Cannot attach an attached TextPrompt';
    }
    this.elementInternal = element;

    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnInput = this.onInput.bind(this);
    this.boundOnMouseWheel = this.onMouseWheel.bind(this);
    this.boundClearAutocomplete = this.clearAutocomplete.bind(this);
    this.boundOnBlur = this.onBlur.bind(this);
    this.proxyElement = element.ownerDocument.createElement('span');
    ThemeSupport.ThemeSupport.instance().appendStyle(this.proxyElement, textPromptStyles);
    this.contentElement = this.proxyElement.createChild('div', 'text-prompt-root');
    this.proxyElement.style.display = this.proxyElementDisplay;
    if (element.parentElement) {
      element.parentElement.insertBefore(this.proxyElement, element);
    }
    this.contentElement.appendChild(element);
    let jslog = VisualLogging.textField().track({
      keydown: 'ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape',
      change: true,
    });

    if (this.jslogContext) {
      jslog = jslog.context(this.jslogContext);
    }
    if (!this.elementInternal.hasAttribute('jslog')) {
      this.elementInternal.setAttribute('jslog', `${jslog}`);
    }
    this.elementInternal.classList.add('text-prompt');
    ARIAUtils.markAsTextBox(this.elementInternal);
    ARIAUtils.setAutocomplete(this.elementInternal, ARIAUtils.AutocompleteInteractionModel.BOTH);
    ARIAUtils.setHasPopup(this.elementInternal, ARIAUtils.PopupRole.LIST_BOX);
    this.elementInternal.setAttribute('contenteditable', 'plaintext-only');
    this.element().addEventListener('keydown', this.boundOnKeyDown, false);
    this.elementInternal.addEventListener('input', this.boundOnInput, false);
    this.elementInternal.addEventListener('wheel', this.boundOnMouseWheel, false);
    this.elementInternal.addEventListener('selectstart', this.boundClearAutocomplete, false);
    this.elementInternal.addEventListener('blur', this.boundOnBlur, false);

    this.suggestBox = new SuggestBox(this, 20);

    if (this.titleInternal) {
      Tooltip.install(this.proxyElement, this.titleInternal);
    }

    return this.proxyElement;
  }

  element(): HTMLElement {
    if (!this.elementInternal) {
      throw new Error('Expected an already attached element!');
    }
    return this.elementInternal as HTMLElement;
  }

  detach(): void {
    this.removeFromElement();
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.proxyElement && this.proxyElement.parentElement) {
      this.proxyElement.parentElement.insertBefore(this.element(), this.proxyElement);
      this.proxyElement.remove();
    }
    delete this.proxyElement;
    this.element().classList.remove('text-prompt');
    this.element().removeAttribute('contenteditable');
    this.element().removeAttribute('role');
    ARIAUtils.clearAutocomplete(this.element());
    ARIAUtils.setHasPopup(this.element(), ARIAUtils.PopupRole.FALSE);
  }

  textWithCurrentSuggestion(): string {
    const text = this.text();
    if (!this.queryRange || !this.currentSuggestion) {
      return text;
    }
    const suggestion = this.currentSuggestion.text;
    return text.substring(0, this.queryRange.startColumn) + suggestion + text.substring(this.queryRange.endColumn);
  }

  text(): string {
    let text: string = this.element().textContent || '';
    if (this.ghostTextElement.parentNode) {
      const addition = this.ghostTextElement.textContent || '';
      text = text.substring(0, text.length - addition.length);
    }
    return text;
  }

  setText(text: string): void {
    this.clearAutocomplete();
    this.element().textContent = text;
    this.previousText = this.text();
    if (this.element().hasFocus()) {
      this.moveCaretToEndOfPrompt();
      this.element().scrollIntoView();
    }
  }

  setSelectedRange(startIndex: number, endIndex: number): void {
    if (startIndex < 0) {
      throw new RangeError('Selected range start must be a nonnegative integer');
    }
    const textContent = this.element().textContent;
    const textContentLength = textContent ? textContent.length : 0;
    if (endIndex > textContentLength) {
      endIndex = textContentLength;
    }
    if (endIndex < startIndex) {
      endIndex = startIndex;
    }

    const textNode = (this.element().childNodes[0] as Node);
    const range = new Range();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, endIndex);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  focus(): void {
    this.element().focus();
  }

  title(): string {
    return this.titleInternal;
  }

  setTitle(title: string): void {
    this.titleInternal = title;
    if (this.proxyElement) {
      Tooltip.install(this.proxyElement, title);
    }
  }

  setPlaceholder(placeholder: string, ariaPlaceholder?: string): void {
    if (placeholder) {
      this.element().setAttribute('data-placeholder', placeholder);
      // TODO(https://github.com/nvaccess/nvda/issues/10164): Remove ariaPlaceholder once the NVDA bug is fixed
      // ariaPlaceholder and placeholder may differ, like in case the placeholder contains a '?'
      ARIAUtils.setPlaceholder(this.element(), ariaPlaceholder || placeholder);
    } else {
      this.element().removeAttribute('data-placeholder');
      ARIAUtils.setPlaceholder(this.element(), null);
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.element().setAttribute('contenteditable', 'plaintext-only');
    } else {
      this.element().removeAttribute('contenteditable');
    }
    this.element().classList.toggle('disabled', !enabled);
  }

  private removeFromElement(): void {
    this.clearAutocomplete();
    this.element().removeEventListener(
        'keydown', (this.boundOnKeyDown as (this: HTMLElement, arg1: Event) => void), false);
    this.element().removeEventListener('input', (this.boundOnInput as (this: HTMLElement, arg1: Event) => void), false);
    this.element().removeEventListener(
        'selectstart', (this.boundClearAutocomplete as (this: HTMLElement, arg1: Event) => void), false);
    this.element().removeEventListener('blur', (this.boundOnBlur as (this: HTMLElement, arg1: Event) => void), false);
    if (this.isEditing) {
      this.stopEditing();
    }
    if (this.suggestBox) {
      this.suggestBox.hide();
    }
  }

  private startEditing(blurListener?: ((arg0: Event) => void)): void {
    this.isEditing = true;
    if (this.contentElement) {
      this.contentElement.classList.add('text-prompt-editing');
    }
    this.focusRestorer = new ElementFocusRestorer(this.element());
    if (blurListener) {
      this.blurListener = blurListener;
      this.element().addEventListener('blur', this.blurListener, false);
    }
    this.oldTabIndex = this.element().tabIndex;
    if (this.element().tabIndex < 0) {
      this.element().tabIndex = 0;
    }
    if (!this.text()) {
      this.autoCompleteSoon();
    }
  }

  private stopEditing(): void {
    this.element().tabIndex = (this.oldTabIndex as number);
    if (this.blurListener) {
      this.element().removeEventListener('blur', this.blurListener, false);
    }
    if (this.contentElement) {
      this.contentElement.classList.remove('text-prompt-editing');
    }
    delete this.isEditing;
  }

  onMouseWheel(_event: Event): void {
    // Subclasses can implement.
  }

  onKeyDown(ev: Event): void {
    let handled = false;
    const event = (ev as KeyboardEvent);
    if (this.isSuggestBoxVisible() && this.suggestBox && this.suggestBox.keyPressed(event)) {
      void VisualLogging.logKeyDown(this.suggestBox.element, event);
      event.consume(true);
      return;
    }

    switch (event.key) {
      case 'Tab':
        handled = this.tabKeyPressed(event);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Home':
        this.clearAutocomplete();
        break;
      case 'PageDown':
      case 'ArrowRight':
      case 'ArrowDown':
      case 'End':
        if (this.isCaretAtEndOfPrompt()) {
          handled = this.acceptAutoComplete();
        } else {
          this.clearAutocomplete();
        }
        break;
      case 'Escape':
        if (this.isSuggestBoxVisible()) {
          this.clearAutocomplete();
          handled = true;
        }
        break;
      case ' ':  // Space
        if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          this.autoCompleteSoon(true);
          handled = true;
        }
        break;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
    }

    if (handled) {
      event.consume(true);
    }
  }

  private acceptSuggestionOnStopCharacters(key: string): boolean {
    if (!this.currentSuggestion || !this.queryRange || key.length !== 1 || !this.completionStopCharacters ||
        !this.completionStopCharacters.includes(key)) {
      return false;
    }

    const query = this.text().substring(this.queryRange.startColumn, this.queryRange.endColumn);
    if (query && this.currentSuggestion.text.startsWith(query + key)) {
      this.queryRange.endColumn += 1;
      return this.acceptAutoComplete();
    }
    return false;
  }

  onInput(ev: Event): void {
    const event = (ev as InputEvent);
    let text = this.text();
    const currentEntry = event.data;

    if (event.inputType === 'insertFromPaste' && text.includes('\n')) {
      /* Ensure that we remove any linebreaks from copied/pasted content
       * to avoid breaking the rendering of the filter bar.
       * See crbug.com/849563.
       * We don't let users enter linebreaks when
       * typing manually, so we should escape them if copying text in.
       */
      text = Platform.StringUtilities.stripLineBreaks(text);
      this.setText(text);
    }

    // Skip the current ')' entry if the caret is right before a ')' and there's an unmatched '('.
    const caretPosition = this.getCaretPosition();
    if (currentEntry === ')' && caretPosition >= 0 && this.leftParenthesesIndices.length > 0) {
      const nextCharAtCaret = text[caretPosition];
      if (nextCharAtCaret === ')' && this.tryMatchingLeftParenthesis(caretPosition)) {
        text = text.substring(0, caretPosition) + text.substring(caretPosition + 1);
        this.setText(text);
        return;
      }
    }

    if (currentEntry && !this.acceptSuggestionOnStopCharacters(currentEntry)) {
      const hasCommonPrefix = text.startsWith(this.previousText) || this.previousText.startsWith(text);
      if (this.queryRange && hasCommonPrefix) {
        this.queryRange.endColumn += text.length - this.previousText.length;
      }
    }
    this.refreshGhostText();
    this.previousText = text;
    this.dispatchEventToListeners(Events.TEXT_CHANGED);
    this.changed = true;

    this.autoCompleteSoon();
  }

  acceptAutoComplete(): boolean {
    let result = false;
    if (this.isSuggestBoxVisible() && this.suggestBox) {
      result = this.suggestBox.acceptSuggestion();
    }
    if (!result) {
      result = this.acceptSuggestionInternal();
    }
    if (this.usesSuggestionBuilder && result) {
      // Trigger autocompletions for text prompts using suggestion builders
      this.autoCompleteSoon();
    }
    return result;
  }

  clearAutocomplete(): void {
    const beforeText = this.textWithCurrentSuggestion();

    if (this.isSuggestBoxVisible() && this.suggestBox) {
      this.suggestBox.hide();
    }
    this.clearAutocompleteTimeout();
    this.queryRange = null;
    this.refreshGhostText();

    if (beforeText !== this.textWithCurrentSuggestion()) {
      this.dispatchEventToListeners(Events.TEXT_CHANGED);
      this.changed = true;
    }
  }

  private onBlur(): void {
    this.clearAutocomplete();
  }

  private refreshGhostText(): void {
    if (this.currentSuggestion && this.currentSuggestion.hideGhostText) {
      this.ghostTextElement.remove();
      return;
    }
    if (this.queryRange && this.currentSuggestion && this.isCaretAtEndOfPrompt() &&
        this.currentSuggestion.text.startsWith(this.text().substring(this.queryRange.startColumn))) {
      this.ghostTextElement.textContent =
          this.currentSuggestion.text.substring(this.queryRange.endColumn - this.queryRange.startColumn);
      this.element().appendChild(this.ghostTextElement);
    } else {
      this.ghostTextElement.remove();
    }
  }

  private clearAutocompleteTimeout(): void {
    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      delete this.completeTimeout;
    }
    this.completionRequestId++;
  }

  autoCompleteSoon(force?: boolean): void {
    const immediately = this.isSuggestBoxVisible() || force;
    if (!this.completeTimeout) {
      this.completeTimeout =
          window.setTimeout(this.complete.bind(this, force), immediately ? 0 : this.autocompletionTimeout);
    }
  }

  async complete(force?: boolean): Promise<void> {
    this.clearAutocompleteTimeout();
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const selectionRange = selection.getRangeAt(0);

    let shouldExit;

    if (!force && !this.isCaretAtEndOfPrompt() && !this.isSuggestBoxVisible()) {
      shouldExit = true;
    } else if (!selection.isCollapsed) {
      shouldExit = true;
    }

    if (shouldExit) {
      this.clearAutocomplete();
      return;
    }

    const wordQueryRange = Platform.DOMUtilities.rangeOfWord(
        selectionRange.startContainer, selectionRange.startOffset, this.completionStopCharacters, this.element(),
        'backward');

    const expressionRange = wordQueryRange.cloneRange();
    expressionRange.collapse(true);
    expressionRange.setStartBefore(this.element());
    const completionRequestId = ++this.completionRequestId;
    const completions =
        await this.loadCompletions.call(null, expressionRange.toString(), wordQueryRange.toString(), Boolean(force));
    this.completionsReady(completionRequestId, (selection as Selection), wordQueryRange, Boolean(force), completions);
  }

  disableDefaultSuggestionForEmptyInput(): void {
    this.disableDefaultSuggestionForEmptyInputInternal = true;
  }

  private boxForAnchorAtStart(selection: Selection, textRange: Range): AnchorBox {
    const rangeCopy = selection.getRangeAt(0).cloneRange();
    const anchorElement = document.createElement('span');
    anchorElement.textContent = '\u200B';
    textRange.insertNode(anchorElement);
    const box = anchorElement.boxInWindow(window);
    anchorElement.remove();
    selection.removeAllRanges();
    selection.addRange(rangeCopy);
    return box;
  }

  additionalCompletions(_query: string): Suggestion[] {
    return [];
  }

  private completionsReady(
      completionRequestId: number, selection: Selection, originalWordQueryRange: Range, force: boolean,
      completions: Suggestion[]): void {
    if (this.completionRequestId !== completionRequestId) {
      return;
    }

    const query = originalWordQueryRange.toString();

    // Filter out dupes.
    const store = new Set<string>();
    completions = completions.filter(item => !store.has(item.text) && Boolean(store.add(item.text)));

    if (query || force) {
      if (query) {
        completions = completions.concat(this.additionalCompletions(query));
      } else {
        completions = this.additionalCompletions(query).concat(completions);
      }
    }

    if (!completions.length) {
      this.clearAutocomplete();
      return;
    }

    const selectionRange = selection.getRangeAt(0);

    const fullWordRange = document.createRange();
    fullWordRange.setStart(originalWordQueryRange.startContainer, originalWordQueryRange.startOffset);
    fullWordRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);

    if (query + selectionRange.toString() !== fullWordRange.toString()) {
      return;
    }

    const beforeRange = document.createRange();
    beforeRange.setStart(this.element(), 0);
    beforeRange.setEnd(fullWordRange.startContainer, fullWordRange.startOffset);
    this.queryRange = new TextUtils.TextRange.TextRange(
        0, beforeRange.toString().length, 0, beforeRange.toString().length + fullWordRange.toString().length);

    const shouldSelect = !this.disableDefaultSuggestionForEmptyInputInternal || Boolean(this.text());
    if (this.suggestBox) {
      this.suggestBox.updateSuggestions(
          this.boxForAnchorAtStart(selection, fullWordRange), completions, shouldSelect, !this.isCaretAtEndOfPrompt(),
          this.text());
    }
  }

  applySuggestion(suggestion: Suggestion|null, isIntermediateSuggestion?: boolean): void {
    this.currentSuggestion = suggestion;
    this.refreshGhostText();
    if (isIntermediateSuggestion) {
      this.dispatchEventToListeners(Events.TEXT_CHANGED);
      this.changed = true;
    }
  }

  acceptSuggestion(): void {
    this.acceptSuggestionInternal();
  }

  private acceptSuggestionInternal(): boolean {
    if (!this.queryRange) {
      return false;
    }

    const suggestionLength = this.currentSuggestion ? this.currentSuggestion.text.length : 0;
    const selectionRange = this.currentSuggestion ? this.currentSuggestion.selectionRange : null;
    const endColumn = selectionRange ? selectionRange.endColumn : suggestionLength;
    const startColumn = selectionRange ? selectionRange.startColumn : suggestionLength;
    this.element().textContent = this.textWithCurrentSuggestion();
    this.setDOMSelection(this.queryRange.startColumn + startColumn, this.queryRange.startColumn + endColumn);
    this.updateLeftParenthesesIndices();

    this.clearAutocomplete();
    this.dispatchEventToListeners(Events.TEXT_CHANGED);
    this.changed = true;

    return true;
  }

  ownerElement(): Element {
    return this.element();
  }

  setDOMSelection(startColumn: number, endColumn: number): void {
    this.element().normalize();
    const node = this.element().childNodes[0];
    if (!node || node === this.ghostTextElement) {
      return;
    }
    const range = document.createRange();
    range.setStart(node, startColumn);
    range.setEnd(node, endColumn);
    const selection = this.element().getComponentSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  isSuggestBoxVisible(): boolean {
    return this.suggestBox !== undefined && this.suggestBox.visible();
  }

  isCaretInsidePrompt(): boolean {
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }
    // @see crbug.com/602541
    const selectionRange = selection.getRangeAt(0);
    return selectionRange.startContainer.isSelfOrDescendant(this.element());
  }

  private isCaretAtEndOfPrompt(): boolean {
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }

    const selectionRange = selection.getRangeAt(0);
    let node: (Node|null)|Node = selectionRange.startContainer;
    if (!node.isSelfOrDescendant(this.element())) {
      return false;
    }

    if (this.ghostTextElement.isAncestor(node)) {
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE && selectionRange.startOffset < (node.nodeValue || '').length) {
      return false;
    }

    let foundNextText = false;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.length) {
        if (foundNextText && !this.ghostTextElement.isAncestor(node)) {
          return false;
        }
        foundNextText = true;
      }

      node = node.traverseNextNode(this.elementInternal);
    }

    return true;
  }

  moveCaretToEndOfPrompt(): void {
    const selection = this.element().getComponentSelection();
    const selectionRange = document.createRange();

    let container: Node = this.element();
    while (container.lastChild) {
      container = container.lastChild;
    }
    let offset = 0;
    if (container.nodeType === Node.TEXT_NODE) {
      const textNode = (container as Text);
      offset = (textNode.textContent || '').length;
    }
    selectionRange.setStart(container, offset);
    selectionRange.setEnd(container, offset);

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRange);
    }
  }

  /** -1 if no caret can be found in text prompt
   */
  private getCaretPosition(): number {
    if (!this.element().hasFocus()) {
      return -1;
    }

    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return -1;
    }
    const selectionRange = selection.getRangeAt(0);
    if (selectionRange.startOffset !== selectionRange.endOffset) {
      return -1;
    }
    return selectionRange.startOffset;
  }

  tabKeyPressed(_event: Event): boolean {
    return this.acceptAutoComplete();
  }

  proxyElementForTests(): Element|null {
    return this.proxyElement || null;
  }

  /**
   * Try matching the most recent open parenthesis with the given right
   * parenthesis, and closes the matched left parenthesis if found.
   * Return the result of the matching.
   */
  private tryMatchingLeftParenthesis(rightParenthesisIndex: number): boolean {
    const leftParenthesesIndices = this.leftParenthesesIndices;
    if (leftParenthesesIndices.length === 0 || rightParenthesisIndex < 0) {
      return false;
    }

    for (let i = leftParenthesesIndices.length - 1; i >= 0; --i) {
      if (leftParenthesesIndices[i] < rightParenthesisIndex) {
        leftParenthesesIndices.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  private updateLeftParenthesesIndices(): void {
    const text = this.text();
    const leftParenthesesIndices: number[] = this.leftParenthesesIndices = [];
    for (let i = 0; i < text.length; ++i) {
      if (text[i] === '(') {
        leftParenthesesIndices.push(i);
      }
    }
  }

  suggestBoxForTest(): SuggestBox|undefined {
    return this.suggestBox;
  }
}

const DefaultAutocompletionTimeout = 250;

export const enum Events {
  TEXT_CHANGED = 'TextChanged',
}

export type EventTypes = {
  [Events.TEXT_CHANGED]: void,
};
