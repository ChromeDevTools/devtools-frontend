// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import categorizedBreakpointsSidebarPaneStyles from './categorizedBreakpointsSidebarPane.css.js';

const UIStrings = {
  /**
   * @description Category of breakpoints
   */
  auctionWorklet: 'Ad Auction Worklet',
  /**
   * @description Text that refers to the animation of the web page
   */
  animation: 'Animation',
  /**
   * @description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
  /**
   * @description Text in DOMDebugger Model
   */
  canvas: 'Canvas',
  /**
   * @description Text in DOMDebugger Model
   */
  clipboard: 'Clipboard',
  /**
   * @description Noun. Describes a group of DOM events (such as 'select' and 'submit') in this context.
   */
  control: 'Control',
  /**
   * @description Text that refers to device such as a phone
   */
  device: 'Device',
  /**
   * @description Text in DOMDebugger Model
   */
  domMutation: 'DOM Mutation',
  /**
   * @description Text in DOMDebugger Model
   */
  dragDrop: 'Drag / drop',
  /**
   * @description Title for a group of cities
   */
  geolocation: 'Geolocation',
  /**
   * @description Text in DOMDebugger Model
   */
  keyboard: 'Keyboard',
  /**
   * @description Text to load something
   */
  load: 'Load',
  /**
   * @description Text that appears on a button for the media resource type filter.
   */
  media: 'Media',
  /**
   * @description Text in DOMDebugger Model
   */
  mouse: 'Mouse',
  /**
   * @description Text in DOMDebugger Model
   */
  notification: 'Notification',
  /**
   * @description Text to parse something
   */
  parse: 'Parse',
  /**
   * @description Text in DOMDebugger Model
   */
  pictureinpicture: 'Picture-in-Picture',
  /**
   * @description Text in DOMDebugger Model
   */
  pointer: 'Pointer',
  /**
   * @description Label for a group of JavaScript files
   */
  script: 'Script',
  /**
   * @description Category of breakpoints
   */
  sharedStorageWorklet: 'Shared Storage Worklet',
  /**
   * @description Text in DOMDebugger Model
   */
  timer: 'Timer',
  /**
   * @description Text for the touch type to simulate on a device
   */
  touch: 'Touch',
  /**
   * @description Title for a category of breakpoints on Trusted Type violations
   */
  trustedTypeViolations: 'Trusted Type Violations',
  /**
   * @description Title of the WebAudio tool
   */
  webaudio: 'WebAudio',
  /**
   * @description Text in DOMDebugger Model
   */
  window: 'Window',
  /**
   * @description Text for the service worker type.
   */
  worker: 'Worker',
  /**
   * @description Text that appears on a button for the xhr resource type filter.
   */
  xhr: 'XHR',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/CategorizedBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const {html, render} = Lit;

interface ViewInput {
  onFilterChanged: (ev: CustomEvent<string|null>) => void;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

const DEFAULT_VIEW = (input: ViewInput, _output: object, target: HTMLElement): void => {
  render(
      // clang-format off
    html`
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-toolbar-input
        type="filter"
        @change=${input.onFilterChanged}
        style="flex: 1;"
        ></devtools-toolbar-input>
    </devtools-toolbar>`,
      // clang-format on
      target);
};

export class FilterToolbar extends Common.ObjectWrapper.eventMixin<FilterToolbar.EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  readonly #view: View;
  #filterText: string|null = null;
  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;

    this.performUpdate();
  }

  get filterText(): string|null {
    return this.#filterText;
  }

  override performUpdate(): void {
    const input: ViewInput = {
      onFilterChanged: e => {
        this.#filterText = e.detail;
        this.dispatchEventToListeners(FilterToolbar.Events.FILTER_CHANGED, e.detail);
      },
    };
    this.#view(input, {}, this.contentElement);
  }
}

export namespace FilterToolbar {
  export enum Events {FILTER_CHANGED = 'filter-changed'}
  export interface EventTypes {
    [Events.FILTER_CHANGED]: string|null;
  }
}

export abstract class CategorizedBreakpointsSidebarPane extends UI.Widget.VBox {
  readonly #categoriesTreeOutline: UI.TreeOutline.TreeOutlineInShadow;
  readonly #viewId: string;
  readonly #detailsPausedReason: Protocol.Debugger.PausedEventReason;
  readonly #categories: Map<SDK.CategorizedBreakpoint.Category, Item>;
  readonly #breakpoints: Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item>;
  #highlightedElement?: HTMLLIElement;
  #sortedCategories: SDK.CategorizedBreakpoint.Category[];
  protected readonly filterToolbar: FilterToolbar;
  #expandedForFilter = new Set<SDK.CategorizedBreakpoint.Category>();
  constructor(
      breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[], viewId: string,
      detailsPausedReason: Protocol.Debugger.PausedEventReason) {
    super({useShadowDom: true});
    this.filterToolbar = new FilterToolbar();
    this.filterToolbar.addEventListener(FilterToolbar.Events.FILTER_CHANGED, this.#onFilterChanged.bind(this));
    this.filterToolbar.show(this.contentElement);
    this.#categoriesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.#categoriesTreeOutline.registerRequiredCSS(categorizedBreakpointsSidebarPaneStyles);

    this.#categoriesTreeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.contentElement.appendChild(this.#categoriesTreeOutline.element);
    this.#viewId = viewId;
    this.#detailsPausedReason = detailsPausedReason;

    const categories = new Set(breakpoints.map(bp => bp.category()));
    this.#sortedCategories = [...categories].sort((a, b) => {
      const categoryA = getLocalizedCategory(a);
      const categoryB = getLocalizedCategory(b);
      return categoryA.localeCompare(categoryB, i18n.DevToolsLocale.DevToolsLocale.instance().locale);
    });
    this.#categories = new Map();
    for (const category of this.#sortedCategories) {
      this.createCategory(category);
    }
    if (this.#sortedCategories.length > 0) {
      const firstCategory = this.#categories.get(this.#sortedCategories[0]);
      if (firstCategory) {
        firstCategory.element.select();
      }
    }

    this.#breakpoints = new Map();
    for (const breakpoint of breakpoints) {
      this.createBreakpoint(breakpoint);
    }

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this.update, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.update, this);

    this.populate();
  }

  get categories(): Map<SDK.CategorizedBreakpoint.Category, Item> {
    return this.#categories;
  }

  get breakpoints(): Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item> {
    return this.#breakpoints;
  }

  protected get treeOutline(): UI.TreeOutline.TreeOutline {
    return this.#categoriesTreeOutline;
  }

  override focus(): void {
    this.#categoriesTreeOutline.forceSelect();
  }

  private handleSpaceKeyEventOnBreakpoint(event: KeyboardEvent, breakpoint?: Item): void {
    if (event && event.key === ' ') {
      if (breakpoint) {
        breakpoint.checkbox.click();
      }
      event.consume(true);
    }
  }

  private createCategory(name: SDK.CategorizedBreakpoint.Category): void {
    const labelNode =
        UI.UIUtils.CheckboxLabel.create(getLocalizedCategory(name), undefined, undefined, name, /* small */ true);
    labelNode.addEventListener('click', this.categoryCheckboxClicked.bind(this, name), true);
    labelNode.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode, undefined, name);
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    labelNode.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);

    this.#categories.set(name, {element: treeElement, checkbox: labelNode, category: name});
  }

  protected createBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): void {
    const labelNode = UI.UIUtils.CheckboxLabel.create(
        Sources.CategorizedBreakpointL10n.getLocalizedBreakpointName(breakpoint.name), undefined, undefined,
        Platform.StringUtilities.toKebabCase(breakpoint.name), /* small */ true);
    labelNode.classList.add('source-code', 'breakpoint');
    labelNode.addEventListener('click', this.breakpointCheckboxClicked.bind(this, breakpoint), true);
    labelNode.tabIndex = -1;

    const treeElement =
        new UI.TreeOutline.TreeElement(labelNode, undefined, Platform.StringUtilities.toKebabCase(breakpoint.name));
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    labelNode.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    treeElement.listItemElement.createChild('div', 'breakpoint-hit-marker');
    const category = this.#categories.get(breakpoint.category());
    if (category) {
      this.#breakpoints.set(breakpoint, {element: treeElement, checkbox: labelNode, category: category.category});
    }
  }

  protected getBreakpointFromPausedDetails(_details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    return null;
  }

  update(): void {
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    const details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    if (!details || details.reason !== this.#detailsPausedReason || !details.auxData) {
      if (this.#highlightedElement) {
        UI.ARIAUtils.setDescription(this.#highlightedElement, '');
        this.#highlightedElement.classList.remove('breakpoint-hit');
        this.#highlightedElement = undefined;
      }
      return;
    }
    const breakpoint = this.getBreakpointFromPausedDetails(details);
    if (!breakpoint) {
      return;
    }

    void UI.ViewManager.ViewManager.instance().showView(this.#viewId);
    const category = this.#categories.get(breakpoint.category());
    if (category) {
      category.element.expand();
      this.#expandedForFilter.delete(category.category);
    }
    const matchingBreakpoint = this.#breakpoints.get(breakpoint);
    if (matchingBreakpoint) {
      this.#highlightedElement = matchingBreakpoint.element.listItemElement;
      UI.ARIAUtils.setDescription(this.#highlightedElement, i18nString(UIStrings.breakpointHit));
      this.#highlightedElement.classList.add('breakpoint-hit');
    }

    this.populate(this.filterToolbar.filterText);
  }

  #onFilterChanged(e: Common.EventTarget.EventTargetEvent<string|null>): void {
    this.populate(e.data);
  }

  protected populate(filterText: string|null = null): void {
    this.#categoriesTreeOutline.removeChildren();
    for (const category of this.#sortedCategories) {
      this.categories.get(category)?.element.removeChildren();
    }
    const nonEmptyCategories = new Set<SDK.CategorizedBreakpoint.Category>();
    for (const [breakpoint, item] of this.#breakpoints) {
      if (!filterText || breakpoint.name.match(filterText) ||
          item.element.listItemElement === this.#highlightedElement) {
        const categoryItem = this.categories.get(breakpoint.category());
        if (!categoryItem) {
          continue;
        }
        if (!nonEmptyCategories.has(breakpoint.category())) {
          nonEmptyCategories.add(breakpoint.category());
        }
        categoryItem.element.appendChild(item.element);
      }
    }

    for (const category of this.#sortedCategories) {
      if (nonEmptyCategories.has(category)) {
        const treeElement = (this.categories.get(category) as Item).element;
        this.#categoriesTreeOutline.appendChild(treeElement);
        if (filterText && !treeElement.expanded) {
          this.#expandedForFilter.add(category);
          treeElement.expand();
        } else if (!filterText && this.#expandedForFilter.has(category)) {
          this.#expandedForFilter.delete(category);
          treeElement.collapse();
        }
      }
    }
  }

  // Probably can be kept although eventListener does not call this._breakpointCheckboxClicke
  private categoryCheckboxClicked(category: SDK.CategorizedBreakpoint.Category): void {
    const item = this.#categories.get(category);
    if (!item) {
      return;
    }

    const enabled = item.checkbox.checked;
    UI.ARIAUtils.setChecked(item.element.listItemElement, enabled);

    for (const [breakpoint, treeItem] of this.#breakpoints) {
      if (breakpoint.category() === category) {
        const matchingBreakpoint = this.#breakpoints.get(breakpoint);
        if (matchingBreakpoint) {
          matchingBreakpoint.checkbox.checked = enabled;
          this.toggleBreakpoint(breakpoint, enabled);
          UI.ARIAUtils.setChecked(treeItem.element.listItemElement, enabled);
        }
      }
    }
  }

  protected toggleBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean): void {
    breakpoint.setEnabled(enabled);
  }

  private breakpointCheckboxClicked(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): void {
    const item = this.#breakpoints.get(breakpoint);
    if (!item) {
      return;
    }

    this.toggleBreakpoint(breakpoint, item.checkbox.checked);
    UI.ARIAUtils.setChecked(item.element.listItemElement, item.checkbox.checked);

    // Put the rest in a separate function
    let hasEnabled = false;
    let hasDisabled = false;
    for (const other of this.#breakpoints.keys()) {
      if (other.category() === breakpoint.category()) {
        if (other.enabled()) {
          hasEnabled = true;
        } else {
          hasDisabled = true;
        }
      }
    }

    const category = this.#categories.get(breakpoint.category());
    if (!category) {
      return;
    }
    category.checkbox.checked = hasEnabled;
    category.checkbox.indeterminate = hasEnabled && hasDisabled;
    if (category.checkbox.indeterminate) {
      UI.ARIAUtils.setCheckboxAsIndeterminate(category.element.listItemElement);
    } else {
      UI.ARIAUtils.setChecked(category.element.listItemElement, hasEnabled);
    }
  }
}
export interface Item {
  element: UI.TreeOutline.TreeElement;
  checkbox: UI.UIUtils.CheckboxLabel;
  category: SDK.CategorizedBreakpoint.Category;
}

const LOCALIZED_CATEGORIES: Record<SDK.CategorizedBreakpoint.Category, () => Platform.UIString.LocalizedString> = {
  [SDK.CategorizedBreakpoint.Category.ANIMATION]: i18nLazyString(UIStrings.animation),
  [SDK.CategorizedBreakpoint.Category.AUCTION_WORKLET]: i18nLazyString(UIStrings.auctionWorklet),
  [SDK.CategorizedBreakpoint.Category.CANVAS]: i18nLazyString(UIStrings.canvas),
  [SDK.CategorizedBreakpoint.Category.CLIPBOARD]: i18nLazyString(UIStrings.clipboard),
  [SDK.CategorizedBreakpoint.Category.CONTROL]: i18nLazyString(UIStrings.control),
  [SDK.CategorizedBreakpoint.Category.DEVICE]: i18nLazyString(UIStrings.device),
  [SDK.CategorizedBreakpoint.Category.DOM_MUTATION]: i18nLazyString(UIStrings.domMutation),
  [SDK.CategorizedBreakpoint.Category.DRAG_DROP]: i18nLazyString(UIStrings.dragDrop),
  [SDK.CategorizedBreakpoint.Category.GEOLOCATION]: i18nLazyString(UIStrings.geolocation),
  [SDK.CategorizedBreakpoint.Category.KEYBOARD]: i18nLazyString(UIStrings.keyboard),
  [SDK.CategorizedBreakpoint.Category.LOAD]: i18nLazyString(UIStrings.load),
  [SDK.CategorizedBreakpoint.Category.MEDIA]: i18nLazyString(UIStrings.media),
  [SDK.CategorizedBreakpoint.Category.MOUSE]: i18nLazyString(UIStrings.mouse),
  [SDK.CategorizedBreakpoint.Category.NOTIFICATION]: i18nLazyString(UIStrings.notification),
  [SDK.CategorizedBreakpoint.Category.PARSE]: i18nLazyString(UIStrings.parse),
  [SDK.CategorizedBreakpoint.Category.PICTURE_IN_PICTURE]: i18nLazyString(UIStrings.pictureinpicture),
  [SDK.CategorizedBreakpoint.Category.POINTER]: i18nLazyString(UIStrings.pointer),
  [SDK.CategorizedBreakpoint.Category.SCRIPT]: i18nLazyString(UIStrings.script),
  [SDK.CategorizedBreakpoint.Category.SHARED_STORAGE_WORKLET]: i18nLazyString(UIStrings.sharedStorageWorklet),
  [SDK.CategorizedBreakpoint.Category.TIMER]: i18nLazyString(UIStrings.timer),
  [SDK.CategorizedBreakpoint.Category.TOUCH]: i18nLazyString(UIStrings.touch),
  [SDK.CategorizedBreakpoint.Category.TRUSTED_TYPE_VIOLATION]: i18nLazyString(UIStrings.trustedTypeViolations),
  [SDK.CategorizedBreakpoint.Category.WEB_AUDIO]: i18nLazyString(UIStrings.webaudio),
  [SDK.CategorizedBreakpoint.Category.WINDOW]: i18nLazyString(UIStrings.window),
  [SDK.CategorizedBreakpoint.Category.WORKER]: i18nLazyString(UIStrings.worker),
  [SDK.CategorizedBreakpoint.Category.XHR]: i18nLazyString(UIStrings.xhr),
};

function getLocalizedCategory(category: SDK.CategorizedBreakpoint.Category): Platform.UIString.LocalizedString {
  return LOCALIZED_CATEGORIES[category]();
}
