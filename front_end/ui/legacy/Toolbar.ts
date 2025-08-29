/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
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

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import type * as Adorners from '../components/adorners/adorners.js';
import * as IconButton from '../components/icon_button/icon_button.js';

import {type Action, Events as ActionEvents} from './ActionRegistration.js';
import {ActionRegistry} from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import {ContextMenu} from './ContextMenu.js';
import {GlassPane, PointerEventsBehavior} from './GlassPane.js';
import {bindCheckbox} from './SettingsUI.js';
import type {Suggestion} from './SuggestBox.js';
import {Events as TextPromptEvents, TextPrompt} from './TextPrompt.js';
import toolbarStyles from './toolbar.css.js';
import {Tooltip} from './Tooltip.js';
import {CheckboxLabel, LongClickController} from './UIUtils.js';

const UIStrings = {
  /**
   * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled on.
   */
  pressed: 'pressed',
  /**
   * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled off.
   */
  notPressed: 'not pressed',
  /**
   * @description Tooltip shown when the user hovers over the clear icon to empty the text input.
   */
  clearInput: 'Clear',
  /**
   * @description Placeholder for filter bars that shows before the user types in a filter keyword.
   */
  filter: 'Filter',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Toolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Custom element for toolbars.
 *
 * @property floating - The `"floating"` attribute is reflected as property.
 * @property wrappable - The `"wrappable"` attribute is reflected as property.
 * @attribute floating - If present the toolbar is rendered in columns, with a border
 *                  around it, and a non-transparent background. This is used to
 *                  build vertical toolbars that open with long-click. Defaults
 *                  to `false`.
 * @attribute wrappable - If present the toolbar items will wrap to a new row and the
 *                   toolbar height increases.
 */
export class Toolbar extends HTMLElement {
  #shadowRoot = this.attachShadow({mode: 'open'});
  private items: ToolbarItem[] = [];
  enabled = true;
  private compactLayout = false;

  constructor() {
    super();
    this.#shadowRoot.createChild('style').textContent = toolbarStyles;
    this.#shadowRoot.createChild('slot');
  }

  onItemsChange(mutationList: MutationRecord[]): void {
    for (const mutation of mutationList) {
      for (const element of mutation.removedNodes) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }
        for (const item of this.items) {
          if (item.element === element) {
            this.items.splice(this.items.indexOf(item), 1);
            break;
          }
        }
      }
      for (const element of mutation.addedNodes) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }
        if (this.items.some(item => item.element === element)) {
          continue;
        }
        let item: ToolbarItem;
        if (element instanceof Buttons.Button.Button) {
          item = new ToolbarButton('', undefined, undefined, undefined, element);
        } else if (element instanceof ToolbarInputElement) {
          item = element.item;
        } else if (element instanceof HTMLSelectElement) {
          item = new ToolbarComboBox(null, element.title, undefined, undefined, element);
        } else {
          item = new ToolbarItem(element);
        }
        if (item) {
          this.appendToolbarItem(item);
        }
      }
    }
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'toolbar');
    }
  }

  /**
   * Returns whether this toolbar is floating.
   *
   * @returns `true` if the `"floating"` attribute is present on this toolbar,
   *         otherwise `false`.
   */
  get floating(): boolean {
    return this.hasAttribute('floating');
  }

  /**
   * Changes the value of the `"floating"` attribute on this toolbar.
   *
   * @param floating `true` to make the toolbar floating.
   */
  set floating(floating: boolean) {
    this.toggleAttribute('floating', floating);
  }

  /**
   * Returns whether this toolbar is wrappable.
   *
   * @returns `true` if the `"wrappable"` attribute is present on this toolbar,
   *         otherwise `false`.
   */
  get wrappable(): boolean {
    return this.hasAttribute('wrappable');
  }

  /**
   * Changes the value of the `"wrappable"` attribute on this toolbar.
   *
   * @param wrappable `true` to make the toolbar items wrap to a new row and
   *                  have the toolbar height adjust.
   */
  set wrappable(wrappable: boolean) {
    this.toggleAttribute('wrappable', wrappable);
  }

  hasCompactLayout(): boolean {
    return this.compactLayout;
  }

  setCompactLayout(enable: boolean): void {
    if (this.compactLayout === enable) {
      return;
    }
    this.compactLayout = enable;
    for (const item of this.items) {
      item.setCompactLayout(enable);
    }
  }

  static createLongPressActionButton(
      action: Action, toggledOptions: ToolbarButton[], untoggledOptions: ToolbarButton[]): ToolbarButton {
    const button = Toolbar.createActionButton(action);
    const mainButtonClone = Toolbar.createActionButton(action);

    let longClickController: LongClickController|null = null;
    let longClickButtons: ToolbarButton[]|null = null;

    action.addEventListener(ActionEvents.TOGGLED, updateOptions);
    updateOptions();
    return button;

    function updateOptions(): void {
      const buttons = action.toggled() ? (toggledOptions || null) : (untoggledOptions || null);

      if (buttons?.length) {
        if (!longClickController) {
          longClickController = new LongClickController(button.element, showOptions);
          button.setLongClickable(true);
          longClickButtons = buttons;
        }
      } else if (longClickController) {
        longClickController.dispose();
        longClickController = null;
        button.setLongClickable(false);
        longClickButtons = null;
      }
    }

    function showOptions(): void {
      let buttons: ToolbarButton[] = longClickButtons ? longClickButtons.slice() : [];
      buttons.push(mainButtonClone);

      const document = button.element.ownerDocument;
      document.documentElement.addEventListener('mouseup', mouseUp, false);

      const optionsGlassPane = new GlassPane();
      optionsGlassPane.setPointerEventsBehavior(PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
      optionsGlassPane.show(document);
      const optionsBar = optionsGlassPane.contentElement.createChild('devtools-toolbar');
      optionsBar.floating = true;
      const buttonHeight = 26;

      const hostButtonPosition = button.element.boxInWindow().relativeToElement(GlassPane.container(document));

      const topNotBottom = hostButtonPosition.y + buttonHeight * buttons.length < document.documentElement.offsetHeight;

      if (topNotBottom) {
        buttons = buttons.reverse();
      }

      optionsBar.style.height = (buttonHeight * buttons.length) + 'px';
      if (topNotBottom) {
        optionsBar.style.top = (hostButtonPosition.y - 5) + 'px';
      } else {
        optionsBar.style.top = (hostButtonPosition.y - (buttonHeight * (buttons.length - 1)) - 6) + 'px';
      }
      optionsBar.style.left = (hostButtonPosition.x - 5) + 'px';

      for (let i = 0; i < buttons.length; ++i) {
        buttons[i].element.addEventListener('mousemove', mouseOver, false);
        buttons[i].element.addEventListener('mouseout', mouseOut, false);
        optionsBar.appendToolbarItem(buttons[i]);
      }
      const hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
      buttons[hostButtonIndex].element.classList.add('emulate-active');

      function mouseOver(e: Event): void {
        if ((e as MouseEvent).which !== 1) {
          return;
        }
        if (e.target instanceof HTMLElement) {
          const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-button');
          buttonElement.classList.add('emulate-active');
        }
      }

      function mouseOut(e: Event): void {
        if ((e as MouseEvent).which !== 1) {
          return;
        }
        if (e.target instanceof HTMLElement) {
          const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-button');
          buttonElement.classList.remove('emulate-active');
        }
      }

      function mouseUp(e: Event): void {
        if ((e as MouseEvent).which !== 1) {
          return;
        }
        optionsGlassPane.hide();
        document.documentElement.removeEventListener('mouseup', mouseUp, false);

        for (let i = 0; i < buttons.length; ++i) {
          if (buttons[i].element.classList.contains('emulate-active')) {
            buttons[i].element.classList.remove('emulate-active');
            buttons[i].clicked(e);
            break;
          }
        }
      }
    }
  }

  static createActionButton(action: Action, options?: ToolbarButtonOptions): ToolbarButton;
  static createActionButton(actionId: string, options?: ToolbarButtonOptions): ToolbarButton;
  static createActionButton(actionOrActionId: Action|string, options: ToolbarButtonOptions = {}): ToolbarButton {
    const action =
        typeof actionOrActionId === 'string' ? ActionRegistry.instance().getAction(actionOrActionId) : actionOrActionId;

    const button = action.toggleable() ? makeToggle() : makeButton();

    if (options.label) {
      button.setText(options.label() || action.title());
    }

    const handler = (): void => {
      void action.execute();
    };
    button.addEventListener(ToolbarButton.Events.CLICK, handler, action);
    action.addEventListener(ActionEvents.ENABLED, enabledChanged);
    button.setEnabled(action.enabled());
    return button;

    function makeButton(): ToolbarButton {
      const button = new ToolbarButton(action.title(), action.icon(), undefined, action.id());
      if (action.title()) {
        Tooltip.installWithActionBinding(button.element, action.title(), action.id());
      }
      return button;
    }

    function makeToggle(): ToolbarToggle {
      const toggleButton = new ToolbarToggle(action.title(), action.icon(), action.toggledIcon(), action.id());
      if (action.toggleWithRedColor()) {
        toggleButton.enableToggleWithRedColor();
      }
      action.addEventListener(ActionEvents.TOGGLED, toggled);
      toggled();
      return toggleButton;

      function toggled(): void {
        toggleButton.setToggled(action.toggled());
        if (action.title()) {
          toggleButton.setTitle(action.title());
          Tooltip.installWithActionBinding(toggleButton.element, action.title(), action.id());
        }
      }
    }

    function enabledChanged(event: Common.EventTarget.EventTargetEvent<boolean>): void {
      button.setEnabled(event.data);
    }
  }

  empty(): boolean {
    return !this.items.length;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    for (const item of this.items) {
      item.applyEnabledState(this.enabled && item.enabled);
    }
  }

  appendToolbarItem(item: ToolbarItem): void {
    this.items.push(item);
    item.toolbar = this;
    item.setCompactLayout(this.hasCompactLayout());
    if (!this.enabled) {
      item.applyEnabledState(false);
    }
    if (item.element.parentElement !== this) {
      this.appendChild(item.element);
    }
    this.hideSeparatorDupes();
  }

  hasItem(item: ToolbarItem): boolean {
    return this.items.includes(item);
  }

  prependToolbarItem(item: ToolbarItem): void {
    this.items.unshift(item);
    item.toolbar = this;
    item.setCompactLayout(this.hasCompactLayout());
    if (!this.enabled) {
      item.applyEnabledState(false);
    }
    this.prepend(item.element);
    this.hideSeparatorDupes();
  }

  appendSeparator(): void {
    this.appendToolbarItem(new ToolbarSeparator());
  }

  appendSpacer(): void {
    this.appendToolbarItem(new ToolbarSeparator(true));
  }

  appendText(text: string): void {
    this.appendToolbarItem(new ToolbarText(text));
  }

  removeToolbarItem(itemToRemove: ToolbarItem): void {
    const updatedItems = [];
    for (const item of this.items) {
      if (item === itemToRemove) {
        item.element.remove();
      } else {
        updatedItems.push(item);
      }
    }
    this.items = updatedItems;
  }

  removeToolbarItems(): void {
    for (const item of this.items) {
      item.toolbar = null;
    }
    this.items = [];
    this.removeChildren();
  }

  hideSeparatorDupes(): void {
    if (!this.items.length) {
      return;
    }
    // Don't hide first and last separators if they were added explicitly.
    let previousIsSeparator = false;
    let lastSeparator;
    let nonSeparatorVisible = false;
    for (let i = 0; i < this.items.length; ++i) {
      if (this.items[i] instanceof ToolbarSeparator) {
        this.items[i].setVisible(!previousIsSeparator);
        previousIsSeparator = true;
        lastSeparator = this.items[i];
        continue;
      }
      if (this.items[i].visible()) {
        previousIsSeparator = false;
        lastSeparator = null;
        nonSeparatorVisible = true;
      }
    }
    if (lastSeparator && lastSeparator !== this.items[this.items.length - 1]) {
      lastSeparator.setVisible(false);
    }

    this.classList.toggle(
        'hidden',
        lastSeparator !== null && lastSeparator !== undefined && lastSeparator.visible() && !nonSeparatorVisible);
  }

  async appendItemsAtLocation(location: string): Promise<void> {
    const extensions: ToolbarItemRegistration[] = getRegisteredToolbarItems();

    extensions.sort((extension1, extension2) => {
      const order1 = extension1.order || 0;
      const order2 = extension2.order || 0;
      return order1 - order2;
    });

    const filtered = extensions.filter(e => e.location === location);
    const items = await Promise.all(filtered.map(extension => {
      const {separator, actionId, label, loadItem} = extension;
      if (separator) {
        return new ToolbarSeparator();
      }
      if (actionId) {
        return Toolbar.createActionButton(actionId, {label});
      }
      // TODO(crbug.com/1134103) constratint the case checked with this if using TS type definitions once UI is TS-authored.
      if (!loadItem) {
        throw new Error('Could not load a toolbar item registration with no loadItem function');
      }
      return loadItem().then(p => (p).item());
    }));

    for (const item of items) {
      if (item) {
        this.appendToolbarItem(item);
      }
    }
  }
}

customElements.define('devtools-toolbar', Toolbar);

export interface ToolbarButtonOptions {
  label?: () => Platform.UIString.LocalizedString;
}

// We need any here because Common.ObjectWrapper.ObjectWrapper is invariant in T.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ToolbarItem<T = any, E extends HTMLElement = HTMLElement> extends Common.ObjectWrapper.ObjectWrapper<T> {
  element: E;
  private visibleInternal: boolean;
  enabled: boolean;
  toolbar: Toolbar|null;
  protected title?: string;

  constructor(element: E) {
    super();
    this.element = element;
    this.visibleInternal = true;
    this.enabled = true;

    /**
     * Set by the parent toolbar during appending.
     */
    this.toolbar = null;
  }

  setTitle(title: string, actionId: string|undefined = undefined): void {
    if (this.title === title) {
      return;
    }
    this.title = title;
    ARIAUtils.setLabel(this.element, title);
    if (actionId === undefined) {
      Tooltip.install(this.element, title);
    } else {
      Tooltip.installWithActionBinding(this.element, title, actionId);
    }
  }

  setEnabled(value: boolean): void {
    if (this.enabled === value) {
      return;
    }
    this.enabled = value;
    this.applyEnabledState(this.enabled && (!this.toolbar || this.toolbar.enabled));
  }

  applyEnabledState(enabled: boolean): void {
    // @ts-expect-error: Ignoring in favor of an `instanceof` check for all the different
    //             kind of HTMLElement classes that have a disabled attribute.
    this.element.disabled = !enabled;
  }

  visible(): boolean {
    return this.visibleInternal;
  }

  setVisible(x: boolean): void {
    if (this.visibleInternal === x) {
      return;
    }
    this.element.classList.toggle('hidden', !x);
    this.visibleInternal = x;
    if (this.toolbar && !(this instanceof ToolbarSeparator)) {
      this.toolbar.hideSeparatorDupes();
    }
  }

  setCompactLayout(_enable: boolean): void {
  }

  setMaxWidth(width: number): void {
    this.element.style.maxWidth = width + 'px';
  }

  setMinWidth(width: number): void {
    this.element.style.minWidth = width + 'px';
  }
}

export const enum ToolbarItemWithCompactLayoutEvents {
  COMPACT_LAYOUT_UPDATED = 'CompactLayoutUpdated',
}

interface ToolbarItemWithCompactLayoutEventTypes {
  [ToolbarItemWithCompactLayoutEvents.COMPACT_LAYOUT_UPDATED]: boolean;
}

export class ToolbarItemWithCompactLayout extends ToolbarItem<ToolbarItemWithCompactLayoutEventTypes> {
  override setCompactLayout(enable: boolean): void {
    this.dispatchEventToListeners(ToolbarItemWithCompactLayoutEvents.COMPACT_LAYOUT_UPDATED, enable);
  }
}

export class ToolbarText extends ToolbarItem<void, HTMLElement> {
  constructor(text = '') {
    const element = document.createElement('div');
    element.classList.add('toolbar-text');
    super(element);
    this.setText(text);
  }

  text(): string {
    return this.element.textContent ?? '';
  }

  setText(text: string): void {
    this.element.textContent = text;
  }
}

export class ToolbarButton extends ToolbarItem<ToolbarButton.EventTypes, Buttons.Button.Button> {
  private button: Buttons.Button.Button;
  private text?: string;
  private adorner?: HTMLElement;

  constructor(title: string, glyph?: string, text?: string, jslogContext?: string, button?: Buttons.Button.Button) {
    if (!button) {
      button = new Buttons.Button.Button();
      if (glyph && !text) {
        button.data = {variant: Buttons.Button.Variant.ICON, iconName: glyph};
      } else {
        button.variant = Buttons.Button.Variant.TEXT;
        button.reducedFocusRing = true;
        if (glyph) {
          button.iconName = glyph;
        }
      }
    }
    super(button);
    this.button = button;
    button.classList.add('toolbar-button');
    this.element.addEventListener('click', this.clicked.bind(this), false);
    button.textContent = text || '';
    this.setTitle(title);
    if (jslogContext) {
      button.jslogContext = jslogContext;
    }
  }

  focus(): void {
    this.element.focus();
  }

  checked(checked: boolean): void {
    this.button.checked = checked;
  }

  toggleOnClick(toggleOnClick: boolean): void {
    this.button.toggleOnClick = toggleOnClick;
  }

  isToggled(): boolean {
    return this.button.toggled;
  }

  toggled(toggled: boolean): void {
    this.button.toggled = toggled;
  }

  setToggleType(type: Buttons.Button.ToggleType): void {
    this.button.toggleType = type;
  }

  setLongClickable(longClickable: boolean): void {
    this.button.longClickable = longClickable;
  }

  setSize(size: Buttons.Button.Size): void {
    this.button.size = size;
  }

  setReducedFocusRing(): void {
    this.button.reducedFocusRing = true;
  }

  setText(text: string): void {
    if (this.text === text) {
      return;
    }
    this.button.textContent = text;
    this.button.variant = Buttons.Button.Variant.TEXT;
    this.button.reducedFocusRing = true;
    this.text = text;
  }

  setAdorner(adorner: Adorners.Adorner.Adorner): void {
    if (this.adorner) {
      this.adorner.replaceWith(adorner);
    } else {
      this.element.prepend(adorner);
    }
    this.adorner = adorner;
  }

  setGlyph(iconName: string): void {
    this.button.iconName = iconName;
  }

  setToggledIcon(toggledIconName: string): void {
    this.button.variant = Buttons.Button.Variant.ICON_TOGGLE;
    this.button.toggledIconName = toggledIconName;
  }

  setBackgroundImage(iconURL: string): void {
    this.element.style.backgroundImage = 'url(' + iconURL + ')';
  }

  setSecondary(): void {
    this.element.classList.add('toolbar-button-secondary');
  }

  setDarkText(): void {
    this.element.classList.add('dark-text');
  }

  clicked(event: Event): void {
    if (!this.enabled) {
      return;
    }
    this.dispatchEventToListeners(ToolbarButton.Events.CLICK, event);
    event.consume();
  }
}

export namespace ToolbarButton {
  export const enum Events {
    CLICK = 'Click',
  }

  export interface EventTypes {
    [Events.CLICK]: Event;
  }
}

export class ToolbarInput extends ToolbarItem<ToolbarInput.EventTypes> {
  private prompt: TextPrompt;
  private readonly proxyElement: Element;

  constructor(
      placeholder: string, accessiblePlaceholder?: string, growFactor?: number, shrinkFactor?: number, tooltip?: string,
      completions?: ((arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestion[]>),
      dynamicCompletions?: boolean, jslogContext?: string, element?: HTMLElement) {
    if (!element) {
      element = document.createElement('div');
    }
    element.classList.add('toolbar-input');
    super(element);

    const internalPromptElement = this.element.createChild('div', 'toolbar-input-prompt');
    ARIAUtils.setLabel(internalPromptElement, accessiblePlaceholder || placeholder);
    internalPromptElement.addEventListener('focus', () => this.element.classList.add('focused'));
    internalPromptElement.addEventListener('blur', () => this.element.classList.remove('focused'));

    this.prompt = new TextPrompt();
    this.prompt.jslogContext = jslogContext;
    this.proxyElement = this.prompt.attach(internalPromptElement);
    this.proxyElement.classList.add('toolbar-prompt-proxy');
    this.proxyElement.addEventListener('keydown', (event: Event) => this.onKeydownCallback(event as KeyboardEvent));
    this.prompt.initialize(
        completions || (() => Promise.resolve([])),
        ' ',
        dynamicCompletions,
    );
    if (tooltip) {
      this.prompt.setTitle(tooltip);
    }
    this.prompt.setPlaceholder(placeholder, accessiblePlaceholder);
    this.prompt.addEventListener(TextPromptEvents.TEXT_CHANGED, this.onChangeCallback.bind(this));

    if (growFactor) {
      this.element.style.flexGrow = String(growFactor);
    }
    if (shrinkFactor) {
      this.element.style.flexShrink = String(shrinkFactor);
    }

    const clearButtonText = i18nString(UIStrings.clearInput);
    const clearButton = new Buttons.Button.Button();
    clearButton.data = {
      variant: Buttons.Button.Variant.ICON,
      iconName: 'cross-circle-filled',
      size: Buttons.Button.Size.SMALL,
      title: clearButtonText,
    };
    clearButton.className = 'toolbar-input-clear-button';
    clearButton.setAttribute('jslog', `${VisualLogging.action('clear').track({click: true}).parent('mapped')}`);
    VisualLogging.setMappedParent(clearButton, internalPromptElement);
    clearButton.variant = Buttons.Button.Variant.ICON;
    clearButton.size = Buttons.Button.Size.SMALL;
    clearButton.iconName = 'cross-circle-filled';
    clearButton.title = clearButtonText;
    clearButton.ariaLabel = clearButtonText;
    clearButton.tabIndex = -1;

    clearButton.addEventListener('click', () => {
      this.setValue('', true);
      this.prompt.focus();
    });

    this.element.appendChild(clearButton);
    this.updateEmptyStyles();
  }

  override applyEnabledState(enabled: boolean): void {
    if (enabled) {
      this.element.classList.remove('disabled');
    } else {
      this.element.classList.add('disabled');
    }

    this.prompt.setEnabled(enabled);
  }

  setValue(value: string, notify?: boolean): void {
    this.prompt.setText(value);
    if (notify) {
      this.onChangeCallback();
    }
    this.updateEmptyStyles();
  }

  value(): string {
    return this.prompt.textWithCurrentSuggestion();
  }

  valueWithoutSuggestion(): string {
    return this.prompt.text();
  }

  clearAutocomplete(): void {
    this.prompt.clearAutocomplete();
  }

  focus(): void {
    this.prompt.focus();
  }

  private onKeydownCallback(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.prompt.text()) {
      this.dispatchEventToListeners(ToolbarInput.Event.ENTER_PRESSED, this.prompt.text());
    }
    if (!Platform.KeyboardUtilities.isEscKey(event) || !this.prompt.text()) {
      return;
    }
    this.setValue('', true);
    event.consume(true);
  }

  private onChangeCallback(): void {
    this.updateEmptyStyles();
    this.dispatchEventToListeners(ToolbarInput.Event.TEXT_CHANGED, this.prompt.text());
  }

  private updateEmptyStyles(): void {
    this.element.classList.toggle('toolbar-input-empty', !this.prompt.text());
  }
}

export class ToolbarFilter extends ToolbarInput {
  constructor(
      filterBy?: Common.UIString.LocalizedString, growFactor?: number, shrinkFactor?: number, tooltip?: string,
      completions?: ((arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestion[]>),
      dynamicCompletions?: boolean, jslogContext?: string, element?: HTMLElement) {
    const filterPlaceholder = filterBy ? filterBy : i18nString(UIStrings.filter);
    super(
        filterPlaceholder, filterPlaceholder, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions,
        jslogContext || 'filter', element);

    const filterIcon = IconButton.Icon.create('filter');
    this.element.prepend(filterIcon);
    this.element.classList.add('toolbar-filter');
  }
}

export class ToolbarInputElement extends HTMLElement {
  static observedAttributes = ['value'];

  item!: ToolbarInput;
  datalist: HTMLDataListElement|null = null;
  value: string|undefined = undefined;

  connectedCallback(): void {
    if (this.item) {
      return;
    }
    const list = this.getAttribute('list');
    if (list) {
      this.datalist = (this.getRootNode() as ShadowRoot | Document).querySelector(`datalist[id="${list}"]`);
    }
    const placeholder = this.getAttribute('placeholder') || '';
    const accessiblePlaceholder = this.getAttribute('aria-placeholder') ?? undefined;
    const tooltip = this.getAttribute('title') ?? undefined;
    const jslogContext = this.id ?? undefined;
    const isFilter = this.getAttribute('type') === 'filter';
    if (isFilter) {
      this.item = new ToolbarFilter(
          placeholder as Platform.UIString.LocalizedString, /* growFactor=*/ undefined,
          /* shrinkFactor=*/ undefined, tooltip, this.datalist ? this.#onAutocomplete.bind(this) : undefined,
          /* dynamicCompletions=*/ undefined, jslogContext || 'filter', this);
    } else {
      this.item = new ToolbarInput(
          placeholder, accessiblePlaceholder, /* growFactor=*/ undefined,
          /* shrinkFactor=*/ undefined, tooltip, this.datalist ? this.#onAutocomplete.bind(this) : undefined,
          /* dynamicCompletions=*/ undefined, jslogContext, this);
    }
    if (this.value) {
      this.item.setValue(this.value);
    }
    this.item.addEventListener(ToolbarInput.Event.TEXT_CHANGED, event => {
      this.dispatchEvent(new CustomEvent('change', {detail: event.data}));
    });
    this.item.addEventListener(ToolbarInput.Event.ENTER_PRESSED, event => {
      this.dispatchEvent(new CustomEvent('submit', {detail: event.data}));
    });
  }

  override focus(): void {
    this.item.focus();
  }

  async #onAutocomplete(expression: string, prefix: string, force?: boolean): Promise<Suggestion[]> {
    if (!prefix && !force && expression || !this.datalist) {
      return [];
    }

    const options = this.datalist.options;
    return [...options].map((({value}) => value)).filter(value => value.startsWith(prefix)).map(text => ({text}));
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (name === 'value') {
      if (this.item && this.item.value() !== newValue) {
        this.item.setValue(newValue, true);
      } else {
        this.value = newValue;
      }
    }
  }
}
customElements.define('devtools-toolbar-input', ToolbarInputElement);

export namespace ToolbarInput {
  export const enum Event {
    TEXT_CHANGED = 'TextChanged',
    ENTER_PRESSED = 'EnterPressed',
  }

  export interface EventTypes {
    [Event.TEXT_CHANGED]: string;
    [Event.ENTER_PRESSED]: string;
  }
}

export class ToolbarToggle extends ToolbarButton {
  private readonly toggledGlyph: string|undefined;

  constructor(title: string, glyph?: string, toggledGlyph?: string, jslogContext?: string, toggleOnClick?: boolean) {
    super(title, glyph, '');
    this.toggledGlyph = toggledGlyph ? toggledGlyph : glyph;
    this.setToggledIcon(this.toggledGlyph || '');
    this.setToggleType(Buttons.Button.ToggleType.PRIMARY);
    this.toggled(false);

    if (jslogContext) {
      this.element.setAttribute('jslog', `${VisualLogging.toggle().track({click: true}).context(jslogContext)}`);
    }
    if (toggleOnClick !== undefined) {
      this.setToggleOnClick(toggleOnClick);
    }
  }

  setToggleOnClick(toggleOnClick: boolean): void {
    this.toggleOnClick(toggleOnClick);
  }

  setToggled(toggled: boolean): void {
    this.toggled(toggled);
  }

  setChecked(checked: boolean): void {
    this.checked(checked);
  }

  enableToggleWithRedColor(): void {
    this.setToggleType(Buttons.Button.ToggleType.RED);
  }
}

export class ToolbarMenuButton extends ToolbarItem<ToolbarButton.EventTypes> {
  private textElement?: HTMLElement;
  private text?: string;
  private iconName?: string;
  private adorner?: Adorners.Adorner.Adorner;
  private readonly contextMenuHandler: (arg0: ContextMenu) => void;
  private readonly useSoftMenu: boolean;
  private readonly keepOpen: boolean;
  private triggerTimeoutId?: number;
  #triggerDelay = 200;

  constructor(
      contextMenuHandler: (arg0: ContextMenu) => void, isIconDropdown?: boolean, useSoftMenu?: boolean,
      jslogContext?: string, iconName?: string, keepOpen?: boolean) {
    let element;
    if (iconName) {
      element = new Buttons.Button.Button();
      element.data = {variant: Buttons.Button.Variant.ICON, iconName};
    } else {
      element = document.createElement('button');
    }
    element.classList.add('toolbar-button');
    super(element);
    this.element.addEventListener('click', this.clicked.bind(this), false);

    this.iconName = iconName;

    this.setTitle('');
    this.title = '';
    if (!isIconDropdown) {
      this.element.classList.add('toolbar-has-dropdown');
      const dropdownArrowIcon = IconButton.Icon.create('triangle-down', 'toolbar-dropdown-arrow');
      this.element.appendChild(dropdownArrowIcon);
    }
    if (jslogContext) {
      this.element.setAttribute('jslog', `${VisualLogging.dropDown().track({click: true}).context(jslogContext)}`);
    }
    this.element.addEventListener('mousedown', this.mouseDown.bind(this), false);
    this.contextMenuHandler = contextMenuHandler;
    this.useSoftMenu = Boolean(useSoftMenu);
    this.keepOpen = Boolean(keepOpen);
    ARIAUtils.markAsMenuButton(this.element);
  }

  setText(text: string): void {
    if (this.text === text || this.iconName) {
      return;
    }
    if (!this.textElement) {
      this.textElement = document.createElement('div');
      this.textElement.classList.add('toolbar-text', 'hidden');
      const dropDownArrow = this.element.querySelector('.toolbar-dropdown-arrow');
      this.element.insertBefore(this.textElement, dropDownArrow);
    }
    this.textElement.textContent = text;
    this.textElement.classList.toggle('hidden', !text);
    this.text = text;
  }

  setAdorner(adorner: Adorners.Adorner.Adorner): void {
    if (this.iconName) {
      return;
    }
    if (!this.adorner) {
      this.adorner = adorner;
    } else {
      adorner.replaceWith(adorner);
      if (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
    }
    this.element.prepend(adorner);
  }

  setDarkText(): void {
    this.element.classList.add('dark-text');
  }

  turnShrinkable(): void {
    this.element.classList.add('toolbar-has-dropdown-shrinkable');
  }

  setTriggerDelay(x: number): void {
    this.#triggerDelay = x;
  }

  mouseDown(event: MouseEvent): void {
    if (!this.enabled) {
      return;
    }
    if (event.buttons !== 1) {
      return;
    }

    if (!this.triggerTimeoutId) {
      this.triggerTimeoutId = window.setTimeout(this.trigger.bind(this, event), this.#triggerDelay);
    }
  }

  private trigger(event: Event): void {
    delete this.triggerTimeoutId;

    const contextMenu = new ContextMenu(event, {
      useSoftMenu: this.useSoftMenu,
      keepOpen: this.keepOpen,
      x: this.element.getBoundingClientRect().right,
      y: this.element.getBoundingClientRect().top + this.element.offsetHeight,
      // Without adding a delay, pointer events will be un-ignored too early, and a single click causes
      // the context menu to be closed and immediately re-opened on Windows (https://crbug.com/339560549).
      onSoftMenuClosed: () => setTimeout(() => this.element.removeAttribute('aria-expanded'), 50),
    });
    this.contextMenuHandler(contextMenu);
    this.element.setAttribute('aria-expanded', 'true');
    void contextMenu.show();
  }

  clicked(event: Event): void {
    if (this.triggerTimeoutId) {
      clearTimeout(this.triggerTimeoutId);
    }
    this.trigger(event);
  }
}

export class ToolbarSettingToggle extends ToolbarToggle {
  private readonly defaultTitle: string;
  private readonly setting: Common.Settings.Setting<boolean>;
  private willAnnounceState: boolean;

  constructor(
      setting: Common.Settings.Setting<boolean>, glyph: string, title: string, toggledGlyph?: string,
      jslogContext?: string) {
    super(title, glyph, toggledGlyph, jslogContext);
    this.defaultTitle = title;
    this.setting = setting;
    this.settingChanged();
    this.setting.addChangeListener(this.settingChanged, this);

    // Determines whether the toggle state will be announced to a screen reader
    this.willAnnounceState = false;
  }

  private settingChanged(): void {
    const toggled = this.setting.get();
    this.setToggled(toggled);
    const toggleAnnouncement = toggled ? i18nString(UIStrings.pressed) : i18nString(UIStrings.notPressed);
    if (this.willAnnounceState) {
      ARIAUtils.LiveAnnouncer.alert(toggleAnnouncement);
    }
    this.willAnnounceState = false;
    this.setTitle(this.defaultTitle);
  }

  override clicked(event: Event): void {
    this.willAnnounceState = true;
    this.setting.set(this.isToggled());
    super.clicked(event);
  }
}

export class ToolbarSeparator extends ToolbarItem<void> {
  constructor(spacer?: boolean) {
    const element = document.createElement('div');
    element.classList.add(spacer ? 'toolbar-spacer' : 'toolbar-divider');
    super(element);
  }
}

export interface Provider {
  item(): ToolbarItem|null;
}

export interface ItemsProvider {
  toolbarItems(): ToolbarItem[];
}

export class ToolbarComboBox extends ToolbarItem<void, HTMLSelectElement> {
  constructor(
      changeHandler: ((arg0: Event) => void)|null, title: string, className?: string, jslogContext?: string,
      element?: HTMLSelectElement) {
    if (!element) {
      element = document.createElement('select');
    }
    super(element);
    if (changeHandler) {
      this.element.addEventListener('change', changeHandler, false);
    }
    ARIAUtils.setLabel(this.element, title);
    super.setTitle(title);
    if (className) {
      this.element.classList.add(className);
    }
    if (jslogContext) {
      this.element.setAttribute('jslog', `${VisualLogging.dropDown().track({change: true}).context(jslogContext)}`);
    }
  }

  size(): number {
    return this.element.childElementCount;
  }

  options(): HTMLOptionElement[] {
    return Array.prototype.slice.call(this.element.children, 0);
  }

  addOption(option: Element): void {
    this.element.appendChild(option);
  }

  createOption(label: string, value?: string, jslogContext?: string): HTMLOptionElement {
    const option = this.element.createChild('option');
    option.text = label;
    if (typeof value !== 'undefined') {
      option.value = value;
    }
    if (!jslogContext) {
      jslogContext = value ? Platform.StringUtilities.toKebabCase(value) : undefined;
    }
    option.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({click: true})}`);
    return option;
  }

  override applyEnabledState(enabled: boolean): void {
    super.applyEnabledState(enabled);
    this.element.disabled = !enabled;
  }

  removeOption(option: Element): void {
    this.element.removeChild(option);
  }

  removeOptions(): void {
    this.element.removeChildren();
  }

  selectedOption(): HTMLOptionElement|null {
    if (this.element.selectedIndex >= 0) {
      return this.element[this.element.selectedIndex] as HTMLOptionElement;
    }
    return null;
  }

  select(option: Element): void {
    this.element.selectedIndex = Array.prototype.indexOf.call(this.element, option);
  }

  setSelectedIndex(index: number): void {
    this.element.selectedIndex = index;
  }

  selectedIndex(): number {
    return this.element.selectedIndex;
  }

}

export interface Option {
  value: string;
  label: string;
}

export class ToolbarSettingComboBox extends ToolbarComboBox {
  private optionsInternal: Option[];
  private readonly setting: Common.Settings.Setting<string>;
  private muteSettingListener?: boolean;
  constructor(options: Option[], setting: Common.Settings.Setting<string>, accessibleName: string) {
    super(null, accessibleName, undefined, setting.name);
    this.optionsInternal = options;
    this.setting = setting;
    this.element.addEventListener('change', this.onSelectValueChange.bind(this), false);
    this.setOptions(options);
    setting.addChangeListener(this.onDevToolsSettingChanged, this);
  }

  setOptions(options: Option[]): void {
    this.optionsInternal = options;
    this.element.removeChildren();
    for (let i = 0; i < options.length; ++i) {
      const dataOption = options[i];
      const option = this.createOption(dataOption.label, dataOption.value);
      this.element.appendChild(option);
      if (this.setting.get() === dataOption.value) {
        this.setSelectedIndex(i);
      }
    }
  }

  value(): string {
    return this.optionsInternal[this.selectedIndex()].value;
  }

  override select(option: Element): void {
    const index = Array.prototype.indexOf.call(this.element, option);
    this.setSelectedIndex(index);
  }

  override setSelectedIndex(index: number): void {
    super.setSelectedIndex(index);
    const option = this.optionsInternal.at(index);
    if (option) {
      this.setTitle(option.label);
    }
  }

  /**
   * Note: wondering why there are two event listeners and what the difference is?
   * It is because this combo box <select> is backed by a Devtools setting and
   * at any time there could be multiple instances of these elements that are
   * backed by the same setting. So they have to listen to two things:
   * 1. When the setting is changed via a different method.
   * 2. When the value of the select is changed, triggering a change to the setting.
   */

  /**
   * Runs when the DevTools setting is changed
   */
  private onDevToolsSettingChanged(): void {
    if (this.muteSettingListener) {
      return;
    }

    const value = this.setting.get();
    for (let i = 0; i < this.optionsInternal.length; ++i) {
      if (value === this.optionsInternal[i].value) {
        this.setSelectedIndex(i);
        break;
      }
    }
  }

  /**
   * Run when the user interacts with the <select> element.
   */
  private onSelectValueChange(_event: Event): void {
    const option = this.optionsInternal[this.selectedIndex()];
    this.muteSettingListener = true;
    this.setting.set(option.value);
    this.muteSettingListener = false;
    // Because we mute the DevTools setting change listener, we need to
    // manually update the title here.
    this.setTitle(option.label);
  }
}

export class ToolbarCheckbox extends ToolbarItem<void> {
  #checkboxLabel: CheckboxLabel;
  constructor(
      text: Common.UIString.LocalizedString, tooltip?: Common.UIString.LocalizedString,
      listener?: ((arg0: MouseEvent) => void), jslogContext?: string) {
    const checkboxLabel = CheckboxLabel.create(text, undefined, undefined, jslogContext);
    super(checkboxLabel);
    if (tooltip) {
      Tooltip.install(this.element, tooltip);
    }
    if (listener) {
      this.element.addEventListener('click', listener, false);
    }

    this.#checkboxLabel = checkboxLabel;
  }

  checked(): boolean {
    return (this.element as CheckboxLabel).checked;
  }

  setChecked(value: boolean): void {
    (this.element as CheckboxLabel).checked = value;
  }

  override applyEnabledState(enabled: boolean): void {
    super.applyEnabledState(enabled);
    (this.element as CheckboxLabel).disabled = !enabled;
  }

  setIndeterminate(indeterminate: boolean): void {
    (this.element as CheckboxLabel).indeterminate = indeterminate;
  }

  /**
   * Sets the user visible text shown alongside the checkbox.
   * If you want to update the title/aria-label, use setTitle.
   */
  setLabelText(content: Common.UIString.LocalizedString): void {
    this.#checkboxLabel.setLabelText(content);
  }
}

export class ToolbarSettingCheckbox extends ToolbarCheckbox {
  constructor(
      setting: Common.Settings.Setting<boolean>, tooltip?: Common.UIString.LocalizedString,
      alternateTitle?: Common.UIString.LocalizedString) {
    super(alternateTitle || setting.title(), tooltip, undefined, setting.name);
    bindCheckbox(this.element as CheckboxLabel, setting);
  }
}

const registeredToolbarItems: ToolbarItemRegistration[] = [];

export function registerToolbarItem(registration: ToolbarItemRegistration): void {
  registeredToolbarItems.push(registration);
}

function getRegisteredToolbarItems(): ToolbarItemRegistration[] {
  return registeredToolbarItems.filter(
      item => Root.Runtime.Runtime.isDescriptorEnabled({experiment: item.experiment, condition: item.condition}));
}

export interface ToolbarItemRegistration {
  order?: number;
  location: ToolbarItemLocation;
  separator?: boolean;
  label?: () => Platform.UIString.LocalizedString;
  actionId?: string;
  condition?: Root.Runtime.Condition;
  loadItem?: (() => Promise<Provider>);
  experiment?: string;
  jslog?: string;
}

export const enum ToolbarItemLocation {
  FILES_NAVIGATION_TOOLBAR = 'files-navigator-toolbar',
  MAIN_TOOLBAR_RIGHT = 'main-toolbar-right',
  MAIN_TOOLBAR_LEFT = 'main-toolbar-left',
  STYLES_SIDEBARPANE_TOOLBAR = 'styles-sidebarpane-toolbar',
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-toolbar': Toolbar;
    'devtools-toolbar-input': ToolbarInputElement;
  }
}
