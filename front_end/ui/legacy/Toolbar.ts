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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';

import type {Action} from './ActionRegistration.js';
import {Events as ActionEvents} from './ActionRegistration.js';
import {ActionRegistry} from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import {ContextMenu} from './ContextMenu.js';
import {GlassPane, PointerEventsBehavior} from './GlassPane.js';
import {Icon} from './Icon.js';
import {bindCheckbox} from './SettingsUI.js';
import type {Suggestion} from './SuggestBox.js';
import {Events as TextPromptEvents, TextPrompt} from './TextPrompt.js';
import {Tooltip} from './Tooltip.js';
import {CheckboxLabel, LongClickController} from './UIUtils.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';

const UIStrings = {
  /**
  *@description Announced screen reader message for ToolbarSettingToggle when the setting is toggled on.
  */
  pressed: 'pressed',
  /**
  *@description Announced screen reader message for ToolbarSettingToggle when the setting is toggled off.
  */
  notPressed: 'not pressed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Toolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Toolbar {
  _items: ToolbarItem[];
  element: HTMLElement;
  _enabled: boolean;
  _shadowRoot: ShadowRoot;
  _contentElement: Element;
  _insertionPoint: Element;
  private compactLayout = false;

  constructor(className: string, parentElement?: Element) {
    this._items = [];
    this.element = (parentElement ? parentElement.createChild('div') : document.createElement('div')) as HTMLElement;
    this.element.className = className;
    this.element.classList.add('toolbar');
    this._enabled = true;
    this._shadowRoot =
        createShadowRootWithCoreStyles(this.element, {cssFile: 'ui/legacy/toolbar.css', delegatesFocus: undefined});
    this._contentElement = this._shadowRoot.createChild('div', 'toolbar-shadow');
    this._insertionPoint = this._contentElement.createChild('slot');
  }

  hasCompactLayout(): boolean {
    return this.compactLayout;
  }

  setCompactLayout(enable: boolean): void {
    if (this.compactLayout === enable) {
      return;
    }
    this.compactLayout = enable;
    for (const item of this._items) {
      item.setCompactLayout(enable);
    }
  }

  static createLongPressActionButton(
      action: Action, toggledOptions: ToolbarButton[], untoggledOptions: ToolbarButton[]): ToolbarButton {
    const button = Toolbar.createActionButton(action);
    const mainButtonClone = Toolbar.createActionButton(action);

    let longClickController: LongClickController|null = null;
    let longClickButtons: ToolbarButton[]|null = null;
    let longClickGlyph: Icon|null = null;

    action.addEventListener(ActionEvents.Toggled, updateOptions);
    updateOptions();
    return button;

    function updateOptions(): void {
      const buttons = action.toggled() ? (toggledOptions || null) : (untoggledOptions || null);

      if (buttons && buttons.length) {
        if (!longClickController) {
          longClickController = new LongClickController(button.element, showOptions);
          longClickGlyph = Icon.create('largeicon-longclick-triangle', 'long-click-glyph');
          button.element.appendChild(longClickGlyph);
          longClickButtons = buttons;
        }
      } else {
        if (longClickController) {
          longClickController.dispose();
          longClickController = null;
          if (longClickGlyph) {
            longClickGlyph.remove();
          }
          longClickGlyph = null;
          longClickButtons = null;
        }
      }
    }

    function showOptions(): void {
      let buttons: ToolbarButton[] = longClickButtons ? longClickButtons.slice() : [];
      buttons.push(mainButtonClone);

      const document = button.element.ownerDocument;
      document.documentElement.addEventListener('mouseup', mouseUp, false);

      const optionsGlassPane = new GlassPane();
      optionsGlassPane.setPointerEventsBehavior(PointerEventsBehavior.BlockedByGlassPane);
      optionsGlassPane.show(document);
      const optionsBar = new Toolbar('fill', optionsGlassPane.contentElement);
      optionsBar._contentElement.classList.add('floating');
      const buttonHeight = 26;

      const hostButtonPosition = button.element.boxInWindow().relativeToElement(GlassPane.container(document));

      const topNotBottom = hostButtonPosition.y + buttonHeight * buttons.length < document.documentElement.offsetHeight;

      if (topNotBottom) {
        buttons = buttons.reverse();
      }

      optionsBar.element.style.height = (buttonHeight * buttons.length) + 'px';
      if (topNotBottom) {
        optionsBar.element.style.top = (hostButtonPosition.y - 5) + 'px';
      } else {
        optionsBar.element.style.top = (hostButtonPosition.y - (buttonHeight * (buttons.length - 1)) - 6) + 'px';
      }
      optionsBar.element.style.left = (hostButtonPosition.x - 5) + 'px';

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
          const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-item');
          buttonElement.classList.add('emulate-active');
        }
      }

      function mouseOut(e: Event): void {
        if ((e as MouseEvent).which !== 1) {
          return;
        }
        if (e.target instanceof HTMLElement) {
          const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-item');
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
            buttons[i]._clicked(e);
            break;
          }
        }
      }
    }
  }

  static createActionButton(action: Action, options: ToolbarButtonOptions|undefined = TOOLBAR_BUTTON_DEFAULT_OPTIONS):
      ToolbarButton {
    const button = action.toggleable() ? makeToggle() : makeButton();

    if (options.showLabel) {
      button.setText(action.title());
    }

    let handler = (_event: {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any,
    }): void => {
      action.execute();
    };
    if (options.userActionCode) {
      const actionCode = options.userActionCode;
      handler = (): void => {
        Host.userMetrics.actionTaken(actionCode);
        action.execute();
      };
    }
    button.addEventListener(ToolbarButton.Events.Click, handler, action);
    action.addEventListener(ActionEvents.Enabled, enabledChanged);
    button.setEnabled(action.enabled());
    return button;

    // @empty-line
    function makeButton(): ToolbarButton {
      const button = new ToolbarButton(action.title(), action.icon());
      if (action.title()) {
        Tooltip.installWithActionBinding(button.element, action.title(), action.id());
      }
      return button;
    }

    function makeToggle(): ToolbarToggle {
      const toggleButton = new ToolbarToggle(action.title(), action.icon(), action.toggledIcon());
      toggleButton.setToggleWithRedColor(action.toggleWithRedColor());
      action.addEventListener(ActionEvents.Toggled, toggled);
      toggled();
      return toggleButton;

      function toggled(): void {
        toggleButton.setToggled(action.toggled());
        if (action.title()) {
          toggleButton.setTitle(action.title());
          Tooltip.install(toggleButton.element, action.title());
        }
      }
    }

    function enabledChanged(event: Common.EventTarget.EventTargetEvent): void {
      button.setEnabled((event.data as boolean));
    }
  }

  static createActionButtonForId(
      actionId: string, options: ToolbarButtonOptions|undefined = TOOLBAR_BUTTON_DEFAULT_OPTIONS): ToolbarButton {
    const action = ActionRegistry.instance().action(actionId);
    return Toolbar.createActionButton((action as Action), options);
  }

  gripElementForResize(): Element {
    return this._contentElement;
  }

  makeWrappable(growVertically?: boolean): void {
    this._contentElement.classList.add('wrappable');
    if (growVertically) {
      this._contentElement.classList.add('toolbar-grow-vertical');
    }
  }

  makeVertical(): void {
    this._contentElement.classList.add('vertical');
  }

  makeBlueOnHover(): void {
    this._contentElement.classList.add('toolbar-blue-on-hover');
  }

  makeToggledGray(): void {
    this._contentElement.classList.add('toolbar-toggled-gray');
  }

  renderAsLinks(): void {
    this._contentElement.classList.add('toolbar-render-as-links');
  }

  empty(): boolean {
    return !this._items.length;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    for (const item of this._items) {
      item._applyEnabledState(this._enabled && item._enabled);
    }
  }

  appendToolbarItem(item: ToolbarItem): void {
    this._items.push(item);
    item.toolbar = this;
    item.setCompactLayout(this.hasCompactLayout());
    if (!this._enabled) {
      item._applyEnabledState(false);
    }
    this._contentElement.insertBefore(item.element, this._insertionPoint);
    this._hideSeparatorDupes();
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

  removeToolbarItems(): void {
    for (const item of this._items) {
      item.toolbar = null;
    }
    this._items = [];
    this._contentElement.removeChildren();
    this._insertionPoint = this._contentElement.createChild('slot');
  }

  setColor(color: string): void {
    const style = document.createElement('style');
    style.textContent = '.toolbar-glyph { background-color: ' + color + ' !important }';
    this._shadowRoot.appendChild(style);
  }

  setToggledColor(color: string): void {
    const style = document.createElement('style');
    style.textContent =
        '.toolbar-button.toolbar-state-on .toolbar-glyph { background-color: ' + color + ' !important }';
    this._shadowRoot.appendChild(style);
  }

  _hideSeparatorDupes(): void {
    if (!this._items.length) {
      return;
    }
    // Don't hide first and last separators if they were added explicitly.
    let previousIsSeparator = false;
    let lastSeparator;
    let nonSeparatorVisible = false;
    for (let i = 0; i < this._items.length; ++i) {
      if (this._items[i] instanceof ToolbarSeparator) {
        this._items[i].setVisible(!previousIsSeparator);
        previousIsSeparator = true;
        lastSeparator = this._items[i];
        continue;
      }
      if (this._items[i].visible()) {
        previousIsSeparator = false;
        lastSeparator = null;
        nonSeparatorVisible = true;
      }
    }
    if (lastSeparator && lastSeparator !== this._items[this._items.length - 1]) {
      lastSeparator.setVisible(false);
    }

    this.element.classList.toggle(
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
      const {separator, actionId, showLabel, loadItem} = extension;
      if (separator) {
        return new ToolbarSeparator();
      }
      if (actionId) {
        return Toolbar.createActionButtonForId(actionId, {showLabel: Boolean(showLabel), userActionCode: undefined});
      }
      // TODO(crbug.com/1134103) constratint the case checked with this if using TS type definitions once UI is TS-authored.
      if (!loadItem) {
        throw new Error('Could not load a toolbar item registration with no loadItem function');
      }
      return loadItem().then(p => (p as Provider).item());
    }));

    for (const item of items) {
      if (item) {
        this.appendToolbarItem(item);
      }
    }
  }
}
export interface ToolbarButtonOptions {
  showLabel: boolean;
  userActionCode?: Host.UserMetrics.Action;
}

const TOOLBAR_BUTTON_DEFAULT_OPTIONS: ToolbarButtonOptions = {
  showLabel: false,
  userActionCode: undefined,
};

// We need any here because Common.ObjectWrapper.ObjectWrapper is invariant in T.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ToolbarItem<T = any> extends Common.ObjectWrapper.ObjectWrapper<T> {
  element: HTMLElement;
  _visible: boolean;
  _enabled: boolean;
  toolbar: Toolbar|null;
  _title?: string;

  constructor(element: Element) {
    super();
    this.element = (element as HTMLElement);
    this.element.classList.add('toolbar-item');
    this._visible = true;
    this._enabled = true;

    /**
     * Set by the parent toolbar during appending.
     */
    this.toolbar = null;
  }

  setTitle(title: string, actionId: string|undefined = undefined): void {
    if (this._title === title) {
      return;
    }
    this._title = title;
    ARIAUtils.setAccessibleName(this.element, title);
    if (actionId === undefined) {
      Tooltip.install(this.element, title);
    } else {
      Tooltip.installWithActionBinding(this.element, title, actionId);
    }
  }

  setEnabled(value: boolean): void {
    if (this._enabled === value) {
      return;
    }
    this._enabled = value;
    this._applyEnabledState(this._enabled && (!this.toolbar || this.toolbar._enabled));
  }

  _applyEnabledState(enabled: boolean): void {
    // @ts-ignore: Ignoring in favor of an `instanceof` check for all the different
    //             kind of HTMLElement classes that have a disabled attribute.
    this.element.disabled = !enabled;
  }

  visible(): boolean {
    return this._visible;
  }

  setVisible(x: boolean): void {
    if (this._visible === x) {
      return;
    }
    this.element.classList.toggle('hidden', !x);
    this._visible = x;
    if (this.toolbar && !(this instanceof ToolbarSeparator)) {
      this.toolbar._hideSeparatorDupes();
    }
  }

  setRightAligned(alignRight: boolean): void {
    this.element.classList.toggle('toolbar-item-right-aligned', alignRight);
  }

  setCompactLayout(_enable: boolean): void {
  }
}

export const enum ToolbarItemWithCompactLayoutEvents {
  CompactLayoutUpdated = 'CompactLayoutUpdated',
}

type ToolbarItemWithCompactLayoutEventTypes = {
  [ToolbarItemWithCompactLayoutEvents.CompactLayoutUpdated]: boolean,
};

export class ToolbarItemWithCompactLayout extends ToolbarItem<ToolbarItemWithCompactLayoutEventTypes> {
  constructor(element: Element) {
    super(element);
  }

  override setCompactLayout(enable: boolean): void {
    this.dispatchEventToListeners(ToolbarItemWithCompactLayoutEvents.CompactLayoutUpdated, enable);
  }
}

export class ToolbarText extends ToolbarItem<void> {
  constructor(text?: string) {
    const element = document.createElement('div');
    element.classList.add('toolbar-text');
    super(element);
    this.element.classList.add('toolbar-text');
    this.setText(text || '');
  }

  text(): string {
    return this.element.textContent || '';
  }

  setText(text: string): void {
    this.element.textContent = text;
  }
}

export class ToolbarButton extends ToolbarItem<ToolbarButton.EventTypes> {
  _glyphElement: Icon;
  _textElement: HTMLElement;
  _title: string;
  _text?: string;
  _glyph?: string;
  /**
   * TODO(crbug.com/1126026): remove glyph parameter in favor of icon.
   */
  constructor(title: string, glyphOrIcon?: string|HTMLElement, text?: string) {
    const element = document.createElement('button');
    element.classList.add('toolbar-button');
    super(element);
    this.element.addEventListener('click', this._clicked.bind(this), false);
    this.element.addEventListener('mousedown', this._mouseDown.bind(this), false);

    this._glyphElement = Icon.create('', 'toolbar-glyph hidden');
    this.element.appendChild(this._glyphElement);
    this._textElement = this.element.createChild('div', 'toolbar-text hidden');

    this.setTitle(title);
    if (glyphOrIcon instanceof HTMLElement) {
      glyphOrIcon.classList.add('toolbar-icon');
      this.element.append(glyphOrIcon);
    } else if (glyphOrIcon) {
      this.setGlyph(glyphOrIcon);
    }
    this.setText(text || '');
    this._title = '';
  }

  focus(): void {
    this.element.focus();
  }

  setText(text: string): void {
    if (this._text === text) {
      return;
    }
    this._textElement.textContent = text;
    this._textElement.classList.toggle('hidden', !text);
    this._text = text;
  }

  setGlyph(glyph: string): void {
    if (this._glyph === glyph) {
      return;
    }
    this._glyphElement.setIconType(glyph);
    this._glyphElement.classList.toggle('hidden', !glyph);
    this.element.classList.toggle('toolbar-has-glyph', Boolean(glyph));
    this._glyph = glyph;
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

  turnIntoSelect(shrinkable: boolean|undefined = false): void {
    this.element.classList.add('toolbar-has-dropdown');
    if (shrinkable) {
      this.element.classList.add('toolbar-has-dropdown-shrinkable');
    }
    const dropdownArrowIcon = Icon.create('smallicon-triangle-down', 'toolbar-dropdown-arrow');
    this.element.appendChild(dropdownArrowIcon);
  }

  _clicked(event: Event): void {
    if (!this._enabled) {
      return;
    }
    this.dispatchEventToListeners(ToolbarButton.Events.Click, event);
    event.consume();
  }

  _mouseDown(event: MouseEvent): void {
    if (!this._enabled) {
      return;
    }
    this.dispatchEventToListeners(ToolbarButton.Events.MouseDown, event);
  }
}

export namespace ToolbarButton {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    Click = 'Click',
    MouseDown = 'MouseDown',
  }

  export type EventTypes = {
    [Events.Click]: Event,
    [Events.MouseDown]: MouseEvent,
  };
}

export class ToolbarInput extends ToolbarItem<ToolbarInput.EventTypes> {
  _prompt: TextPrompt;
  _proxyElement: Element;

  constructor(
      placeholder: string, accessiblePlaceholder?: string, growFactor?: number, shrinkFactor?: number, tooltip?: string,
      completions?: ((arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestion[]>),
      dynamicCompletions?: boolean) {
    const element = document.createElement('div');
    element.classList.add('toolbar-input');
    super(element);

    const internalPromptElement = this.element.createChild('div', 'toolbar-input-prompt');
    ARIAUtils.setAccessibleName(internalPromptElement, placeholder);
    internalPromptElement.addEventListener('focus', () => this.element.classList.add('focused'));
    internalPromptElement.addEventListener('blur', () => this.element.classList.remove('focused'));

    this._prompt = new TextPrompt();
    this._proxyElement = this._prompt.attach(internalPromptElement);
    this._proxyElement.classList.add('toolbar-prompt-proxy');
    this._proxyElement.addEventListener('keydown', (event: Event) => this._onKeydownCallback(event));
    this._prompt.initialize(completions || ((): Promise<never[]> => Promise.resolve([])), ' ', dynamicCompletions);
    if (tooltip) {
      this._prompt.setTitle(tooltip);
    }
    this._prompt.setPlaceholder(placeholder, accessiblePlaceholder);
    this._prompt.addEventListener(TextPromptEvents.TextChanged, this._onChangeCallback.bind(this));

    if (growFactor) {
      this.element.style.flexGrow = String(growFactor);
    }
    if (shrinkFactor) {
      this.element.style.flexShrink = String(shrinkFactor);
    }

    const clearButton = this.element.createChild('div', 'toolbar-input-clear-button');
    clearButton.appendChild(Icon.create('mediumicon-gray-cross-active', 'search-cancel-button'));
    clearButton.addEventListener('click', () => {
      this.setValue('', true);
      this._prompt.focus();
    });

    this._updateEmptyStyles();
  }

  _applyEnabledState(enabled: boolean): void {
    this._prompt.setEnabled(enabled);
  }

  setValue(value: string, notify?: boolean): void {
    this._prompt.setText(value);
    if (notify) {
      this._onChangeCallback();
    }
    this._updateEmptyStyles();
  }

  value(): string {
    return this._prompt.textWithCurrentSuggestion();
  }

  _onKeydownCallback(event: Event): void {
    if ((event as KeyboardEvent).key === 'Enter' && this._prompt.text()) {
      this.dispatchEventToListeners(ToolbarInput.Event.EnterPressed, this._prompt.text());
    }
    if (!isEscKey(event) || !this._prompt.text()) {
      return;
    }
    this.setValue('', true);
    event.consume(true);
  }

  _onChangeCallback(): void {
    this._updateEmptyStyles();
    this.dispatchEventToListeners(ToolbarInput.Event.TextChanged, this._prompt.text());
  }

  _updateEmptyStyles(): void {
    this.element.classList.toggle('toolbar-input-empty', !this._prompt.text());
  }
}

export namespace ToolbarInput {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Event {
    TextChanged = 'TextChanged',
    EnterPressed = 'EnterPressed',
  }

  export interface EventTypes {
    [Event.TextChanged]: string;
    [Event.EnterPressed]: string;
  }
}

export class ToolbarToggle extends ToolbarButton {
  _toggled: boolean;
  _untoggledGlyph: string|undefined;
  _toggledGlyph: string|undefined;

  constructor(title: string, glyph?: string, toggledGlyph?: string) {
    super(title, glyph, '');
    this._toggled = false;
    this._untoggledGlyph = glyph;
    this._toggledGlyph = toggledGlyph;
    this.element.classList.add('toolbar-state-off');
    ARIAUtils.setPressed(this.element, false);
  }

  toggled(): boolean {
    return this._toggled;
  }

  setToggled(toggled: boolean): void {
    if (this._toggled === toggled) {
      return;
    }
    this._toggled = toggled;
    this.element.classList.toggle('toolbar-state-on', toggled);
    this.element.classList.toggle('toolbar-state-off', !toggled);
    ARIAUtils.setPressed(this.element, toggled);
    if (this._toggledGlyph && this._untoggledGlyph) {
      this.setGlyph(toggled ? this._toggledGlyph : this._untoggledGlyph);
    }
  }

  setDefaultWithRedColor(withRedColor: boolean): void {
    this.element.classList.toggle('toolbar-default-with-red-color', withRedColor);
  }

  setToggleWithRedColor(toggleWithRedColor: boolean): void {
    this.element.classList.toggle('toolbar-toggle-with-red-color', toggleWithRedColor);
  }
}

export class ToolbarMenuButton extends ToolbarButton {
  _contextMenuHandler: (arg0: ContextMenu) => void;
  _useSoftMenu: boolean;
  _triggerTimeout?: number;
  _lastTriggerTime?: number;
  constructor(contextMenuHandler: (arg0: ContextMenu) => void, useSoftMenu?: boolean) {
    super('', 'largeicon-menu');
    this._contextMenuHandler = contextMenuHandler;
    this._useSoftMenu = Boolean(useSoftMenu);
    ARIAUtils.markAsMenuButton(this.element);
  }

  _mouseDown(event: MouseEvent): void {
    if (event.buttons !== 1) {
      super._mouseDown(event);
      return;
    }

    if (!this._triggerTimeout) {
      this._triggerTimeout = window.setTimeout(this._trigger.bind(this, event), 200);
    }
  }

  _trigger(event: Event): void {
    delete this._triggerTimeout;

    // Throttling avoids entering a bad state on Macs when rapidly triggering context menus just
    // after the window gains focus. See crbug.com/655556
    if (this._lastTriggerTime && Date.now() - this._lastTriggerTime < 300) {
      return;
    }
    const contextMenu = new ContextMenu(
        event, this._useSoftMenu, this.element.totalOffsetLeft(),
        this.element.totalOffsetTop() + this.element.offsetHeight);
    this._contextMenuHandler(contextMenu);
    contextMenu.show();
    this._lastTriggerTime = Date.now();
  }

  _clicked(event: Event): void {
    if (this._triggerTimeout) {
      clearTimeout(this._triggerTimeout);
    }
    this._trigger(event);
  }
}

export class ToolbarSettingToggle extends ToolbarToggle {
  _defaultTitle: string;
  _setting: Common.Settings.Setting<boolean>;
  _willAnnounceState: boolean;

  constructor(setting: Common.Settings.Setting<boolean>, glyph: string, title: string) {
    super(title, glyph);
    this._defaultTitle = title;
    this._setting = setting;
    this._settingChanged();
    this._setting.addChangeListener(this._settingChanged, this);

    // Determines whether the toggle state will be announced to a screen reader
    this._willAnnounceState = false;
  }

  _settingChanged(): void {
    const toggled = this._setting.get();
    this.setToggled(toggled);
    const toggleAnnouncement = toggled ? i18nString(UIStrings.pressed) : i18nString(UIStrings.notPressed);
    if (this._willAnnounceState) {
      ARIAUtils.alert(toggleAnnouncement);
    }
    this._willAnnounceState = false;
    this.setTitle(this._defaultTitle);
  }

  _clicked(event: Event): void {
    this._willAnnounceState = true;
    this._setting.set(!this.toggled());
    super._clicked(event);
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

export class ToolbarComboBox extends ToolbarItem<void> {
  _selectElement: HTMLSelectElement;

  constructor(changeHandler: ((arg0: Event) => void)|null, title: string, className?: string) {
    const element = document.createElement('span');
    element.classList.add('toolbar-select-container');
    super(element);
    this._selectElement = (this.element.createChild('select', 'toolbar-item') as HTMLSelectElement);
    const dropdownArrowIcon = Icon.create('smallicon-triangle-down', 'toolbar-dropdown-arrow');
    this.element.appendChild(dropdownArrowIcon);
    if (changeHandler) {
      this._selectElement.addEventListener('change', changeHandler, false);
    }
    ARIAUtils.setAccessibleName(this._selectElement, title);
    super.setTitle(title);
    if (className) {
      this._selectElement.classList.add(className);
    }
  }

  selectElement(): HTMLSelectElement {
    return this._selectElement;
  }

  size(): number {
    return this._selectElement.childElementCount;
  }

  options(): HTMLOptionElement[] {
    return Array.prototype.slice.call(this._selectElement.children, 0);
  }

  addOption(option: Element): void {
    this._selectElement.appendChild(option);
  }

  createOption(label: string, value?: string): Element {
    const option = (this._selectElement.createChild('option') as HTMLOptionElement);
    option.text = label;
    if (typeof value !== 'undefined') {
      option.value = value;
    }
    return option;
  }

  _applyEnabledState(enabled: boolean): void {
    super._applyEnabledState(enabled);
    this._selectElement.disabled = !enabled;
  }

  removeOption(option: Element): void {
    this._selectElement.removeChild(option);
  }

  removeOptions(): void {
    this._selectElement.removeChildren();
  }

  selectedOption(): HTMLOptionElement|null {
    if (this._selectElement.selectedIndex >= 0) {
      return this._selectElement[this._selectElement.selectedIndex] as HTMLOptionElement;
    }
    return null;
  }

  select(option: Element): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._selectElement.selectedIndex = Array.prototype.indexOf.call((this._selectElement as any), option);
  }

  setSelectedIndex(index: number): void {
    this._selectElement.selectedIndex = index;
  }

  selectedIndex(): number {
    return this._selectElement.selectedIndex;
  }

  setMaxWidth(width: number): void {
    this._selectElement.style.maxWidth = width + 'px';
  }

  setMinWidth(width: number): void {
    this._selectElement.style.minWidth = width + 'px';
  }
}

export interface Option {
  value: string;
  label: string;
}

export class ToolbarSettingComboBox extends ToolbarComboBox {
  _options: Option[];
  _setting: Common.Settings.Setting<string>;
  _muteSettingListener?: boolean;
  constructor(options: Option[], setting: Common.Settings.Setting<string>, accessibleName: string) {
    super(null, accessibleName);
    this._options = options;
    this._setting = setting;
    this._selectElement.addEventListener('change', this._valueChanged.bind(this), false);
    this.setOptions(options);
    setting.addChangeListener(this._settingChanged, this);
  }

  setOptions(options: Option[]): void {
    this._options = options;
    this._selectElement.removeChildren();
    for (let i = 0; i < options.length; ++i) {
      const dataOption = options[i];
      const option = this.createOption(dataOption.label, dataOption.value);
      this._selectElement.appendChild(option);
      if (this._setting.get() === dataOption.value) {
        this.setSelectedIndex(i);
      }
    }
  }

  value(): string {
    return this._options[this.selectedIndex()].value;
  }

  _settingChanged(): void {
    if (this._muteSettingListener) {
      return;
    }

    const value = this._setting.get();
    for (let i = 0; i < this._options.length; ++i) {
      if (value === this._options[i].value) {
        this.setSelectedIndex(i);
        break;
      }
    }
  }

  _valueChanged(_event: Event): void {
    const option = this._options[this.selectedIndex()];
    this._muteSettingListener = true;
    this._setting.set(option.value);
    this._muteSettingListener = false;
  }
}

export class ToolbarCheckbox extends ToolbarItem<void> {
  inputElement: HTMLInputElement;

  constructor(text: string, tooltip?: string, listener?: ((arg0: MouseEvent) => void)) {
    super(CheckboxLabel.create(text));
    this.element.classList.add('checkbox');
    this.inputElement = (this.element as CheckboxLabel).checkboxElement;
    if (tooltip) {
      // install on the checkbox
      Tooltip.install(this.inputElement, tooltip);
      Tooltip.install((this.element as CheckboxLabel).textElement, tooltip);
    }
    if (listener) {
      this.inputElement.addEventListener('click', listener, false);
    }
  }

  checked(): boolean {
    return this.inputElement.checked;
  }

  setChecked(value: boolean): void {
    this.inputElement.checked = value;
  }

  _applyEnabledState(enabled: boolean): void {
    super._applyEnabledState(enabled);
    this.inputElement.disabled = !enabled;
  }
}

export class ToolbarSettingCheckbox extends ToolbarCheckbox {
  constructor(setting: Common.Settings.Setting<boolean>, tooltip?: string, alternateTitle?: string) {
    super(alternateTitle || setting.title() || '', tooltip);
    bindCheckbox(this.inputElement, setting);
  }
}

const registeredToolbarItems: ToolbarItemRegistration[] = [];

export function registerToolbarItem(registration: ToolbarItemRegistration): void {
  registeredToolbarItems.push(registration);
}

function getRegisteredToolbarItems(): ToolbarItemRegistration[] {
  return registeredToolbarItems.filter(
      item => Root.Runtime.Runtime.isDescriptorEnabled({experiment: undefined, condition: item.condition}));
}

export interface ToolbarItemRegistration {
  order?: number;
  location: ToolbarItemLocation;
  separator?: boolean;
  showLabel?: boolean;
  actionId?: string;
  condition?: string;
  loadItem?: (() => Promise<Provider>);
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ToolbarItemLocation {
  FILES_NAVIGATION_TOOLBAR = 'files-navigator-toolbar',
  MAIN_TOOLBAR_RIGHT = 'main-toolbar-right',
  MAIN_TOOLBAR_LEFT = 'main-toolbar-left',
  STYLES_SIDEBARPANE_TOOLBAR = 'styles-sidebarpane-toolbar',
}
