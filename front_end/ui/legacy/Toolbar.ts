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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';

import * as Utils from './utils/utils.js';

import {Events as ActionEvents, type Action} from './ActionRegistration.js';
import {ActionRegistry} from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import {ContextMenu} from './ContextMenu.js';
import {GlassPane, PointerEventsBehavior} from './GlassPane.js';
import {Icon} from './Icon.js';
import {bindCheckbox} from './SettingsUI.js';
import {type Suggestion} from './SuggestBox.js';
import {Events as TextPromptEvents, TextPrompt} from './TextPrompt.js';
import {Tooltip} from './Tooltip.js';
import {CheckboxLabel, LongClickController} from './UIUtils.js';
import toolbarStyles from './toolbar.css.legacy.js';

const UIStrings = {
  /**
   *@description Announced screen reader message for ToolbarSettingToggle when the setting is toggled on.
   */
  pressed: 'pressed',
  /**
   *@description Announced screen reader message for ToolbarSettingToggle when the setting is toggled off.
   */
  notPressed: 'not pressed',
  /**
   *@description Tooltip shown when the user hovers over the clear icon to empty the text input.
   */
  clearInput: 'Clear input',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Toolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Toolbar {
  private items: ToolbarItem[];
  element: HTMLElement;
  enabled: boolean;
  private readonly shadowRoot: ShadowRoot;
  private contentElement: Element;
  private compactLayout = false;

  constructor(className: string, parentElement?: Element) {
    this.items = [];
    this.element = (parentElement ? parentElement.createChild('div') : document.createElement('div')) as HTMLElement;
    this.element.className = className;
    this.element.classList.add('toolbar');
    this.enabled = true;
    this.shadowRoot =
        Utils.createShadowRootWithCoreStyles(this.element, {cssFile: toolbarStyles, delegatesFocus: undefined});
    this.contentElement = this.shadowRoot.createChild('div', 'toolbar-shadow');
  }

  hasCompactLayout(): boolean {
    return this.compactLayout;
  }

  registerCSSFiles(cssFiles: CSSStyleSheet[]): void {
    this.shadowRoot.adoptedStyleSheets = this.shadowRoot.adoptedStyleSheets.concat(cssFiles);
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
      optionsBar.contentElement.classList.add('floating');
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
            buttons[i].clicked(e);
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
      void action.execute();
    };
    if (options.userActionCode) {
      const actionCode = options.userActionCode;
      handler = (): void => {
        Host.userMetrics.actionTaken(actionCode);
        void action.execute();
      };
    }
    button.addEventListener(ToolbarButton.Events.Click, handler, action);
    action.addEventListener(ActionEvents.Enabled, enabledChanged);
    button.setEnabled(action.enabled());
    return button;

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
          Tooltip.installWithActionBinding(toggleButton.element, action.title(), action.id());
        }
      }
    }

    function enabledChanged(event: Common.EventTarget.EventTargetEvent<boolean>): void {
      button.setEnabled(event.data);
    }
  }

  static createActionButtonForId(
      actionId: string, options: ToolbarButtonOptions|undefined = TOOLBAR_BUTTON_DEFAULT_OPTIONS): ToolbarButton {
    const action = ActionRegistry.instance().action(actionId);
    return Toolbar.createActionButton((action as Action), options);
  }

  gripElementForResize(): Element {
    return this.contentElement;
  }

  makeWrappable(growVertically?: boolean): void {
    this.contentElement.classList.add('wrappable');
    if (growVertically) {
      this.contentElement.classList.add('toolbar-grow-vertical');
    }
  }

  makeVertical(): void {
    this.contentElement.classList.add('vertical');
  }

  makeBlueOnHover(): void {
    this.contentElement.classList.add('toolbar-blue-on-hover');
  }

  makeToggledGray(): void {
    this.contentElement.classList.add('toolbar-toggled-gray');
  }

  renderAsLinks(): void {
    this.contentElement.classList.add('toolbar-render-as-links');
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
    this.contentElement.appendChild(item.element);
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
    this.contentElement.removeChildren();
  }

  setColor(color: string): void {
    const style = document.createElement('style');
    style.textContent = '.toolbar-glyph { background-color: ' + color + ' !important }';
    this.shadowRoot.appendChild(style);
  }

  setToggledColor(color: string): void {
    const style = document.createElement('style');
    style.textContent =
        '.toolbar-button.toolbar-state-on .toolbar-glyph { background-color: ' + color + ' !important }';
    this.shadowRoot.appendChild(style);
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
  private visibleInternal: boolean;
  enabled: boolean;
  toolbar: Toolbar|null;
  protected title?: string;

  constructor(element: Element) {
    super();
    this.element = (element as HTMLElement);
    this.element.classList.add('toolbar-item');
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
    ARIAUtils.setAccessibleName(this.element, title);
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
    // @ts-ignore: Ignoring in favor of an `instanceof` check for all the different
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
  private readonly glyphElement: Icon;
  private textElement: HTMLElement;
  private text?: string;
  private glyph?: string;
  private icon?: HTMLElement;
  /**
   * TODO(crbug.com/1126026): remove glyph parameter in favor of icon.
   */
  constructor(title: string, glyphOrIcon?: string|HTMLElement, text?: string) {
    const element = document.createElement('button');
    element.classList.add('toolbar-button');
    super(element);
    this.element.addEventListener('click', this.clicked.bind(this), false);
    this.element.addEventListener('mousedown', this.mouseDown.bind(this), false);

    this.glyphElement = Icon.create('', 'toolbar-glyph hidden');
    this.element.appendChild(this.glyphElement);
    this.textElement = this.element.createChild('div', 'toolbar-text hidden');

    this.setTitle(title);
    if (glyphOrIcon) {
      this.setGlyphOrIcon(glyphOrIcon);
    }
    this.setText(text || '');
    this.title = '';
  }

  focus(): void {
    this.element.focus();
  }

  setText(text: string): void {
    if (this.text === text) {
      return;
    }
    this.textElement.textContent = text;
    this.textElement.classList.toggle('hidden', !text);
    this.text = text;
  }

  setGlyphOrIcon(glyphOrIcon: string|HTMLElement): void {
    if (glyphOrIcon instanceof HTMLElement) {
      glyphOrIcon.classList.add('toolbar-icon');
      if (this.icon) {
        this.icon.replaceWith(glyphOrIcon);
      } else {
        this.element.appendChild(glyphOrIcon);
      }
      this.icon = glyphOrIcon;
    } else if (glyphOrIcon) {
      this.setGlyph(glyphOrIcon);
    }
  }

  setGlyph(glyph: string): void {
    if (this.glyph === glyph) {
      return;
    }
    this.glyphElement.setIconType(glyph);
    this.glyphElement.classList.toggle('hidden', !glyph);
    this.element.classList.toggle('toolbar-has-glyph', Boolean(glyph));
    this.glyph = glyph;
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

  clicked(event: Event): void {
    if (!this.enabled) {
      return;
    }
    this.dispatchEventToListeners(ToolbarButton.Events.Click, event);
    event.consume();
  }

  protected mouseDown(event: MouseEvent): void {
    if (!this.enabled) {
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
  private prompt: TextPrompt;
  private readonly proxyElement: Element;

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

    this.prompt = new TextPrompt();
    this.proxyElement = this.prompt.attach(internalPromptElement);
    this.proxyElement.classList.add('toolbar-prompt-proxy');
    this.proxyElement.addEventListener('keydown', (event: Event) => this.onKeydownCallback(event as KeyboardEvent));
    this.prompt.initialize(completions || ((): Promise<never[]> => Promise.resolve([])), ' ', dynamicCompletions);
    if (tooltip) {
      this.prompt.setTitle(tooltip);
    }
    this.prompt.setPlaceholder(placeholder, accessiblePlaceholder);
    this.prompt.addEventListener(TextPromptEvents.TextChanged, this.onChangeCallback.bind(this));

    if (growFactor) {
      this.element.style.flexGrow = String(growFactor);
    }
    if (shrinkFactor) {
      this.element.style.flexShrink = String(shrinkFactor);
    }

    const clearButton = this.element.createChild('div', 'toolbar-input-clear-button');
    clearButton.title = UIStrings.clearInput;
    clearButton.appendChild(Icon.create('mediumicon-gray-cross-active', 'search-cancel-button'));
    clearButton.addEventListener('click', () => {
      this.setValue('', true);
      this.prompt.focus();
    });

    this.updateEmptyStyles();
  }

  applyEnabledState(enabled: boolean): void {
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

  private onKeydownCallback(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.prompt.text()) {
      this.dispatchEventToListeners(ToolbarInput.Event.EnterPressed, this.prompt.text());
    }
    if (!Platform.KeyboardUtilities.isEscKey(event) || !this.prompt.text()) {
      return;
    }
    this.setValue('', true);
    event.consume(true);
  }

  private onChangeCallback(): void {
    this.updateEmptyStyles();
    this.dispatchEventToListeners(ToolbarInput.Event.TextChanged, this.prompt.text());
  }

  private updateEmptyStyles(): void {
    this.element.classList.toggle('toolbar-input-empty', !this.prompt.text());
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
  private toggledInternal: boolean;
  private readonly untoggledGlyphOrIcon: string|HTMLElement|undefined;
  private readonly toggledGlyphOrIcon: string|HTMLElement|undefined;

  constructor(title: string, glyphOrIcon?: string|HTMLElement, toggledGlyphOrIcon?: string|HTMLElement) {
    super(title, glyphOrIcon, '');
    this.toggledInternal = false;
    this.untoggledGlyphOrIcon = glyphOrIcon;
    this.toggledGlyphOrIcon = toggledGlyphOrIcon;
    this.element.classList.add('toolbar-state-off');
    ARIAUtils.setPressed(this.element, false);
  }

  toggled(): boolean {
    return this.toggledInternal;
  }

  setToggled(toggled: boolean): void {
    if (this.toggledInternal === toggled) {
      return;
    }
    this.toggledInternal = toggled;
    this.element.classList.toggle('toolbar-state-on', toggled);
    this.element.classList.toggle('toolbar-state-off', !toggled);
    ARIAUtils.setPressed(this.element, toggled);
    if (this.toggledGlyphOrIcon && this.untoggledGlyphOrIcon) {
      this.setGlyphOrIcon(toggled ? this.toggledGlyphOrIcon : this.untoggledGlyphOrIcon);
    }
  }

  setDefaultWithRedColor(withRedColor: boolean): void {
    this.element.classList.toggle('toolbar-default-with-red-color', withRedColor);
  }

  setToggleWithRedColor(toggleWithRedColor: boolean): void {
    this.element.classList.toggle('toolbar-toggle-with-red-color', toggleWithRedColor);
  }

  setToggleWithDot(toggleWithDot: boolean): void {
    this.element.classList.toggle('toolbar-toggle-with-dot', toggleWithDot);
  }
}

export class ToolbarMenuButton extends ToolbarButton {
  private readonly contextMenuHandler: (arg0: ContextMenu) => void;
  private readonly useSoftMenu: boolean;
  private triggerTimeout?: number;
  private lastTriggerTime?: number;
  constructor(contextMenuHandler: (arg0: ContextMenu) => void, useSoftMenu?: boolean) {
    super('', 'largeicon-menu');
    this.contextMenuHandler = contextMenuHandler;
    this.useSoftMenu = Boolean(useSoftMenu);
    ARIAUtils.markAsMenuButton(this.element);
  }

  mouseDown(event: MouseEvent): void {
    if (event.buttons !== 1) {
      super.mouseDown(event);
      return;
    }

    if (!this.triggerTimeout) {
      this.triggerTimeout = window.setTimeout(this.trigger.bind(this, event), 200);
    }
  }

  private trigger(event: Event): void {
    delete this.triggerTimeout;

    // Throttling avoids entering a bad state on Macs when rapidly triggering context menus just
    // after the window gains focus. See crbug.com/655556
    if (this.lastTriggerTime && Date.now() - this.lastTriggerTime < 300) {
      return;
    }
    const contextMenu = new ContextMenu(event, {
      useSoftMenu: this.useSoftMenu,
      x: this.element.getBoundingClientRect().left,
      y: this.element.getBoundingClientRect().top + this.element.offsetHeight,
    });
    this.contextMenuHandler(contextMenu);
    void contextMenu.show();
    this.lastTriggerTime = Date.now();
  }

  clicked(event: Event): void {
    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
    }
    this.trigger(event);
  }
}

export class ToolbarSettingToggle extends ToolbarToggle {
  private readonly defaultTitle: string;
  private readonly setting: Common.Settings.Setting<boolean>;
  private willAnnounceState: boolean;

  constructor(setting: Common.Settings.Setting<boolean>, glyph: string, title: string) {
    super(title, glyph);
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
      ARIAUtils.alert(toggleAnnouncement);
    }
    this.willAnnounceState = false;
    this.setTitle(this.defaultTitle);
  }

  clicked(event: Event): void {
    this.willAnnounceState = true;
    this.setting.set(!this.toggled());
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

export class ToolbarComboBox extends ToolbarItem<void> {
  protected selectElementInternal: HTMLSelectElement;

  constructor(changeHandler: ((arg0: Event) => void)|null, title: string, className?: string) {
    const element = document.createElement('span');
    element.classList.add('toolbar-select-container');
    super(element);
    this.selectElementInternal = (this.element.createChild('select', 'toolbar-item') as HTMLSelectElement);
    const dropdownArrowIcon = Icon.create('smallicon-triangle-down', 'toolbar-dropdown-arrow');
    this.element.appendChild(dropdownArrowIcon);
    if (changeHandler) {
      this.selectElementInternal.addEventListener('change', changeHandler, false);
    }
    ARIAUtils.setAccessibleName(this.selectElementInternal, title);
    super.setTitle(title);
    if (className) {
      this.selectElementInternal.classList.add(className);
    }
  }

  selectElement(): HTMLSelectElement {
    return this.selectElementInternal;
  }

  size(): number {
    return this.selectElementInternal.childElementCount;
  }

  options(): HTMLOptionElement[] {
    return Array.prototype.slice.call(this.selectElementInternal.children, 0);
  }

  addOption(option: Element): void {
    this.selectElementInternal.appendChild(option);
  }

  createOption(label: string, value?: string): Element {
    const option = (this.selectElementInternal.createChild('option') as HTMLOptionElement);
    option.text = label;
    if (typeof value !== 'undefined') {
      option.value = value;
    }
    return option;
  }

  applyEnabledState(enabled: boolean): void {
    super.applyEnabledState(enabled);
    this.selectElementInternal.disabled = !enabled;
  }

  removeOption(option: Element): void {
    this.selectElementInternal.removeChild(option);
  }

  removeOptions(): void {
    this.selectElementInternal.removeChildren();
  }

  selectedOption(): HTMLOptionElement|null {
    if (this.selectElementInternal.selectedIndex >= 0) {
      return this.selectElementInternal[this.selectElementInternal.selectedIndex] as HTMLOptionElement;
    }
    return null;
  }

  select(option: Element): void {
    this.selectElementInternal.selectedIndex =
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array.prototype.indexOf.call((this.selectElementInternal as any), option);
  }

  setSelectedIndex(index: number): void {
    this.selectElementInternal.selectedIndex = index;
  }

  selectedIndex(): number {
    return this.selectElementInternal.selectedIndex;
  }

  setMaxWidth(width: number): void {
    this.selectElementInternal.style.maxWidth = width + 'px';
  }

  setMinWidth(width: number): void {
    this.selectElementInternal.style.minWidth = width + 'px';
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
    super(null, accessibleName);
    this.optionsInternal = options;
    this.setting = setting;
    this.selectElementInternal.addEventListener('change', this.valueChanged.bind(this), false);
    this.setOptions(options);
    setting.addChangeListener(this.settingChanged, this);
  }

  setOptions(options: Option[]): void {
    this.optionsInternal = options;
    this.selectElementInternal.removeChildren();
    for (let i = 0; i < options.length; ++i) {
      const dataOption = options[i];
      const option = this.createOption(dataOption.label, dataOption.value);
      this.selectElementInternal.appendChild(option);
      if (this.setting.get() === dataOption.value) {
        this.setSelectedIndex(i);
      }
    }
  }

  value(): string {
    return this.optionsInternal[this.selectedIndex()].value;
  }

  private settingChanged(): void {
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

  private valueChanged(_event: Event): void {
    const option = this.optionsInternal[this.selectedIndex()];
    this.muteSettingListener = true;
    this.setting.set(option.value);
    this.muteSettingListener = false;
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

  applyEnabledState(enabled: boolean): void {
    super.applyEnabledState(enabled);
    this.inputElement.disabled = !enabled;
  }

  setIndeterminate(indeterminate: boolean): void {
    this.inputElement.indeterminate = indeterminate;
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
