// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Sources from '../../panels/sources/sources.js';
import * as UI from '../../ui/legacy/legacy.js';

import categorizedBreakpointsSidebarPaneStyles from './categorizedBreakpointsSidebarPane.css.js';

const UIStrings = {
  /**
   * @description Category of breakpoints
   */
  auctionWorklet: 'Ad Auction Worklet',
  /**
   *@description Text that refers to the animation of the web page
   */
  animation: 'Animation',
  /**
   *@description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
  /**
   *@description Text in DOMDebugger Model
   */
  canvas: 'Canvas',
  /**
   *@description Text in DOMDebugger Model
   */
  clipboard: 'Clipboard',
  /**
   * @description Noun. Describes a group of DOM events (such as 'select' and 'submit') in this context.
   */
  control: 'Control',
  /**
   *@description Text that refers to device such as a phone
   */
  device: 'Device',
  /**
   *@description Text in DOMDebugger Model
   */
  domMutation: 'DOM Mutation',
  /**
   *@description Text in DOMDebugger Model
   */
  dragDrop: 'Drag / drop',
  /**
   *@description Title for a group of cities
   */
  geolocation: 'Geolocation',
  /**
   *@description Text in DOMDebugger Model
   */
  keyboard: 'Keyboard',
  /**
   *@description Text to load something
   */
  load: 'Load',
  /**
   *@description Text that appears on a button for the media resource type filter.
   */
  media: 'Media',
  /**
   *@description Text in DOMDebugger Model
   */
  mouse: 'Mouse',
  /**
   *@description Text in DOMDebugger Model
   */
  notification: 'Notification',
  /**
   *@description Text to parse something
   */
  parse: 'Parse',
  /**
   *@description Text in DOMDebugger Model
   */
  pictureinpicture: 'Picture-in-Picture',
  /**
   *@description Text in DOMDebugger Model
   */
  pointer: 'Pointer',
  /**
   *@description Label for a group of JavaScript files
   */
  script: 'Script',
  /**
   *@description Category of breakpoints
   */
  sharedStorageWorklet: 'Shared Storage Worklet',
  /**
   *@description Text in DOMDebugger Model
   */
  timer: 'Timer',
  /**
   *@description Text for the touch type to simulate on a device
   */
  touch: 'Touch',
  /**
   *@description Title for a category of breakpoints on Trusted Type violations
   */
  trustedTypeViolations: 'Trusted Type Violations',
  /**
   *@description Title of the WebAudio tool
   */
  webaudio: 'WebAudio',
  /**
   *@description Text in DOMDebugger Model
   */
  window: 'Window',
  /**
   *@description Text for the service worker type.
   */
  worker: 'Worker',
  /**
   *@description Text that appears on a button for the xhr resource type filter.
   */
  xhr: 'XHR',
};
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/CategorizedBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export abstract class CategorizedBreakpointsSidebarPane extends UI.Widget.VBox {
  readonly #categoriesTreeOutline: UI.TreeOutline.TreeOutlineInShadow;
  readonly #viewId: string;
  readonly #detailsPausedReason: Protocol.Debugger.PausedEventReason;
  readonly #categories: Map<SDK.CategorizedBreakpoint.Category, Item>;
  readonly #breakpoints: Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item>;
  #highlightedElement?: HTMLLIElement;
  constructor(
      breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[], viewId: string,
      detailsPausedReason: Protocol.Debugger.PausedEventReason) {
    super(true);
    this.#categoriesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();

    this.#categoriesTreeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.contentElement.appendChild(this.#categoriesTreeOutline.element);
    this.#viewId = viewId;
    this.#detailsPausedReason = detailsPausedReason;

    const categories = new Set(breakpoints.map(bp => bp.category()));
    const sortedCategories = [...categories].sort((a, b) => {
      const categoryA = getLocalizedCategory(a);
      const categoryB = getLocalizedCategory(b);
      return categoryA.localeCompare(categoryB, i18n.DevToolsLocale.DevToolsLocale.instance().locale);
    });
    this.#categories = new Map();
    for (const category of sortedCategories) {
      this.createCategory(category);
    }
    if (sortedCategories.length > 0) {
      const firstCategory = this.#categories.get(sortedCategories[0]);
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
  }

  get categories(): Map<SDK.CategorizedBreakpoint.Category, Item> {
    return this.#categories;
  }

  get breakpoints(): Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item> {
    return this.#breakpoints;
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
    const labelNode = UI.UIUtils.CheckboxLabel.create(getLocalizedCategory(name));
    labelNode.checkboxElement.addEventListener('click', this.categoryCheckboxClicked.bind(this, name), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    labelNode.checkboxElement.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    this.#categoriesTreeOutline.appendChild(treeElement);

    this.#categories.set(name, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  protected createBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): void {
    const labelNode =
        UI.UIUtils.CheckboxLabel.create(Sources.CategorizedBreakpointL10n.getLocalizedBreakpointName(breakpoint.name));
    labelNode.classList.add('source-code');
    labelNode.checkboxElement.addEventListener('click', this.breakpointCheckboxClicked.bind(this, breakpoint), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    labelNode.checkboxElement.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    treeElement.listItemElement.createChild('div', 'breakpoint-hit-marker');
    const category = this.#categories.get(breakpoint.category());
    if (category) {
      category.element.appendChild(treeElement);
    }
    // Better to return that to produce a side-effect
    this.#breakpoints.set(breakpoint, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  protected getBreakpointFromPausedDetails(_details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    return null;
  }

  private update(): void {
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
    }
    const matchingBreakpoint = this.#breakpoints.get(breakpoint);
    if (matchingBreakpoint) {
      this.#highlightedElement = matchingBreakpoint.element.listItemElement;
      UI.ARIAUtils.setDescription(this.#highlightedElement, i18nString(UIStrings.breakpointHit));
      this.#highlightedElement.classList.add('breakpoint-hit');
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
  override wasShown(): void {
    super.wasShown();
    this.#categoriesTreeOutline.registerCSSFiles([categorizedBreakpointsSidebarPaneStyles]);
  }
}
export interface Item {
  element: UI.TreeOutline.TreeElement;
  checkbox: HTMLInputElement;
}

const LOCALIZED_CATEGORIES: Record<SDK.CategorizedBreakpoint.Category, () => Platform.UIString.LocalizedString> = {
  [SDK.CategorizedBreakpoint.Category.Animation]: i18nLazyString(UIStrings.animation),
  [SDK.CategorizedBreakpoint.Category.AuctionWorklet]: i18nLazyString(UIStrings.auctionWorklet),
  [SDK.CategorizedBreakpoint.Category.Canvas]: i18nLazyString(UIStrings.canvas),
  [SDK.CategorizedBreakpoint.Category.Clipboard]: i18nLazyString(UIStrings.clipboard),
  [SDK.CategorizedBreakpoint.Category.Control]: i18nLazyString(UIStrings.control),
  [SDK.CategorizedBreakpoint.Category.Device]: i18nLazyString(UIStrings.device),
  [SDK.CategorizedBreakpoint.Category.DomMutation]: i18nLazyString(UIStrings.domMutation),
  [SDK.CategorizedBreakpoint.Category.DragDrop]: i18nLazyString(UIStrings.dragDrop),
  [SDK.CategorizedBreakpoint.Category.Geolocation]: i18nLazyString(UIStrings.geolocation),
  [SDK.CategorizedBreakpoint.Category.Keyboard]: i18nLazyString(UIStrings.keyboard),
  [SDK.CategorizedBreakpoint.Category.Load]: i18nLazyString(UIStrings.load),
  [SDK.CategorizedBreakpoint.Category.Media]: i18nLazyString(UIStrings.media),
  [SDK.CategorizedBreakpoint.Category.Mouse]: i18nLazyString(UIStrings.mouse),
  [SDK.CategorizedBreakpoint.Category.Notification]: i18nLazyString(UIStrings.notification),
  [SDK.CategorizedBreakpoint.Category.Parse]: i18nLazyString(UIStrings.parse),
  [SDK.CategorizedBreakpoint.Category.PictureInPicture]: i18nLazyString(UIStrings.pictureinpicture),
  [SDK.CategorizedBreakpoint.Category.Pointer]: i18nLazyString(UIStrings.pointer),
  [SDK.CategorizedBreakpoint.Category.Script]: i18nLazyString(UIStrings.script),
  [SDK.CategorizedBreakpoint.Category.SharedStorageWorklet]: i18nLazyString(UIStrings.sharedStorageWorklet),
  [SDK.CategorizedBreakpoint.Category.Timer]: i18nLazyString(UIStrings.timer),
  [SDK.CategorizedBreakpoint.Category.Touch]: i18nLazyString(UIStrings.touch),
  [SDK.CategorizedBreakpoint.Category.TrustedTypeViolation]: i18nLazyString(UIStrings.trustedTypeViolations),
  [SDK.CategorizedBreakpoint.Category.WebAudio]: i18nLazyString(UIStrings.webaudio),
  [SDK.CategorizedBreakpoint.Category.Window]: i18nLazyString(UIStrings.window),
  [SDK.CategorizedBreakpoint.Category.Worker]: i18nLazyString(UIStrings.worker),
  [SDK.CategorizedBreakpoint.Category.Xhr]: i18nLazyString(UIStrings.xhr),
};

function getLocalizedCategory(category: SDK.CategorizedBreakpoint.Category): Platform.UIString.LocalizedString {
  return LOCALIZED_CATEGORIES[category]();
}
