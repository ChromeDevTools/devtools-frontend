/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {AnchorBehavior, GlassPane, MarginBehavior, PointerEventsBehavior, SizeBehavior} from './GlassPane.js';
import {InspectorView} from './InspectorView.js';
import softContextMenuStyles from './softContextMenu.css.legacy.js';
import {Tooltip} from './Tooltip.js';
import {createTextChild, ElementFocusRestorer} from './UIUtils.js';

const UIStrings = {
  /**
   *@description Text exposed to screen readers on checked items.
   */
  checked: 'checked',
  /**
   *@description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: 'unchecked',
  /**
   *@description Accessibility label for checkable SoftContextMenuItems with shortcuts
   *@example {Open File} PH1
   *@example {Ctrl + P} PH2
   *@example {checked} PH3
   */
  sSS: '{PH1}, {PH2}, {PH3}',
  /**
   *@description Generic text with two placeholders separated by a comma
   *@example {1 613 680} PH1
   *@example {44 %} PH2
   */
  sS: '{PH1}, {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SoftContextMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SoftContextMenu {
  private items: SoftContextMenuDescriptor[];
  private itemSelectedCallback: (arg0: number) => void;
  private parentMenu: SoftContextMenu|undefined;
  private highlightedMenuItemElement: HTMLElement|null;
  detailsForElementMap: WeakMap<HTMLElement, ElementMenuDetails>;
  private document?: Document;
  private glassPane?: GlassPane;
  private contextMenuElement?: HTMLElement;
  private focusRestorer?: ElementFocusRestorer;
  private hideOnUserMouseDownUnlessInMenu?: ((event: Event) => void);
  private activeSubMenuElement?: HTMLElement;
  private subMenu?: SoftContextMenu;
  private onMenuClosed?: () => void;
  private focusOnTheFirstItem = true;
  private keepOpen: boolean;
  private loggableParent: Element|null;

  constructor(
      items: SoftContextMenuDescriptor[], itemSelectedCallback: (arg0: number) => void, keepOpen: boolean,
      parentMenu?: SoftContextMenu, onMenuClosed?: () => void, loggableParent?: Element|null) {
    this.items = items;
    this.itemSelectedCallback = itemSelectedCallback;
    this.parentMenu = parentMenu;
    this.highlightedMenuItemElement = null;

    this.detailsForElementMap = new WeakMap();
    this.onMenuClosed = onMenuClosed;
    this.keepOpen = keepOpen;
    this.loggableParent = loggableParent || null;
  }

  getItems(): SoftContextMenuDescriptor[] {
    return this.items;
  }

  show(document: Document, anchorBox: AnchorBox): void {
    if (!this.items.length) {
      return;
    }

    this.document = document;

    this.glassPane = new GlassPane();
    this.glassPane.setPointerEventsBehavior(
        this.parentMenu ? PointerEventsBehavior.PIERCE_GLASS_PANE : PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.glassPane.registerRequiredCSS(softContextMenuStyles);
    this.glassPane.setContentAnchorBox(anchorBox);
    this.glassPane.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    this.glassPane.setMarginBehavior(MarginBehavior.NO_MARGIN);
    this.glassPane.setAnchorBehavior(this.parentMenu ? AnchorBehavior.PREFER_RIGHT : AnchorBehavior.PREFER_BOTTOM);

    this.contextMenuElement = this.glassPane.contentElement.createChild('div', 'soft-context-menu');
    this.contextMenuElement.setAttribute('jslog', `${VisualLogging.menu().track({resize: true}).parent('mapped').track({
                                           keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space|Escape',
                                         })}`);
    if (this.loggableParent) {
      VisualLogging.setMappedParent(this.contextMenuElement, this.loggableParent);
    }
    this.contextMenuElement.tabIndex = -1;
    ARIAUtils.markAsMenu(this.contextMenuElement);
    this.contextMenuElement.addEventListener('mouseup', e => e.consume(), false);
    this.contextMenuElement.addEventListener('keydown', this.menuKeyDown.bind(this), false);

    const menuContainsCheckbox = this.items.find(item => item.type === 'checkbox') ? true : false;
    for (let i = 0; i < this.items.length; ++i) {
      this.contextMenuElement.appendChild(this.createMenuItem(this.items[i], menuContainsCheckbox));
    }

    this.glassPane.show(document);
    this.focusRestorer = new ElementFocusRestorer(this.contextMenuElement);

    if (!this.parentMenu) {
      this.hideOnUserMouseDownUnlessInMenu = (event: Event) => {
        // If a user clicks on any submenu, prevent the menu system from closing.
        let subMenu: (SoftContextMenu|undefined) = this.subMenu;
        while (subMenu) {
          if (subMenu.contextMenuElement === event.composedPath()[0]) {
            return;
          }
          subMenu = subMenu.subMenu;
        }

        this.discard();
        event.consume(true);
      };

      this.document.body.addEventListener('mousedown', this.hideOnUserMouseDownUnlessInMenu, false);

      // To reliably get resize events when 1) the browser window is resized,
      // 2) DevTools is undocked and resized and 3) DevTools is docked &
      // resized, we have to use ResizeObserver.
      const devToolsElem = InspectorView.maybeGetInspectorViewInstance()?.element;
      if (devToolsElem) {
        // The resize-observer will fire immediately upon starting observation.
        // So we have to ignore that first fire, and then the moment we get a
        // second, we know that it's been resized so we can act accordingly.
        let firedOnce = false;
        const observer = new ResizeObserver(() => {
          if (firedOnce) {
            observer.disconnect();
            this.discard();
            return;
          }
          firedOnce = true;
        });
        observer.observe(devToolsElem);
      }

      // focus on the first menu item
      if (this.contextMenuElement.children && this.focusOnTheFirstItem) {
        const focusElement = this.contextMenuElement.children[0] as HTMLElement;
        this.highlightMenuItem(focusElement, /* scheduleSubMenu */ false);
      }
    }
  }

  setContextMenuElementLabel(label: string): void {
    if (this.contextMenuElement) {
      ARIAUtils.setLabel(this.contextMenuElement, label);
    }
  }

  discard(): void {
    if (this.subMenu) {
      this.subMenu.discard();
    }
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.glassPane) {
      this.glassPane.hide();
      delete this.glassPane;
      if (this.hideOnUserMouseDownUnlessInMenu) {
        if (this.document) {
          this.document.body.removeEventListener('mousedown', this.hideOnUserMouseDownUnlessInMenu, false);
        }
        delete this.hideOnUserMouseDownUnlessInMenu;
      }
    }
    if (this.parentMenu) {
      delete this.parentMenu.subMenu;
      if (this.parentMenu.activeSubMenuElement) {
        ARIAUtils.setExpanded(this.parentMenu.activeSubMenuElement, false);
        delete this.parentMenu.activeSubMenuElement;
      }
    }
    this.onMenuClosed?.();
  }

  private createMenuItem(item: SoftContextMenuDescriptor, menuContainsCheckbox: boolean): HTMLElement {
    if (item.type === 'separator') {
      return this.createSeparator();
    }

    if (item.type === 'subMenu') {
      return this.createSubMenu(item, menuContainsCheckbox);
    }

    const menuItemElement = document.createElement('div');
    menuItemElement.classList.add('soft-context-menu-item');
    menuItemElement.tabIndex = -1;
    ARIAUtils.markAsMenuItem(menuItemElement);
    if (item.checked) {
      menuItemElement.setAttribute('checked', '');
    }
    if (item.id !== undefined) {
      menuItemElement.setAttribute('data-action-id', item.id.toString());
    }

    // If the menu contains a checkbox, add checkbox space in front of the label to align the items
    if (menuContainsCheckbox) {
      const checkMarkElement = IconButton.Icon.create('checkmark', 'checkmark');
      menuItemElement.appendChild(checkMarkElement);
    }
    if (item.tooltip) {
      Tooltip.install(menuItemElement, item.tooltip);
    }
    const detailsForElement: ElementMenuDetails = {
      actionId: undefined,
      isSeparator: undefined,
      customElement: undefined,
      subItems: undefined,
      subMenuTimer: undefined,
    };

    if (item.jslogContext && !item.element?.hasAttribute('jslog')) {
      if (item.type === 'checkbox') {
        menuItemElement.setAttribute(
            'jslog', `${VisualLogging.toggle().track({click: true}).context(item.jslogContext)}`);
      } else {
        menuItemElement.setAttribute(
            'jslog', `${VisualLogging.action().track({click: true}).context(item.jslogContext)}`);
      }
    }
    if (item.element && !item.label) {
      const wrapper = menuItemElement.createChild('div', 'soft-context-menu-custom-item');
      wrapper.appendChild(item.element);
      if (item.element?.classList.contains('location-menu')) {
        const label = item.element.ariaLabel || '';
        item.element.ariaLabel = '';
        ARIAUtils.setLabel(menuItemElement, label);
      }
      detailsForElement.customElement = (item.element as HTMLElement);
      this.detailsForElementMap.set(menuItemElement, detailsForElement);
      return menuItemElement;
    }

    if (!item.enabled) {
      menuItemElement.classList.add('soft-context-menu-disabled');
    }
    createTextChild(menuItemElement, item.label || '');
    if (item.element) {
      menuItemElement.appendChild(item.element);
    }
    menuItemElement.createChild('span', 'soft-context-menu-shortcut').textContent = item.shortcut || '';

    menuItemElement.addEventListener('mousedown', this.menuItemMouseDown.bind(this), false);
    menuItemElement.addEventListener('mouseup', this.menuItemMouseUp.bind(this), false);

    // Manually manage hover highlight since :hover does not work in case of click-and-hold menu invocation.
    menuItemElement.addEventListener('mouseover', this.menuItemMouseOver.bind(this), false);
    menuItemElement.addEventListener('mouseleave', (this.menuItemMouseLeave.bind(this) as EventListener), false);

    detailsForElement.actionId = item.id;

    let accessibleName: Platform.UIString.LocalizedString|string = item.label || '';

    if (item.type === 'checkbox') {
      const checkedState = item.checked ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
      if (item.shortcut) {
        accessibleName = i18nString(UIStrings.sSS, {PH1: String(item.label), PH2: item.shortcut, PH3: checkedState});
      } else {
        accessibleName = i18nString(UIStrings.sS, {PH1: String(item.label), PH2: checkedState});
      }
    } else if (item.shortcut) {
      accessibleName = i18nString(UIStrings.sS, {PH1: String(item.label), PH2: item.shortcut});
    }
    ARIAUtils.setLabel(menuItemElement, accessibleName);

    this.detailsForElementMap.set(menuItemElement, detailsForElement);

    return menuItemElement;
  }

  private createSubMenu(item: SoftContextMenuDescriptor, menuContainsCheckbox: boolean): HTMLElement {
    const menuItemElement = document.createElement('div');
    menuItemElement.classList.add('soft-context-menu-item');
    menuItemElement.tabIndex = -1;
    ARIAUtils.markAsMenuItemSubMenu(menuItemElement);
    this.detailsForElementMap.set(menuItemElement, {
      subItems: item.subItems,
      actionId: undefined,
      isSeparator: undefined,
      customElement: undefined,
      subMenuTimer: undefined,
    });

    // If the menu contains a checkbox, add checkbox space in front of the label to align the items
    if (menuContainsCheckbox) {
      const checkMarkElement = IconButton.Icon.create('checkmark', 'checkmark soft-context-menu-item-checkmark');
      menuItemElement.appendChild(checkMarkElement);
    }

    createTextChild(menuItemElement, item.label || '');
    ARIAUtils.setExpanded(menuItemElement, false);

    const subMenuArrowElement = IconButton.Icon.create('keyboard-arrow-right', 'soft-context-menu-item-submenu-arrow');
    menuItemElement.appendChild(subMenuArrowElement);

    menuItemElement.addEventListener('mousedown', this.menuItemMouseDown.bind(this), false);
    menuItemElement.addEventListener('mouseup', this.menuItemMouseUp.bind(this), false);

    // Manually manage hover highlight since :hover does not work in case of click-and-hold menu invocation.
    menuItemElement.addEventListener('mouseover', this.menuItemMouseOver.bind(this), false);
    menuItemElement.addEventListener('mouseleave', (this.menuItemMouseLeave.bind(this) as EventListener), false);

    if (item.jslogContext) {
      menuItemElement.setAttribute('jslog', `${VisualLogging.item().context(item.jslogContext)}`);
    }
    return menuItemElement;
  }

  private createSeparator(): HTMLElement {
    const separatorElement = document.createElement('div');
    separatorElement.classList.add('soft-context-menu-separator');
    this.detailsForElementMap.set(separatorElement, {
      subItems: undefined,
      actionId: undefined,
      isSeparator: true,
      customElement: undefined,
      subMenuTimer: undefined,
    });
    separatorElement.createChild('div', 'separator-line');
    return separatorElement;
  }

  private menuItemMouseDown(event: Event): void {
    // Do not let separator's mouse down hit menu's handler - we need to receive mouse up!
    event.consume(true);
  }

  private menuItemMouseUp(event: Event): void {
    this.triggerAction((event.target as HTMLElement), event);
    void VisualLogging.logClick(event.target as HTMLElement, event);
    event.consume();
  }

  private root(): SoftContextMenu {
    let root: SoftContextMenu = (this as SoftContextMenu);
    while (root.parentMenu) {
      root = root.parentMenu;
    }
    return root;
  }

  setChecked(item: SoftContextMenuDescriptor, checked: boolean): void {
    item.checked = checked;
    const element = this.contextMenuElement?.querySelector(`[data-action-id="${item.id}"]`);
    if (!element) {
      return;
    }
    if (checked) {
      element.setAttribute('checked', '');
    } else {
      element.removeAttribute('checked');
    }

    const checkedState = item.checked ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
    const accessibleName = item.shortcut ?
        i18nString(UIStrings.sSS, {PH1: String(item.label), PH2: item.shortcut, PH3: checkedState}) :
        i18nString(UIStrings.sS, {PH1: String(item.label), PH2: checkedState});
    ARIAUtils.setLabel(element, accessibleName);
  }

  private triggerAction(menuItemElement: HTMLElement, event: Event): void {
    const detailsForElement = this.detailsForElementMap.get(menuItemElement);
    if (!detailsForElement || detailsForElement.subItems) {
      this.showSubMenu(menuItemElement);
      event.consume();
      return;
    }
    if (this.keepOpen) {
      event.consume(true);
      const item = this.items.find(item => item.id === detailsForElement.actionId);
      if (item?.id !== undefined) {
        this.setChecked(item, !item.checked);
        this.itemSelectedCallback(item.id);
      }
      return;
    }
    this.root().discard();
    event.consume(true);
    if (typeof detailsForElement.actionId !== 'undefined') {
      this.itemSelectedCallback(detailsForElement.actionId);
      delete detailsForElement.actionId;
    }
    return;
  }

  private showSubMenu(menuItemElement: HTMLElement): void {
    const detailsForElement = this.detailsForElementMap.get(menuItemElement);
    if (!detailsForElement) {
      return;
    }
    if (detailsForElement.subMenuTimer) {
      window.clearTimeout(detailsForElement.subMenuTimer);
      delete detailsForElement.subMenuTimer;
    }
    if (this.subMenu || !this.document) {
      return;
    }

    this.activeSubMenuElement = menuItemElement;
    ARIAUtils.setExpanded(menuItemElement, true);
    if (!detailsForElement.subItems) {
      return;
    }
    this.subMenu = new SoftContextMenu(detailsForElement.subItems, this.itemSelectedCallback, false, this);
    const anchorBox = menuItemElement.boxInWindow();
    // Adjust for padding.
    anchorBox.y -= 9;
    anchorBox.x += 3;
    anchorBox.width -= 6;
    anchorBox.height += 18;
    this.subMenu.show(this.document, anchorBox);
  }

  private menuItemMouseOver(event: Event): void {
    this.highlightMenuItem((event.target as HTMLElement), true);
  }

  private menuItemMouseLeave(event: MouseEvent): void {
    if (!this.subMenu || !event.relatedTarget) {
      this.highlightMenuItem(null, true);
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget === this.contextMenuElement) {
      this.highlightMenuItem(null, true);
    }
  }

  private highlightMenuItem(menuItemElement: HTMLElement|null, scheduleSubMenu: boolean): void {
    if (this.highlightedMenuItemElement === menuItemElement) {
      return;
    }
    if (this.subMenu) {
      this.subMenu.discard();
    }
    if (this.highlightedMenuItemElement) {
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      this.highlightedMenuItemElement.classList.remove('force-white-icons');
      this.highlightedMenuItemElement.classList.remove('soft-context-menu-item-mouse-over');
      if (detailsForElement && detailsForElement.subItems && detailsForElement.subMenuTimer) {
        window.clearTimeout(detailsForElement.subMenuTimer);
        delete detailsForElement.subMenuTimer;
      }
    }

    this.highlightedMenuItemElement = menuItemElement;
    if (this.highlightedMenuItemElement) {
      this.highlightedMenuItemElement.classList.add('force-white-icons');
      this.highlightedMenuItemElement.classList.add('soft-context-menu-item-mouse-over');
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      if (detailsForElement && detailsForElement.customElement &&
          !detailsForElement.customElement.classList.contains('location-menu')) {
        detailsForElement.customElement.focus();
      } else {
        this.highlightedMenuItemElement.focus();
      }
      if (scheduleSubMenu && detailsForElement && detailsForElement.subItems && !detailsForElement.subMenuTimer) {
        detailsForElement.subMenuTimer =
            window.setTimeout(this.showSubMenu.bind(this, this.highlightedMenuItemElement), 150);
      }
    }

    if (this.contextMenuElement) {
      ARIAUtils.setActiveDescendant(this.contextMenuElement, menuItemElement);
    }
  }

  private highlightPrevious(): void {
    let menuItemElement: (ChildNode|null) = this.highlightedMenuItemElement ?
        this.highlightedMenuItemElement.previousSibling :
        this.contextMenuElement ? this.contextMenuElement.lastChild :
                                  null;
    let menuItemDetails: (ElementMenuDetails|undefined) =
        menuItemElement ? this.detailsForElementMap.get((menuItemElement as HTMLElement)) : undefined;
    while (menuItemElement && menuItemDetails &&
           (menuItemDetails.isSeparator ||
            (menuItemElement as HTMLElement).classList.contains('soft-context-menu-disabled'))) {
      menuItemElement = menuItemElement.previousSibling;
      menuItemDetails = menuItemElement ? this.detailsForElementMap.get((menuItemElement as HTMLElement)) : undefined;
    }
    if (menuItemElement) {
      this.highlightMenuItem((menuItemElement as HTMLElement), false);
    }
  }

  private highlightNext(): void {
    let menuItemElement: (ChildNode|null) = this.highlightedMenuItemElement ?
        this.highlightedMenuItemElement.nextSibling :
        this.contextMenuElement ? this.contextMenuElement.firstChild :
                                  null;
    let menuItemDetails: (ElementMenuDetails|undefined) =
        menuItemElement ? this.detailsForElementMap.get((menuItemElement as HTMLElement)) : undefined;
    while (menuItemElement &&
           (menuItemDetails && menuItemDetails.isSeparator ||
            (menuItemElement as HTMLElement).classList.contains('soft-context-menu-disabled'))) {
      menuItemElement = menuItemElement.nextSibling;
      menuItemDetails = menuItemElement ? this.detailsForElementMap.get((menuItemElement as HTMLElement)) : undefined;
    }
    if (menuItemElement) {
      this.highlightMenuItem((menuItemElement as HTMLElement), false);
    }
  }

  private menuKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    function onEnterOrSpace(this: SoftContextMenu): void {
      if (!this.highlightedMenuItemElement) {
        return;
      }
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      if (!detailsForElement || detailsForElement.customElement) {
        // The custom element will handle the event, so return early and do not consume it.
        return;
      }
      VisualLogging.logClick(this.highlightedMenuItemElement, keyboardEvent);
      this.triggerAction(this.highlightedMenuItemElement, keyboardEvent);
      if (detailsForElement.subItems && this.subMenu) {
        this.subMenu.highlightNext();
      }
      keyboardEvent.consume(true);
    }

    switch (keyboardEvent.key) {
      case 'ArrowUp':
        this.highlightPrevious();
        keyboardEvent.consume(true);
        break;
      case 'ArrowDown':
        this.highlightNext();
        keyboardEvent.consume(true);
        break;
      case 'ArrowLeft':
        if (this.parentMenu) {
          this.highlightMenuItem(null, false);
          this.discard();
        }
        keyboardEvent.consume(true);
        break;
      case 'ArrowRight': {
        if (!this.highlightedMenuItemElement) {
          break;
        }
        const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
        if (detailsForElement && detailsForElement.subItems) {
          this.showSubMenu(this.highlightedMenuItemElement);
          if (this.subMenu) {
            this.subMenu.highlightNext();
          }
        }
        if (detailsForElement?.customElement?.classList.contains('location-menu')) {
          detailsForElement.customElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
          this.highlightMenuItem(null, true);
        }
        keyboardEvent.consume(true);
        break;
      }
      case 'Escape':
        this.discard();
        keyboardEvent.consume(true);
        break;
      /**
       * Important: we don't consume the event by default for `Enter` or `Space`
       * key events, as if there's a custom sub menu we pass the event onto
       * that.
       */
      case 'Enter':
        if (!(keyboardEvent.key === 'Enter')) {
          return;
        }
        onEnterOrSpace.call(this);
        break;
      case ' ':
        onEnterOrSpace.call(this);
        break;
      default:
        keyboardEvent.consume(true);
    }
  }

  markAsMenuItemCheckBox(): void {
    if (!this.contextMenuElement) {
      return;
    }
    for (const child of this.contextMenuElement.children) {
      if (child.className !== 'soft-context-menu-separator') {
        ARIAUtils.markAsMenuItemCheckBox(child);
      }
    }
  }

  setFocusOnTheFirstItem(focusOnTheFirstItem: boolean): void {
    this.focusOnTheFirstItem = focusOnTheFirstItem;
  }
}
export interface SoftContextMenuDescriptor {
  type: 'checkbox'|'item'|'separator'|'subMenu';
  id?: number;
  label?: string;
  enabled?: boolean;
  checked?: boolean;
  subItems?: SoftContextMenuDescriptor[];
  element?: Element;
  shortcut?: string;
  tooltip?: Platform.UIString.LocalizedString;
  jslogContext?: string;
}
interface ElementMenuDetails {
  customElement?: HTMLElement;
  isSeparator?: boolean;
  subMenuTimer?: number;
  subItems?: SoftContextMenuDescriptor[];
  actionId?: number;
}
