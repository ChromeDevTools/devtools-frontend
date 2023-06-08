// Copyright 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Diff from '../../../../third_party/diff/diff.js';
import * as TextPrompt from '../../../../ui/components/text_prompt/text_prompt.js';
import * as UI from '../../legacy.js';

import filteredListWidgetStyles from './filteredListWidget.css.js';

const UIStrings = {
  /**
   * @description Aria label for quick open dialog prompt
   */
  quickOpenPrompt: 'Quick open prompt',
  /**
   * @description Title of quick open dialog
   */
  quickOpen: 'Quick open',
  /**
   * @description Text to show no results have been found
   */
  noResultsFound: 'No results found',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/FilteredListWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FilteredListWidget extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) implements UI.ListControl.ListDelegate<number> {
  private promptHistory: string[];
  private scoringTimer: number;
  private filterTimer: number;
  private loadTimeout: number;
  private refreshListWithCurrentResult!: (() => void)|undefined;
  private dialog!: UI.Dialog.Dialog|undefined;
  private query = '';
  private readonly inputBoxElement: TextPrompt.TextPrompt.TextPrompt;
  private readonly hintElement: HTMLElement;
  private readonly bottomElementsContainer: HTMLElement;
  private readonly progressElement: HTMLElement;
  private progressBarElement: HTMLElement;
  private readonly items: UI.ListModel.ListModel<number>;
  private list: UI.ListControl.ListControl<number>;
  private readonly itemElementsContainer: HTMLDivElement;
  private notFoundElement: HTMLElement;
  private prefix = '';
  private provider: Provider|null;
  private readonly queryChangedCallback?: (arg0: string) => void;

  constructor(provider: Provider|null, promptHistory?: string[], queryChangedCallback?: ((arg0: string) => void)) {
    super(true);
    this.promptHistory = promptHistory || [];

    this.scoringTimer = 0;
    this.filterTimer = 0;
    this.loadTimeout = 0;

    this.contentElement.classList.add('filtered-list-widget');
    const listener = (this.onKeyDown.bind(this) as (arg0: Event) => void);
    this.contentElement.addEventListener('keydown', listener, true);
    UI.ARIAUtils.markAsCombobox(this.contentElement);

    const hbox = this.contentElement.createChild('div', 'hbox');

    this.inputBoxElement = new TextPrompt.TextPrompt.TextPrompt();
    this.inputBoxElement.data = {ariaLabel: i18nString(UIStrings.quickOpenPrompt), prefix: '', suggestion: ''};
    this.inputBoxElement.addEventListener(
        TextPrompt.TextPrompt.PromptInputEvent.eventName, this.onInput.bind(this), false);
    hbox.appendChild(this.inputBoxElement);

    this.hintElement = hbox.createChild('span', 'filtered-list-widget-hint');

    this.bottomElementsContainer = this.contentElement.createChild('div', 'vbox');
    this.progressElement = this.bottomElementsContainer.createChild('div', 'filtered-list-widget-progress');
    this.progressBarElement = this.progressElement.createChild('div', 'filtered-list-widget-progress-bar');

    this.items = new UI.ListModel.ListModel();
    this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.EqualHeightItems);
    this.itemElementsContainer = this.list.element;
    this.itemElementsContainer.classList.add('container');
    this.bottomElementsContainer.appendChild(this.itemElementsContainer);
    this.itemElementsContainer.addEventListener('click', this.onClick.bind(this), false);
    this.itemElementsContainer.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    UI.ARIAUtils.markAsListBox(this.itemElementsContainer);
    UI.ARIAUtils.setControls(this.inputBoxElement, this.itemElementsContainer);
    UI.ARIAUtils.setAutocomplete(this.inputBoxElement, UI.ARIAUtils.AutocompleteInteractionModel.list);

    this.notFoundElement = this.bottomElementsContainer.createChild('div', 'not-found-text');
    this.notFoundElement.classList.add('hidden');

    this.setDefaultFocusedElement(this.inputBoxElement);

    this.provider = provider;
    this.queryChangedCallback = queryChangedCallback;
  }

  static highlightRanges(element: Element, query: string, caseInsensitive?: boolean): boolean {
    if (!query) {
      return false;
    }

    function rangesForMatch(text: string, query: string): TextUtils.TextRange.SourceRange[]|null {
      const opcodes = Diff.Diff.DiffWrapper.charDiff(query, text);
      let offset = 0;
      const ranges = [];
      for (let i = 0; i < opcodes.length; ++i) {
        const opcode = opcodes[i];
        if (opcode[0] === Diff.Diff.Operation.Equal) {
          ranges.push(new TextUtils.TextRange.SourceRange(offset, opcode[1].length));
        } else if (opcode[0] !== Diff.Diff.Operation.Insert) {
          return null;
        }
        offset += opcode[1].length;
      }
      return ranges;
    }

    if (element.textContent === null) {
      return false;
    }
    const text = element.textContent;
    let ranges = rangesForMatch(text, query);
    if (!ranges || caseInsensitive) {
      ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
    }
    if (ranges) {
      UI.UIUtils.highlightRangesWithStyleClass(element, ranges, 'highlight');
      return true;
    }
    return false;
  }

  setCommandPrefix(commandPrefix: string): void {
    this.inputBoxElement.setPrefix(commandPrefix);
  }

  setCommandSuggestion(suggestion: string): void {
    this.inputBoxElement.setSuggestion(suggestion);
  }

  setHintElement(hint: string): void {
    this.hintElement.textContent = hint;
  }

  /**
   * Sets the text prompt's accessible title. By default, it is "Quick open prompt".
   */
  setPromptTitle(title: string): void {
    UI.ARIAUtils.setLabel(this.inputBoxElement, title);
  }

  showAsDialog(dialogTitle?: string): void {
    if (!dialogTitle) {
      dialogTitle = i18nString(UIStrings.quickOpen);
    }

    this.dialog = new UI.Dialog.Dialog();
    UI.ARIAUtils.setLabel(this.dialog.contentElement, dialogTitle);
    this.dialog.setMaxContentSize(new UI.Geometry.Size(504, 340));
    this.dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);
    this.dialog.setContentPosition(null, 22);
    this.dialog.contentElement.style.setProperty('border-radius', '4px');
    this.show(this.dialog.contentElement);
    UI.ARIAUtils.setExpanded(this.contentElement, true);
    void this.dialog.once(UI.Dialog.Events.Hidden).then(() => {
      this.dispatchEventToListeners(Events.Hidden);
    });
    // @ts-ignore
    this.dialog.show();
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  setProvider(provider: Provider|null): void {
    if (provider === this.provider) {
      return;
    }

    if (this.provider) {
      this.provider.detach();
    }
    this.clearTimers();

    this.provider = provider;
    if (this.isShowing()) {
      this.attachProvider();
    }
  }

  setQuerySelectedRange(startIndex: number, endIndex: number): void {
    this.inputBoxElement.setSelectedRange(startIndex, endIndex);
  }

  private attachProvider(): void {
    this.items.replaceAll([]);
    this.list.invalidateItemHeight();
    if (this.provider) {
      this.provider.setRefreshCallback(this.itemsLoaded.bind(this, this.provider));
      this.provider.attach();
    }
    this.itemsLoaded(this.provider);
  }

  private cleanValue(): string {
    return this.query.substring(this.prefix.length).trim();
  }

  override wasShown(): void {
    this.registerCSSFiles([filteredListWidgetStyles]);
    this.attachProvider();
  }

  override willHide(): void {
    if (this.provider) {
      this.provider.detach();
    }
    this.clearTimers();
    UI.ARIAUtils.setExpanded(this.contentElement, false);
  }

  private clearTimers(): void {
    clearTimeout(this.filterTimer);
    clearTimeout(this.scoringTimer);
    clearTimeout(this.loadTimeout);
    this.filterTimer = 0;
    this.scoringTimer = 0;
    this.loadTimeout = 0;
    this.refreshListWithCurrentResult = undefined;
  }

  private onEnter(event: Event): void {
    if (!this.provider) {
      return;
    }
    event.preventDefault();
    const selectedIndexInProvider = this.provider.itemCount() ? this.list.selectedItem() : null;

    this.selectItem(selectedIndexInProvider);
    if (this.dialog) {
      this.dialog.hide();
    }
  }

  private itemsLoaded(provider: Provider|null): void {
    if (this.loadTimeout || provider !== this.provider) {
      return;
    }
    this.loadTimeout = window.setTimeout(this.updateAfterItemsLoaded.bind(this), 0);
  }

  private updateAfterItemsLoaded(): void {
    this.loadTimeout = 0;
    this.filterItems();
  }

  createElementForItem(item: number): Element {
    const wrapperElement = document.createElement('div');
    wrapperElement.className = 'filtered-list-widget-item-wrapper';

    const itemElement = wrapperElement.createChild('div');
    const renderAsTwoRows = this.provider && this.provider.renderAsTwoRows();
    itemElement.className = 'filtered-list-widget-item ' + (renderAsTwoRows ? 'two-rows' : 'one-row');
    const titleElement = itemElement.createChild('div', 'filtered-list-widget-title');
    const subtitleElement = itemElement.createChild('div', 'filtered-list-widget-subtitle');
    subtitleElement.textContent = '\u200B';
    if (this.provider) {
      this.provider.renderItem(item, this.cleanValue(), titleElement, subtitleElement);
    }
    UI.ARIAUtils.markAsOption(itemElement);
    return wrapperElement;
  }

  heightForItem(_item: number): number {
    // Let the list measure items for us.
    return 0;
  }

  isItemSelectable(_item: number): boolean {
    return true;
  }

  selectedItemChanged(_from: number|null, _to: number|null, fromElement: Element|null, toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('selected');
    }
    if (toElement) {
      toElement.classList.add('selected');
    }
    UI.ARIAUtils.setActiveDescendant(this.inputBoxElement, toElement);
  }

  private onClick(event: Event): void {
    const item = this.list.itemForNode((event.target as Node | null));
    if (item === null) {
      return;
    }

    event.consume(true);
    this.selectItem(item);
    if (this.dialog) {
      this.dialog.hide();
    }
  }

  private onMouseMove(event: Event): void {
    const item = this.list.itemForNode((event.target as Node | null));
    if (item === null) {
      return;
    }
    this.list.selectItem(item);
  }

  setQuery(query: string): void {
    this.query = query;
    this.inputBoxElement.focus();
    this.inputBoxElement.setText(query);
    void this.queryChanged();
    this.scheduleFilter();
  }

  private tabKeyPressed(): boolean {
    const userEnteredText = this.query;
    let completion;
    for (let i = this.promptHistory.length - 1; i >= 0; i--) {
      if (this.promptHistory[i] !== userEnteredText && this.promptHistory[i].startsWith(userEnteredText)) {
        completion = this.promptHistory[i];
        break;
      }
    }
    // If there is an auto-completion, press 'tab' first time will show the auto-completion, second time will rewrite
    // the query. Otherwise it will select the next item.
    if (completion) {
      const selection = this.inputBoxElement.getComponentSelection();
      if (selection && selection.toString().trim() !== '') {
        this.setQuery(completion);
        return true;
      }
      this.inputBoxElement.focus();
      this.inputBoxElement.setText(completion);
      this.setQuerySelectedRange(userEnteredText.length, completion.length);
      return true;
    }
    return this.list.selectNextItem(true, false);
  }

  private itemsFilteredForTest(): void {
    // Sniffed in tests.
  }

  private filterItems(): void {
    this.filterTimer = 0;
    if (this.scoringTimer) {
      clearTimeout(this.scoringTimer);
      this.scoringTimer = 0;

      if (this.refreshListWithCurrentResult) {
        this.refreshListWithCurrentResult();
      }
    }

    if (!this.provider) {
      this.bottomElementsContainer.classList.toggle('hidden', true);
      this.itemsFilteredForTest();
      return;
    }

    this.bottomElementsContainer.classList.toggle('hidden', false);

    this.progressBarElement.style.transform = 'scaleX(0)';
    this.progressBarElement.classList.remove('filtered-widget-progress-fade', 'hidden');

    const query = this.provider.rewriteQuery(this.cleanValue());

    const filterRegex = query ? Platform.StringUtilities.filterRegex(query) : null;

    const filteredItems: number[] = [];

    const bestScores: number[] = [];
    const bestItems: number[] = [];
    const bestItemsToCollect = 100;
    let minBestScore = 0;
    const overflowItems: number[] = [];
    const scoreStartTime = window.performance.now();

    const maxWorkItems = Platform.NumberUtilities.clamp(10, 500, (this.provider.itemCount() / 10) | 0);

    scoreItems.call(this, 0);

    function compareIntegers(a: number, b: number): number {
      return b - a;
    }

    function scoreItems(this: FilteredListWidget, fromIndex: number): void {
      if (!this.provider) {
        return;
      }
      this.scoringTimer = 0;
      let workDone = 0;
      let i;

      for (i = fromIndex; i < this.provider.itemCount() && workDone < maxWorkItems; ++i) {
        // Filter out non-matching items quickly.
        if (filterRegex && !filterRegex.test(this.provider.itemKeyAt(i))) {
          continue;
        }

        // Score item.
        const score = this.provider.itemScoreAt(i, query);
        if (query) {
          workDone++;
        }

        // Find its index in the scores array (earlier elements have bigger scores).
        if (score > minBestScore || bestScores.length < bestItemsToCollect) {
          const index = Platform.ArrayUtilities.upperBound(bestScores, score, compareIntegers);
          bestScores.splice(index, 0, score);
          bestItems.splice(index, 0, i);
          if (bestScores.length > bestItemsToCollect) {
            // Best list is too large -> drop last elements.
            const bestItemLast = bestItems[bestItems.length - 1];
            if (bestItemLast) {
              overflowItems.push(bestItemLast);
            }
            bestScores.length = bestItemsToCollect;
            bestItems.length = bestItemsToCollect;
          }
          const bestScoreLast = bestScores[bestScores.length - 1];
          if (bestScoreLast) {
            minBestScore = bestScoreLast;
          }
        } else {
          filteredItems.push(i);
        }
      }

      this.refreshListWithCurrentResult = this.refreshList.bind(this, bestItems, overflowItems, filteredItems);

      // Process everything in chunks.
      if (i < this.provider.itemCount()) {
        this.scoringTimer = window.setTimeout(scoreItems.bind(this, i), 0);
        if (window.performance.now() - scoreStartTime > 50) {
          this.progressBarElement.style.transform = 'scaleX(' + i / this.provider.itemCount() + ')';
        }
        return;
      }
      if (window.performance.now() - scoreStartTime > 100) {
        this.progressBarElement.style.transform = 'scaleX(1)';
        this.progressBarElement.classList.add('filtered-widget-progress-fade');
      } else {
        this.progressBarElement.classList.add('hidden');
      }
      this.refreshListWithCurrentResult();
    }
  }

  private refreshList(bestItems: number[], overflowItems: number[], filteredItems: number[]): void {
    this.refreshListWithCurrentResult = undefined;
    filteredItems = [...bestItems, ...overflowItems, ...filteredItems];
    this.updateNotFoundMessage(Boolean(filteredItems.length));
    const oldHeight = this.list.element.offsetHeight;
    this.items.replaceAll(filteredItems);
    if (filteredItems.length) {
      this.list.selectItem(filteredItems[0]);
    }
    if (this.list.element.offsetHeight !== oldHeight) {
      this.list.viewportResized();
    }
    this.itemsFilteredForTest();
  }

  private updateNotFoundMessage(hasItems: boolean): void {
    this.list.element.classList.toggle('hidden', !hasItems);
    this.notFoundElement.classList.toggle('hidden', hasItems);
    if (!hasItems && this.provider) {
      this.notFoundElement.textContent = this.provider.notFoundText(this.cleanValue());
      UI.ARIAUtils.alert(this.notFoundElement.textContent);
    }
  }

  private onInput(event: TextPrompt.TextPrompt.PromptInputEvent): void {
    this.query = event.data;
    void this.queryChanged();
    this.scheduleFilter();
  }

  private async queryChanged(): Promise<void> {
    this.hintElement.classList.toggle('hidden', Boolean(this.query));
    if (this.queryChangedCallback) {
      await this.queryChangedCallback(this.query);
    }
    if (this.provider) {
      this.provider.queryChanged(this.cleanValue());
    }
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  private onKeyDown(keyboardEvent: KeyboardEvent): void {
    let handled = false;
    switch (keyboardEvent.key) {
      case Platform.KeyboardUtilities.ENTER_KEY:
        this.onEnter(keyboardEvent);
        return;
      case Platform.KeyboardUtilities.TAB_KEY:
        if (keyboardEvent.shiftKey) {
          handled = this.list.selectPreviousItem(true, false);
          break;
        }
        handled = this.tabKeyPressed();
        break;
      case Platform.KeyboardUtilities.ArrowKey.UP:
        handled = this.list.selectPreviousItem(true, false);
        break;
      case Platform.KeyboardUtilities.ArrowKey.DOWN:
        handled = this.list.selectNextItem(true, false);
        break;
      case Platform.KeyboardUtilities.PageKey.UP:
        handled = this.list.selectItemPreviousPage(false);
        break;
      case Platform.KeyboardUtilities.PageKey.DOWN:
        handled = this.list.selectItemNextPage(false);
        break;
    }
    if (handled) {
      keyboardEvent.consume(true);
    }
  }

  private scheduleFilter(): void {
    if (this.filterTimer) {
      return;
    }
    this.filterTimer = window.setTimeout(this.filterItems.bind(this), 0);
  }

  private selectItem(itemIndex: number|null): void {
    this.promptHistory.push(this.query);
    if (this.promptHistory.length > 100) {
      this.promptHistory.shift();
    }
    if (this.provider) {
      this.provider.selectItem(itemIndex, this.cleanValue());
    }
  }
}

export const enum Events {
  Hidden = 'hidden',
}

export type EventTypes = {
  [Events.Hidden]: void,
};

export class Provider {
  private refreshCallback!: () => void;
  constructor() {
  }

  setRefreshCallback(refreshCallback: () => void): void {
    this.refreshCallback = refreshCallback;
  }

  attach(): void {
  }

  itemCount(): number {
    return 0;
  }

  itemKeyAt(_itemIndex: number): string {
    return '';
  }

  itemScoreAt(_itemIndex: number, _query: string): number {
    return 1;
  }

  renderItem(_itemIndex: number, _query: string, _titleElement: Element, _subtitleElement: Element): void {
  }

  renderAsTwoRows(): boolean {
    return false;
  }

  selectItem(_itemIndex: number|null, _promptValue: string): void {
  }

  refresh(): void {
    if (this.refreshCallback) {
      this.refreshCallback();
    }
  }

  rewriteQuery(query: string): string {
    return query;
  }

  queryChanged(_query: string): void {
  }

  notFoundText(_query: string): string {
    return i18nString(UIStrings.noResultsFound);
  }

  detach(): void {
  }
}

const registeredProviders: ProviderRegistration[] = [];

export function registerProvider(registration: ProviderRegistration): void {
  registeredProviders.push(registration);
}
export function getRegisteredProviders(): ProviderRegistration[] {
  return registeredProviders;
}
export interface ProviderRegistration {
  prefix: string;
  iconName: string;
  iconWidth: string;
  provider: () => Promise<Provider>;
  titlePrefix: (() => string);
  titleSuggestion?: (() => string);
}
