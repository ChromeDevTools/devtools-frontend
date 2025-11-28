var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/quick_open/CommandMenu.js
var CommandMenu_exports = {};
__export(CommandMenu_exports, {
  Command: () => Command,
  CommandMenu: () => CommandMenu,
  CommandMenuProvider: () => CommandMenuProvider,
  ShowActionDelegate: () => ShowActionDelegate2
});
import "./../../../kit/kit.js";
import "./../../../components/highlighting/highlighting.js";
import * as Common2 from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as Diff3 from "./../../../../third_party/diff/diff.js";
import { html, nothing as nothing2 } from "./../../../lit/lit.js";
import * as UI2 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/quick_open/FilteredListWidget.js
var FilteredListWidget_exports = {};
__export(FilteredListWidget_exports, {
  FilteredListWidget: () => FilteredListWidget,
  Provider: () => Provider,
  getRegisteredProviders: () => getRegisteredProviders,
  registerProvider: () => registerProvider
});
import * as Common from "./../../../../core/common/common.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import * as Geometry from "./../../../../models/geometry/geometry.js";
import * as TextUtils from "./../../../../models/text_utils/text_utils.js";
import * as Diff from "./../../../../third_party/diff/diff.js";
import * as TextPrompt from "./../../../components/text_prompt/text_prompt.js";
import { nothing, render } from "./../../../lit/lit.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy.js";

// gen/front_end/ui/legacy/components/quick_open/filteredListWidget.css.js
var filteredListWidget_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.filtered-list-widget {
  display: flex;
  flex-direction: column;
  flex: auto;
  border: 1px solid transparent;
}

.hbox {
  flex: 0 0 var(--sys-size-14);
  padding: 0 var(--sys-size-8);
  gap: var(--sys-size-3);
  align-items: center;
}

.filtered-list-widget-hint {
  color: var(--sys-color-on-surface-subtle);
  font-size: var(--sys-typescale-body4-size);
  line-height: 18px;
}

devtools-text-prompt {
  flex-grow: 1;
  font-size: var(--sys-typescale-body3-size);
  gap: var(--sys-size-3);
  font-family: ".SFNSDisplay-Regular", "Helvetica Neue", "Lucida Grande", sans-serif;
  line-height: var(--sys-typescale-body3-line-height);
}

.filtered-list-widget-progress {
  flex: none;
  background: var(--sys-color-divider);
  height: var(--sys-size-1);
}

.filtered-list-widget-progress-bar {
  background-color: var(--sys-color-primary-bright);
  height: var(--sys-size-2);
  width: 100%;
  transform: scaleX(0);
  transform-origin: top left;
  opacity: 100%;
  transition: none;
}

.filtered-widget-progress-fade {
  opacity: 0%;
  transition: opacity 500ms;
}

.filtered-list-widget .vbox > div.container {
  flex: auto;
  overflow: hidden auto;
}

.filtered-list-widget-item {
  color: var(--sys-color-on-surface);
  display: flex;
  font-family: ".SFNSDisplay-Regular", "Helvetica Neue", "Lucida Grande", sans-serif;
  padding: 0 var(--sys-size-7);
  gap: var(--sys-size-7);
  height: var(--sys-size-14);
  white-space: break-spaces;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--sys-typescale-body4-size);
}

.filtered-list-widget-item devtools-icon {
  align-self: center;
  flex: none;
  width: 18px;
  height: 18px;

  &.snippet {
    color: var(--sys-color-orange-bright);
  }
}

.filtered-list-widget-item.selected {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.filtered-list-widget-item > div {
  flex: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--sys-typescale-body3-line-height);
  align-items: center;
  align-content: center;
  display: flex;
  gap: var(--sys-size-4);
}

.filtered-list-widget-item span.highlight {
  font-weight: var(--ref-typeface-weight-bold);
}

.filtered-list-widget-item .tag {
  font-size: var(--sys-typescale-body5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  align-self: center;
  flex-shrink: 0;
}

.filtered-list-widget-item .deprecated-tag {
  font-size: 11px;
  color: var(--sys-color-token-subtle);
}

.not-found-text {
  height: 34px;
  line-height: 34px;
  padding-left: 8px;
  font-style: italic;
  color: var(--sys-color-state-disabled);
  background: var(--sys-color-state-disabled-container);
}

.quickpick-description {
  flex: none;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--sys-color-state-disabled);
  padding-left: 15px;
}

@media (forced-colors: active) {
  .filtered-list-widget {
    forced-color-adjust: none;
    border-color: ButtonText;
  }

  .filtered-list-widget-item,
  .quickpick-description {
    color: ButtonText;
  }

  .filtered-list-widget-item.selected {
    background-color: Highlight;
    color: HighlightText;
  }

  devtools-text-prompt {
    border-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./filteredListWidget.css")} */`;

// gen/front_end/ui/legacy/components/quick_open/FilteredListWidget.js
var UIStrings = {
  /**
   * @description Aria label for quick open dialog prompt
   */
  quickOpenPrompt: "Quick open prompt",
  /**
   * @description Title of quick open dialog
   */
  quickOpen: "Quick open",
  /**
   * @description Text to show no results have been found
   */
  noResultsFound: "No results found",
  /**
   * @description Aria alert to read the item in list when navigating with screen readers
   * @example {name} PH1
   * @example {2} PH2
   * @example {5} PH3
   */
  sItemSOfS: "{PH1}, item {PH2} of {PH3}",
  /**
   * @description Text that should be read out by screen readers when a new badge is available
   */
  newFeature: "This is a new feature"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/quick_open/FilteredListWidget.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var FilteredListWidget = class extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
  promptHistory;
  scoringTimer;
  filterTimer;
  loadTimeout;
  refreshListWithCurrentResult;
  dialog;
  query = "";
  inputBoxElement;
  hintElement;
  bottomElementsContainer;
  progressElement;
  progressBarElement;
  items;
  list;
  itemElementsContainer;
  notFoundElement;
  prefix = "";
  provider;
  queryChangedCallback;
  constructor(provider, promptHistory, queryChangedCallback) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(filteredListWidget_css_default);
    this.promptHistory = promptHistory || [];
    this.scoringTimer = 0;
    this.filterTimer = 0;
    this.loadTimeout = 0;
    this.contentElement.classList.add("filtered-list-widget");
    const listener = this.onKeyDown.bind(this);
    this.contentElement.addEventListener("keydown", listener);
    UI.ARIAUtils.markAsCombobox(this.contentElement);
    const hbox = this.contentElement.createChild("div", "hbox");
    this.inputBoxElement = new TextPrompt.TextPrompt.TextPrompt();
    this.inputBoxElement.data = { ariaLabel: i18nString(UIStrings.quickOpenPrompt), prefix: "", suggestion: "" };
    this.inputBoxElement.addEventListener(TextPrompt.TextPrompt.PromptInputEvent.eventName, this.onInput.bind(this), false);
    this.inputBoxElement.setAttribute("jslog", `${VisualLogging.textField().track({
      change: true,
      keydown: "ArrowUp|ArrowDown|PageUp|PageDown|Enter|Tab|>|@|:|?|!"
    })}`);
    hbox.appendChild(this.inputBoxElement);
    this.hintElement = hbox.createChild("span", "filtered-list-widget-hint");
    this.bottomElementsContainer = this.contentElement.createChild("div", "vbox");
    this.progressElement = this.bottomElementsContainer.createChild("div", "filtered-list-widget-progress");
    this.progressBarElement = this.progressElement.createChild("div", "filtered-list-widget-progress-bar");
    this.items = new UI.ListModel.ListModel();
    this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.EqualHeightItems);
    this.itemElementsContainer = this.list.element;
    this.itemElementsContainer.classList.add("container");
    this.bottomElementsContainer.appendChild(this.itemElementsContainer);
    this.itemElementsContainer.addEventListener("click", this.onClick.bind(this), false);
    this.itemElementsContainer.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    UI.ARIAUtils.markAsListBox(this.itemElementsContainer);
    UI.ARIAUtils.setControls(this.inputBoxElement, this.itemElementsContainer);
    UI.ARIAUtils.setAutocomplete(
      this.inputBoxElement,
      "list"
      /* UI.ARIAUtils.AutocompleteInteractionModel.LIST */
    );
    this.notFoundElement = this.bottomElementsContainer.createChild("div", "not-found-text");
    this.notFoundElement.classList.add("hidden");
    this.setDefaultFocusedElement(this.inputBoxElement);
    this.provider = provider;
    this.queryChangedCallback = queryChangedCallback;
  }
  static getHighlightRanges(text, query, caseInsensitive) {
    if (!query) {
      return "";
    }
    function rangesForMatch(text2, query2) {
      const opcodes = Diff.Diff.DiffWrapper.charDiff(query2, text2);
      let offset = 0;
      const ranges2 = [];
      for (let i = 0; i < opcodes.length; ++i) {
        const opcode = opcodes[i];
        if (opcode[0] === Diff.Diff.Operation.Equal) {
          ranges2.push(new TextUtils.TextRange.SourceRange(offset, opcode[1].length));
        } else if (opcode[0] !== Diff.Diff.Operation.Insert) {
          return null;
        }
        offset += opcode[1].length;
      }
      return ranges2;
    }
    let ranges = rangesForMatch(text, query);
    if (!ranges || caseInsensitive) {
      ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
    }
    return ranges?.map((range) => `${range.offset},${range.length}`).join(" ") || "";
  }
  setCommandPrefix(commandPrefix) {
    this.inputBoxElement.setPrefix(commandPrefix);
  }
  setCommandSuggestion(suggestion) {
    this.inputBoxElement.setSuggestion(suggestion);
  }
  setHintElement(hint) {
    this.hintElement.textContent = hint;
  }
  showAsDialog(dialogTitle) {
    if (!dialogTitle) {
      dialogTitle = i18nString(UIStrings.quickOpen);
    }
    this.dialog = new UI.Dialog.Dialog("quick-open");
    UI.ARIAUtils.setLabel(this.dialog.contentElement, dialogTitle);
    this.dialog.setMaxContentSize(new Geometry.Size(576, 320));
    this.dialog.setSizeBehavior(
      "SetExactWidthMaxHeight"
      /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */
    );
    this.dialog.setContentPosition(null, 22);
    this.dialog.contentElement.style.setProperty("border-radius", "var(--sys-shape-corner-medium)");
    this.dialog.contentElement.style.setProperty("box-shadow", "var(--sys-elevation-level3)");
    this.show(this.dialog.contentElement);
    UI.ARIAUtils.setExpanded(this.contentElement, true);
    void this.dialog.once(
      "hidden"
      /* UI.Dialog.Events.HIDDEN */
    ).then(() => {
      this.dispatchEventToListeners(
        "hidden"
        /* Events.HIDDEN */
      );
    });
    this.dialog.show();
  }
  setPrefix(prefix) {
    this.prefix = prefix;
  }
  setProvider(provider) {
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
  setQuerySelectedRange(startIndex, endIndex) {
    this.inputBoxElement.setSelectedRange(startIndex, endIndex);
  }
  attachProvider() {
    this.items.replaceAll([]);
    this.list.invalidateItemHeight();
    if (this.provider) {
      this.provider.setRefreshCallback(this.itemsLoaded.bind(this, this.provider));
      this.provider.attach();
    }
    this.itemsLoaded(this.provider);
  }
  cleanValue() {
    return this.query.substring(this.prefix.length).trim();
  }
  wasShown() {
    super.wasShown();
    this.attachProvider();
  }
  willHide() {
    super.willHide();
    if (this.provider) {
      this.provider.detach();
    }
    this.clearTimers();
    UI.ARIAUtils.setExpanded(this.contentElement, false);
  }
  clearTimers() {
    clearTimeout(this.filterTimer);
    clearTimeout(this.scoringTimer);
    clearTimeout(this.loadTimeout);
    this.filterTimer = 0;
    this.scoringTimer = 0;
    this.loadTimeout = 0;
    this.refreshListWithCurrentResult = void 0;
  }
  onEnter(event) {
    if (!this.provider) {
      return;
    }
    event.preventDefault();
    const index = this.list.selectedIndex();
    if (index < 0) {
      return;
    }
    const element = this.list.elementAtIndex(index);
    if (element) {
      void VisualLogging.logClick(element, event);
    }
    const selectedIndexInProvider = this.provider.itemCount() ? this.list.selectedItem() : null;
    this.selectItem(selectedIndexInProvider);
    if (this.dialog) {
      this.dialog.hide();
    }
  }
  itemsLoaded(provider) {
    if (this.loadTimeout || provider !== this.provider) {
      return;
    }
    this.loadTimeout = window.setTimeout(this.updateAfterItemsLoaded.bind(this), 0);
  }
  updateAfterItemsLoaded() {
    this.loadTimeout = 0;
    this.filterItems();
  }
  createElementForItem(item2) {
    const wrapperElement = document.createElement("div");
    wrapperElement.className = "filtered-list-widget-item";
    if (this.provider) {
      render(this.provider.renderItem(item2, this.cleanValue()), wrapperElement);
      wrapperElement.setAttribute("jslog", `${VisualLogging.item(this.provider.jslogContextAt(item2)).track({ click: true })}`);
    }
    UI.ARIAUtils.markAsOption(wrapperElement);
    return wrapperElement;
  }
  heightForItem(_item) {
    return 0;
  }
  isItemSelectable(_item) {
    return true;
  }
  selectedItemChanged(_from, _to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("selected");
    }
    if (toElement) {
      toElement.classList.add("selected");
    }
    UI.ARIAUtils.setActiveDescendant(this.inputBoxElement, toElement);
  }
  onClick(event) {
    const item2 = this.list.itemForNode(event.target);
    if (item2 === null) {
      return;
    }
    event.consume(true);
    this.selectItem(item2);
    if (this.dialog) {
      this.dialog.hide();
    }
  }
  onMouseMove(event) {
    const item2 = this.list.itemForNode(event.target);
    if (item2 === null) {
      return;
    }
    this.list.selectItem(item2);
    const selectedElement = this.list.elementAtIndex(this.list.selectedIndex());
    const children = selectedElement.querySelectorAll("*");
    const text = Array.from(children).filter((e) => !e.children.length).map((e) => e.classList.contains("new-badge") ? i18nString(UIStrings.newFeature) : e.textContent).join();
    if (text) {
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sItemSOfS, { PH1: text, PH2: this.list.selectedIndex() + 1, PH3: this.items.length }));
    }
  }
  setQuery(query) {
    this.query = query;
    this.inputBoxElement.focus();
    this.inputBoxElement.setText(query);
    void this.queryChanged();
    this.scheduleFilter();
  }
  tabKeyPressed() {
    const userEnteredText = this.query;
    let completion;
    for (let i = this.promptHistory.length - 1; i >= 0; i--) {
      if (this.promptHistory[i] !== userEnteredText && this.promptHistory[i].startsWith(userEnteredText)) {
        completion = this.promptHistory[i];
        break;
      }
    }
    if (completion) {
      const selection = this.inputBoxElement.getComponentSelection();
      if (selection && selection.toString().trim() !== "") {
        this.setQuery(completion);
        return true;
      }
      this.inputBoxElement.focus();
      this.inputBoxElement.setText(completion);
      this.inputBoxElement.setSuggestion("");
      this.setQuerySelectedRange(userEnteredText.length, completion.length);
      return true;
    }
    return this.list.selectNextItem(true, false);
  }
  itemsFilteredForTest() {
  }
  filterItems() {
    this.filterTimer = 0;
    if (this.scoringTimer) {
      clearTimeout(this.scoringTimer);
      this.scoringTimer = 0;
      if (this.refreshListWithCurrentResult) {
        this.refreshListWithCurrentResult();
      }
    }
    if (!this.provider) {
      this.bottomElementsContainer.classList.toggle("hidden", true);
      this.itemsFilteredForTest();
      return;
    }
    this.bottomElementsContainer.classList.toggle("hidden", false);
    this.progressBarElement.style.transform = "scaleX(0)";
    this.progressBarElement.classList.remove("filtered-widget-progress-fade", "hidden");
    const query = this.provider.rewriteQuery(this.cleanValue());
    const filterRegex = query ? Platform.StringUtilities.filterRegex(query) : null;
    const filteredItems = [];
    const bestScores = [];
    const bestItems = [];
    const bestItemsToCollect = 100;
    let minBestScore = 0;
    const overflowItems = [];
    const scoreStartTime = window.performance.now();
    const maxWorkItems = Platform.NumberUtilities.clamp(10, 500, this.provider.itemCount() / 10 | 0);
    scoreItems.call(this, 0);
    function compareIntegers(a, b) {
      return b - a;
    }
    function scoreItems(fromIndex) {
      if (!this.provider) {
        return;
      }
      this.scoringTimer = 0;
      let workDone = 0;
      let i;
      for (i = fromIndex; i < this.provider.itemCount() && workDone < maxWorkItems; ++i) {
        if (filterRegex && !filterRegex.test(this.provider.itemKeyAt(i))) {
          continue;
        }
        const score = this.provider.itemScoreAt(i, query);
        if (query) {
          workDone++;
        }
        if (score > minBestScore || bestScores.length < bestItemsToCollect) {
          const index = Platform.ArrayUtilities.upperBound(bestScores, score, compareIntegers);
          bestScores.splice(index, 0, score);
          bestItems.splice(index, 0, i);
          if (bestScores.length > bestItemsToCollect) {
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
      if (i < this.provider.itemCount()) {
        this.scoringTimer = window.setTimeout(scoreItems.bind(this, i), 0);
        if (window.performance.now() - scoreStartTime > 50) {
          this.progressBarElement.style.transform = "scaleX(" + i / this.provider.itemCount() + ")";
        }
        return;
      }
      if (window.performance.now() - scoreStartTime > 100) {
        this.progressBarElement.style.transform = "scaleX(1)";
        this.progressBarElement.classList.add("filtered-widget-progress-fade");
      } else {
        this.progressBarElement.classList.add("hidden");
      }
      this.refreshListWithCurrentResult();
    }
  }
  refreshList(bestItems, overflowItems, filteredItems) {
    this.refreshListWithCurrentResult = void 0;
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
  updateNotFoundMessage(hasItems) {
    this.list.element.classList.toggle("hidden", !hasItems);
    this.notFoundElement.classList.toggle("hidden", hasItems);
    if (!hasItems && this.provider) {
      this.notFoundElement.textContent = this.provider.notFoundText(this.cleanValue());
      UI.ARIAUtils.LiveAnnouncer.alert(this.notFoundElement.textContent);
    }
  }
  onInput(event) {
    this.query = event.data;
    void this.queryChanged();
    this.scheduleFilter();
  }
  async queryChanged() {
    this.hintElement.classList.toggle("hidden", Boolean(this.query));
    if (this.queryChangedCallback) {
      await this.queryChangedCallback(this.query);
    }
    if (this.provider) {
      this.provider.queryChanged(this.cleanValue());
    }
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  onKeyDown(keyboardEvent) {
    let handled = false;
    switch (keyboardEvent.key) {
      case Platform.KeyboardUtilities.ENTER_KEY:
        if (!keyboardEvent.isComposing) {
          this.onEnter(keyboardEvent);
        }
        return;
      case Platform.KeyboardUtilities.TAB_KEY:
        if (keyboardEvent.shiftKey) {
          handled = this.list.selectPreviousItem(true, false);
          break;
        }
        handled = this.tabKeyPressed();
        break;
      case "ArrowUp":
        handled = this.list.selectPreviousItem(true, false);
        break;
      case "ArrowDown":
        handled = this.list.selectNextItem(true, false);
        break;
      case "PageUp":
        handled = this.list.selectItemPreviousPage(false);
        break;
      case "PageDown":
        handled = this.list.selectItemNextPage(false);
        break;
    }
    if (handled) {
      keyboardEvent.consume(true);
      const text = this.list.elementAtIndex(this.list.selectedIndex())?.textContent;
      if (text) {
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sItemSOfS, { PH1: text, PH2: this.list.selectedIndex() + 1, PH3: this.items.length }));
      }
    }
  }
  scheduleFilter() {
    if (this.filterTimer) {
      return;
    }
    this.filterTimer = window.setTimeout(this.filterItems.bind(this), 0);
  }
  selectItem(itemIndex) {
    this.promptHistory.push(this.query);
    if (this.promptHistory.length > 100) {
      this.promptHistory.shift();
    }
    if (this.provider) {
      this.provider.selectItem(itemIndex, this.cleanValue());
    }
  }
};
var Provider = class {
  refreshCallback;
  jslogContext;
  constructor(jslogContext) {
    this.jslogContext = jslogContext;
  }
  setRefreshCallback(refreshCallback) {
    this.refreshCallback = refreshCallback;
  }
  attach() {
  }
  itemCount() {
    return 0;
  }
  itemKeyAt(_itemIndex) {
    return "";
  }
  itemScoreAt(_itemIndex, _query) {
    return 1;
  }
  renderItem(_itemIndex, _query) {
    return nothing;
  }
  jslogContextAt(_itemIndex) {
    return this.jslogContext;
  }
  selectItem(_itemIndex, _promptValue) {
  }
  refresh() {
    if (this.refreshCallback) {
      this.refreshCallback();
    }
  }
  rewriteQuery(query) {
    return query;
  }
  queryChanged(_query) {
  }
  notFoundText(_query) {
    return i18nString(UIStrings.noResultsFound);
  }
  detach() {
  }
};
var registeredProviders = [];
function registerProvider(registration) {
  registeredProviders.push(registration);
}
function getRegisteredProviders() {
  return registeredProviders;
}

// gen/front_end/ui/legacy/components/quick_open/QuickOpen.js
var QuickOpen_exports = {};
__export(QuickOpen_exports, {
  QuickOpenImpl: () => QuickOpenImpl,
  ShowActionDelegate: () => ShowActionDelegate,
  history: () => history
});
import * as i18n3 from "./../../../../core/i18n/i18n.js";
var UIStrings2 = {
  /**
   * @description Text of the hint shows under Quick Open input box
   */
  typeToSeeAvailableCommands: "Type ? to see available commands"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/quick_open/QuickOpen.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var history = [];
var QuickOpenImpl = class {
  prefix = null;
  prefixes = [];
  providers = /* @__PURE__ */ new Map();
  filteredListWidget = null;
  constructor() {
    getRegisteredProviders().forEach(this.addProvider.bind(this));
    this.prefixes.sort((a, b) => b.length - a.length);
  }
  static show(query) {
    const quickOpen = new this();
    const filteredListWidget = new FilteredListWidget(null, history, quickOpen.queryChanged.bind(quickOpen));
    quickOpen.filteredListWidget = filteredListWidget;
    filteredListWidget.setHintElement(i18nString2(UIStrings2.typeToSeeAvailableCommands));
    filteredListWidget.showAsDialog();
    filteredListWidget.setQuery(query);
  }
  addProvider(extension) {
    const prefix = extension.prefix;
    if (prefix === null) {
      return;
    }
    this.prefixes.push(prefix);
    this.providers.set(prefix, {
      provider: extension.provider,
      titlePrefix: extension.titlePrefix,
      titleSuggestion: extension.titleSuggestion
    });
  }
  async queryChanged(query) {
    const prefix = this.prefixes.find((prefix2) => query.startsWith(prefix2));
    if (typeof prefix !== "string") {
      return;
    }
    if (!this.filteredListWidget) {
      return;
    }
    this.filteredListWidget.setPrefix(prefix);
    const titlePrefixFunction = this.providers.get(prefix)?.titlePrefix;
    this.filteredListWidget.setCommandPrefix(titlePrefixFunction ? titlePrefixFunction() : "");
    const titleSuggestionFunction = query === prefix && this.providers.get(prefix)?.titleSuggestion;
    this.filteredListWidget.setCommandSuggestion(titleSuggestionFunction ? prefix + titleSuggestionFunction() : "");
    if (this.prefix === prefix) {
      return;
    }
    this.prefix = prefix;
    this.filteredListWidget.setProvider(null);
    const providerFunction = this.providers.get(prefix)?.provider;
    if (!providerFunction) {
      return;
    }
    const provider = await providerFunction();
    if (this.prefix !== prefix || !this.filteredListWidget) {
      return;
    }
    this.filteredListWidget.setProvider(provider);
    this.providerLoadedForTest(provider);
  }
  providerLoadedForTest(_provider) {
  }
};
var ShowActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "quick-open.show":
        QuickOpenImpl.show("");
        return true;
    }
    return false;
  }
};

// gen/front_end/ui/legacy/components/quick_open/CommandMenu.js
var UIStrings3 = {
  /**
   * @description Message to display if a setting change requires a reload of DevTools
   */
  oneOrMoreSettingsHaveChanged: "One or more settings have changed which requires a reload to take effect",
  /**
   * @description Text in Command Menu of the Command Menu
   */
  noCommandsFound: "No commands found",
  /**
   * @description Text for command prefix of run a command
   */
  run: "Run",
  /**
   * @description Text for command suggestion of run a command
   */
  command: "Command",
  /**
   * @description Text for help title of run command menu
   */
  runCommand: "Run command",
  /**
   * @description Hint text to indicate that a selected command is deprecated
   */
  deprecated: "\u2014 deprecated"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/quick_open/CommandMenu.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var commandMenuInstance;
var CommandMenu = class _CommandMenu {
  #commands;
  constructor() {
    this.#commands = [];
    this.loadCommands();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!commandMenuInstance || forceNew) {
      commandMenuInstance = new _CommandMenu();
    }
    return commandMenuInstance;
  }
  static createCommand(options) {
    const { category, keys, title, shortcut, jslogContext, executeHandler, availableHandler, userActionCode, deprecationWarning, isPanelOrDrawer, featurePromotionId } = options;
    let handler = executeHandler;
    if (userActionCode) {
      const actionCode = userActionCode;
      handler = () => {
        Host.userMetrics.actionTaken(actionCode);
        executeHandler();
      };
    }
    return new Command(category, title, keys, shortcut, jslogContext, handler, availableHandler, deprecationWarning, isPanelOrDrawer, featurePromotionId);
  }
  static createSettingCommand(setting, title, value) {
    const category = setting.category();
    if (!category) {
      throw new Error(`Creating '${title}' setting command failed. Setting has no category.`);
    }
    const tags = setting.tags() || "";
    const reloadRequired = Boolean(setting.reloadRequired());
    return _CommandMenu.createCommand({
      category: Common2.Settings.getLocalizedSettingsCategory(category),
      keys: tags,
      title,
      shortcut: "",
      jslogContext: Platform2.StringUtilities.toKebabCase(`${setting.name}-${value}`),
      executeHandler: () => {
        if (setting.deprecation?.disabled && (!setting.deprecation?.experiment || setting.deprecation.experiment.isEnabled())) {
          void Common2.Revealer.reveal(setting);
          return;
        }
        setting.set(value);
        if (setting.name === "emulate-page-focus") {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ToggleEmulateFocusedPageFromCommandMenu);
        }
        if (reloadRequired) {
          UI2.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString3(UIStrings3.oneOrMoreSettingsHaveChanged));
        }
      },
      availableHandler,
      deprecationWarning: setting.deprecation?.warning
    });
    function availableHandler() {
      return setting.get() !== value;
    }
  }
  static createActionCommand(options) {
    const { action, userActionCode } = options;
    const category = action.category();
    if (!category) {
      throw new Error(`Creating '${action.title()}' action command failed. Action has no category.`);
    }
    let panelOrDrawer = void 0;
    if (category === "DRAWER") {
      panelOrDrawer = "DRAWER";
    }
    const shortcut = UI2.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action.id()) || "";
    return _CommandMenu.createCommand({
      category: UI2.ActionRegistration.getLocalizedActionCategory(category),
      keys: action.tags() || "",
      title: action.title(),
      shortcut,
      jslogContext: action.id(),
      executeHandler: action.execute.bind(action),
      userActionCode,
      availableHandler: void 0,
      isPanelOrDrawer: panelOrDrawer
    });
  }
  static createRevealViewCommand(options) {
    const { title, tags, category, userActionCode, id, featurePromotionId } = options;
    if (!category) {
      throw new Error(`Creating '${title}' reveal view command failed. Reveal view has no category.`);
    }
    let panelOrDrawer = void 0;
    if (category === "PANEL") {
      panelOrDrawer = "PANEL";
    } else if (category === "DRAWER") {
      panelOrDrawer = "DRAWER";
    }
    const executeHandler = () => {
      if (id === "issues-pane") {
        Host.userMetrics.issuesPanelOpenedFrom(
          5
          /* Host.UserMetrics.IssueOpener.COMMAND_MENU */
        );
      }
      if (featurePromotionId) {
        UI2.UIUtils.PromotionManager.instance().recordFeatureInteraction(featurePromotionId);
      }
      return UI2.ViewManager.ViewManager.instance().showView(
        id,
        /* userGesture */
        true
      );
    };
    return _CommandMenu.createCommand({
      category: UI2.ViewManager.getLocalizedViewLocationCategory(category),
      keys: tags,
      title,
      shortcut: "",
      jslogContext: id,
      executeHandler,
      userActionCode,
      availableHandler: void 0,
      isPanelOrDrawer: panelOrDrawer,
      featurePromotionId
    });
  }
  loadCommands() {
    const locations = /* @__PURE__ */ new Map();
    for (const { category, name } of UI2.ViewManager.getRegisteredLocationResolvers()) {
      if (category && name) {
        locations.set(name, category);
      }
    }
    const views = UI2.ViewManager.ViewManager.instance().getRegisteredViewExtensions();
    for (const view of views) {
      const viewLocation = view.location();
      const category = viewLocation && locations.get(viewLocation);
      if (!category) {
        continue;
      }
      const options = {
        title: view.commandPrompt(),
        tags: view.tags() || "",
        category,
        id: view.viewId(),
        featurePromotionId: view.featurePromotionId()
      };
      this.#commands.push(_CommandMenu.createRevealViewCommand(options));
    }
    const settingsRegistrations = Common2.Settings.Settings.instance().getRegisteredSettings();
    for (const settingRegistration of settingsRegistrations) {
      const options = settingRegistration.options;
      if (!options || !settingRegistration.category) {
        continue;
      }
      for (const pair of options) {
        const setting = Common2.Settings.Settings.instance().moduleSetting(settingRegistration.settingName);
        this.#commands.push(_CommandMenu.createSettingCommand(setting, pair.title(), pair.value));
      }
    }
  }
  commands() {
    return this.#commands;
  }
};
var CommandMenuProvider = class extends Provider {
  commands;
  constructor(commandsForTest = []) {
    super("command");
    this.commands = commandsForTest;
  }
  attach() {
    const allCommands = CommandMenu.instance().commands();
    const actions = UI2.ActionRegistry.ActionRegistry.instance().availableActions();
    for (const action of actions) {
      const category = action.category();
      if (!category) {
        continue;
      }
      this.commands.push(CommandMenu.createActionCommand({ action }));
    }
    for (const command of allCommands) {
      if (!command.available()) {
        continue;
      }
      if (this.commands.find(({ title, category }) => title === command.title && category === command.category)) {
        continue;
      }
      this.commands.push(command);
    }
    this.commands = this.commands.sort(commandComparator);
    function commandComparator(left, right) {
      const cats = Platform2.StringUtilities.compare(left.category, right.category);
      return cats ? cats : Platform2.StringUtilities.compare(left.title, right.title);
    }
  }
  detach() {
    this.commands = [];
  }
  itemCount() {
    return this.commands.length;
  }
  itemKeyAt(itemIndex) {
    return this.commands[itemIndex].key;
  }
  itemScoreAt(itemIndex, query) {
    const command = this.commands[itemIndex];
    let score = Diff3.Diff.DiffWrapper.characterScore(query.toLowerCase(), command.title.toLowerCase());
    const promotionId = command.featurePromotionId;
    if (promotionId && UI2.UIUtils.PromotionManager.instance().canShowPromotion(promotionId)) {
      score = Number.MAX_VALUE;
      return score;
    }
    if (command.isPanelOrDrawer === "PANEL") {
      score += 2;
    } else if (command.isPanelOrDrawer === "DRAWER") {
      score += 1;
    }
    return score;
  }
  renderItem(itemIndex, query) {
    const command = this.commands[itemIndex];
    const badge = command.featurePromotionId ? UI2.UIUtils.maybeCreateNewBadge(command.featurePromotionId) : void 0;
    const deprecationWarning = command.deprecationWarning;
    return html`
      <devtools-icon name=${categoryIcons[command.category]}></devtools-icon>
      <div>
        <devtools-highlight type="markup" ranges=${FilteredListWidget.getHighlightRanges(command.title, query, true)}>
          ${command.title}
        </devtools-highlight>
        ${badge ?? nothing2}
        <div>${command.shortcut}</div>
        ${deprecationWarning ? html`
          <span class="deprecated-tag" title=${deprecationWarning}>
            ${i18nString3(UIStrings3.deprecated)}
          </span>` : nothing2}
      </div>
      <span class="tag">${command.category}</span>`;
  }
  jslogContextAt(itemIndex) {
    return this.commands[itemIndex].jslogContext;
  }
  selectItem(itemIndex, _promptValue) {
    if (itemIndex === null) {
      return;
    }
    this.commands[itemIndex].execute();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectCommandFromCommandMenu);
  }
  notFoundText() {
    return i18nString3(UIStrings3.noCommandsFound);
  }
};
var categoryIcons = {
  Appearance: "palette",
  Console: "terminal",
  Debugger: "bug",
  Drawer: "keyboard-full",
  Elements: "code",
  Global: "global",
  Grid: "grid-on",
  Help: "help",
  Mobile: "devices",
  Navigation: "refresh",
  Network: "arrow-up-down",
  Panel: "frame",
  Performance: "performance",
  Persistence: "override",
  Recorder: "record-start",
  Rendering: "tonality",
  Resources: "bin",
  Screenshot: "photo-camera",
  Settings: "gear",
  Sources: "label"
};
var Command = class {
  category;
  title;
  key;
  shortcut;
  jslogContext;
  deprecationWarning;
  isPanelOrDrawer;
  featurePromotionId;
  #executeHandler;
  #availableHandler;
  constructor(category, title, key, shortcut, jslogContext, executeHandler, availableHandler, deprecationWarning, isPanelOrDrawer, featurePromotionId) {
    this.category = category;
    this.title = title;
    this.key = category + "\0" + title + "\0" + key;
    this.shortcut = shortcut;
    this.jslogContext = jslogContext;
    this.#executeHandler = executeHandler;
    this.#availableHandler = availableHandler;
    this.deprecationWarning = deprecationWarning;
    this.isPanelOrDrawer = isPanelOrDrawer;
    this.featurePromotionId = featurePromotionId;
  }
  available() {
    return this.#availableHandler ? this.#availableHandler() : true;
  }
  execute() {
    return this.#executeHandler();
  }
};
var ShowActionDelegate2 = class {
  handleAction(_context, _actionId) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    QuickOpenImpl.show(">");
    return true;
  }
};
registerProvider({
  prefix: ">",
  iconName: "chevron-right",
  provider: () => Promise.resolve(new CommandMenuProvider()),
  helpTitle: () => i18nString3(UIStrings3.runCommand),
  titlePrefix: () => i18nString3(UIStrings3.run),
  titleSuggestion: () => i18nString3(UIStrings3.command)
});

// gen/front_end/ui/legacy/components/quick_open/HelpQuickOpen.js
var HelpQuickOpen_exports = {};
__export(HelpQuickOpen_exports, {
  HelpQuickOpen: () => HelpQuickOpen
});
import "./../../../kit/kit.js";
import { html as html2 } from "./../../../lit/lit.js";
var HelpQuickOpen = class extends Provider {
  providers;
  constructor(jslogContext) {
    super(jslogContext);
    this.providers = [];
    getRegisteredProviders().forEach(this.addProvider.bind(this));
  }
  async addProvider(extension) {
    this.providers.push({
      prefix: extension.prefix || "",
      iconName: extension.iconName,
      title: extension.helpTitle(),
      jslogContext: (await extension.provider()).jslogContext
    });
  }
  itemCount() {
    return this.providers.length;
  }
  itemKeyAt(itemIndex) {
    return this.providers[itemIndex].prefix;
  }
  itemScoreAt(itemIndex, _query) {
    return -this.providers[itemIndex].prefix.length;
  }
  renderItem(itemIndex, _query) {
    const provider = this.providers[itemIndex];
    return html2`
      <devtools-icon class="large" name=${provider.iconName}></devtools-icon>
      <div>
        <div>${provider.title}</div>
      </div>`;
  }
  jslogContextAt(itemIndex) {
    return this.providers[itemIndex].jslogContext;
  }
  selectItem(itemIndex, _promptValue) {
    if (itemIndex !== null) {
      QuickOpenImpl.show(this.providers[itemIndex].prefix);
    }
  }
};
registerProvider({
  prefix: "?",
  iconName: "help",
  provider: () => Promise.resolve(new HelpQuickOpen("help")),
  helpTitle: () => "Help",
  titlePrefix: () => "Help",
  titleSuggestion: void 0
});
export {
  CommandMenu_exports as CommandMenu,
  FilteredListWidget_exports as FilteredListWidget,
  HelpQuickOpen_exports as HelpQuickOpen,
  QuickOpen_exports as QuickOpen
};
//# sourceMappingURL=quick_open.js.map
