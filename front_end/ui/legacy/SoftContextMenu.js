// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { GlassPane } from './GlassPane.js';
import { InspectorView } from './InspectorView.js';
import softContextMenuStyles from './softContextMenu.css.js';
import { Tooltip } from './Tooltip.js';
import { createTextChild, ElementFocusRestorer } from './UIUtils.js';
const UIStrings = {
    /**
     * @description Text exposed to screen readers on checked items.
     */
    checked: 'checked',
    /**
     * @description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
     */
    unchecked: 'unchecked',
    /**
     * @description Accessibility label for checkable SoftContextMenuItems with shortcuts
     * @example {Open File} PH1
     * @example {Ctrl + P} PH2
     * @example {checked} PH3
     */
    sSS: '{PH1}, {PH2}, {PH3}',
    /**
     * @description Generic text with two placeholders separated by a comma
     * @example {1 613 680} PH1
     * @example {44 %} PH2
     */
    sS: '{PH1}, {PH2}',
    /**
     * @description Accessible text exposed to screen readers appended to menu items that have a new badge.
     */
    newFeature: 'This is a new feature',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SoftContextMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SoftContextMenu {
    items;
    itemSelectedCallback;
    parentMenu;
    highlightedMenuItemElement;
    detailsForElementMap;
    document;
    glassPane;
    contextMenuElement;
    focusRestorer;
    hideOnUserMouseDownUnlessInMenu;
    activeSubMenuElement;
    subMenu;
    onMenuClosed;
    focusOnTheFirstItem = true;
    keepOpen;
    loggableParent;
    constructor(items, itemSelectedCallback, keepOpen, parentMenu, onMenuClosed, loggableParent) {
        this.items = items;
        this.itemSelectedCallback = itemSelectedCallback;
        this.parentMenu = parentMenu;
        this.highlightedMenuItemElement = null;
        this.detailsForElementMap = new WeakMap();
        this.onMenuClosed = onMenuClosed;
        this.keepOpen = keepOpen;
        this.loggableParent = loggableParent || null;
    }
    getItems() {
        return this.items;
    }
    show(document, anchorBox) {
        if (!this.items.length) {
            return;
        }
        this.document = document;
        this.glassPane = new GlassPane();
        this.glassPane.setPointerEventsBehavior(this.parentMenu ? "PierceGlassPane" /* PointerEventsBehavior.PIERCE_GLASS_PANE */ : "BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
        this.glassPane.registerRequiredCSS(softContextMenuStyles);
        this.glassPane.setContentAnchorBox(anchorBox);
        this.glassPane.setSizeBehavior("MeasureContent" /* SizeBehavior.MEASURE_CONTENT */);
        this.glassPane.setMarginBehavior("NoMargin" /* MarginBehavior.NO_MARGIN */);
        this.glassPane.setAnchorBehavior(this.parentMenu ? "PreferRight" /* AnchorBehavior.PREFER_RIGHT */ : "PreferBottom" /* AnchorBehavior.PREFER_BOTTOM */);
        this.contextMenuElement = this.glassPane.contentElement.createChild('div', 'soft-context-menu');
        this.contextMenuElement.setAttribute('jslog', `${VisualLogging.menu().track({ resize: true }).parent('mapped').track({
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
            this.hideOnUserMouseDownUnlessInMenu = (event) => {
                // If a user clicks on any submenu, prevent the menu system from closing.
                let subMenu = this.subMenu;
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
                const focusElement = this.contextMenuElement.children[0];
                this.highlightMenuItem(focusElement, /* scheduleSubMenu */ false);
            }
        }
    }
    setContextMenuElementLabel(label) {
        if (this.contextMenuElement) {
            ARIAUtils.setLabel(this.contextMenuElement, label);
        }
    }
    discard() {
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
    createMenuItem(item, menuContainsCheckbox) {
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
        const detailsForElement = {
            actionId: undefined,
            isSeparator: undefined,
            customElement: undefined,
            subItems: undefined,
            subMenuTimer: undefined,
        };
        // Only add a jslog context if the item has a label. Menu items without a
        // label are containers for custom elements, which are responsible for adding
        // their own `jslog` attributes.
        if (item.jslogContext && item.label) {
            if (item.type === 'checkbox') {
                menuItemElement.setAttribute('jslog', `${VisualLogging.toggle().track({ click: true }).context(item.jslogContext)}`);
            }
            else {
                menuItemElement.setAttribute('jslog', `${VisualLogging.action().track({ click: true }).context(item.jslogContext)}`);
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
            detailsForElement.customElement = item.element;
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
        menuItemElement.addEventListener('mouseleave', this.menuItemMouseLeave.bind(this), false);
        detailsForElement.actionId = item.id;
        let accessibleName = item.label || '';
        if (item.type === 'checkbox') {
            const checkedState = item.checked ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
            if (item.shortcut) {
                accessibleName = i18nString(UIStrings.sSS, { PH1: String(item.label), PH2: item.shortcut, PH3: checkedState });
            }
            else {
                accessibleName = i18nString(UIStrings.sS, { PH1: String(item.label), PH2: checkedState });
            }
        }
        else if (item.shortcut) {
            accessibleName = i18nString(UIStrings.sS, { PH1: String(item.label), PH2: item.shortcut });
        }
        if (item.element?.className === 'new-badge') {
            accessibleName = i18nString(UIStrings.sS, { PH1: String(item.label), PH2: i18nString(UIStrings.newFeature) });
        }
        ARIAUtils.setLabel(menuItemElement, accessibleName);
        if (item.isExperimentalFeature) {
            const experimentIcon = IconButton.Icon.create('experiment');
            menuItemElement.appendChild(experimentIcon);
        }
        this.detailsForElementMap.set(menuItemElement, detailsForElement);
        return menuItemElement;
    }
    createSubMenu(item, menuContainsCheckbox) {
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
        menuItemElement.addEventListener('mouseleave', this.menuItemMouseLeave.bind(this), false);
        if (item.jslogContext) {
            menuItemElement.setAttribute('jslog', `${VisualLogging.item().context(item.jslogContext)}`);
        }
        return menuItemElement;
    }
    createSeparator() {
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
    menuItemMouseDown(event) {
        // Do not let separator's mouse down hit menu's handler - we need to receive mouse up!
        event.consume(true);
    }
    menuItemMouseUp(event) {
        this.triggerAction(event.target, event);
        void VisualLogging.logClick(event.target, event);
        event.consume();
    }
    root() {
        let root = this;
        while (root.parentMenu) {
            root = root.parentMenu;
        }
        return root;
    }
    setChecked(item, checked) {
        item.checked = checked;
        const element = this.contextMenuElement?.querySelector(`[data-action-id="${item.id}"]`);
        if (!element) {
            return;
        }
        if (checked) {
            element.setAttribute('checked', '');
        }
        else {
            element.removeAttribute('checked');
        }
        const checkedState = item.checked ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
        const accessibleName = item.shortcut ?
            i18nString(UIStrings.sSS, { PH1: String(item.label), PH2: item.shortcut, PH3: checkedState }) :
            i18nString(UIStrings.sS, { PH1: String(item.label), PH2: checkedState });
        ARIAUtils.setLabel(element, accessibleName);
    }
    triggerAction(menuItemElement, event) {
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
    showSubMenu(menuItemElement) {
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
    menuItemMouseOver(event) {
        this.highlightMenuItem(event.target, true);
    }
    menuItemMouseLeave(event) {
        if (!this.subMenu || !event.relatedTarget) {
            this.highlightMenuItem(null, true);
            return;
        }
        const relatedTarget = event.relatedTarget;
        if (relatedTarget === this.contextMenuElement) {
            this.highlightMenuItem(null, true);
        }
    }
    highlightMenuItem(menuItemElement, scheduleSubMenu) {
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
            if (detailsForElement?.subItems && detailsForElement.subMenuTimer) {
                window.clearTimeout(detailsForElement.subMenuTimer);
                delete detailsForElement.subMenuTimer;
            }
        }
        this.highlightedMenuItemElement = menuItemElement;
        if (this.highlightedMenuItemElement) {
            this.highlightedMenuItemElement.classList.add('force-white-icons');
            this.highlightedMenuItemElement.classList.add('soft-context-menu-item-mouse-over');
            const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
            if (detailsForElement?.customElement && !detailsForElement.customElement.classList.contains('location-menu')) {
                detailsForElement.customElement.focus();
            }
            else {
                this.highlightedMenuItemElement.focus();
            }
            if (scheduleSubMenu && detailsForElement?.subItems && !detailsForElement.subMenuTimer) {
                detailsForElement.subMenuTimer =
                    window.setTimeout(this.showSubMenu.bind(this, this.highlightedMenuItemElement), 150);
            }
        }
        if (this.contextMenuElement) {
            ARIAUtils.setActiveDescendant(this.contextMenuElement, menuItemElement);
        }
    }
    highlightPrevious() {
        let menuItemElement = this.highlightedMenuItemElement ?
            this.highlightedMenuItemElement.previousSibling :
            this.contextMenuElement ? this.contextMenuElement.lastChild :
                null;
        let menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : undefined;
        while (menuItemElement && menuItemDetails &&
            (menuItemDetails.isSeparator ||
                menuItemElement.classList.contains('soft-context-menu-disabled'))) {
            menuItemElement = menuItemElement.previousSibling;
            menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : undefined;
        }
        if (menuItemElement) {
            this.highlightMenuItem(menuItemElement, false);
        }
    }
    highlightNext() {
        let menuItemElement = this.highlightedMenuItemElement ?
            this.highlightedMenuItemElement.nextSibling :
            this.contextMenuElement ? this.contextMenuElement.firstChild :
                null;
        let menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : undefined;
        while (menuItemElement &&
            (menuItemDetails?.isSeparator ||
                menuItemElement.classList.contains('soft-context-menu-disabled'))) {
            menuItemElement = menuItemElement.nextSibling;
            menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : undefined;
        }
        if (menuItemElement) {
            this.highlightMenuItem(menuItemElement, false);
        }
    }
    menuKeyDown(keyboardEvent) {
        function onEnterOrSpace() {
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
                if (detailsForElement?.subItems) {
                    this.showSubMenu(this.highlightedMenuItemElement);
                    if (this.subMenu) {
                        this.subMenu.highlightNext();
                    }
                }
                if (detailsForElement?.customElement?.classList.contains('location-menu')) {
                    detailsForElement.customElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
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
    markAsMenuItemCheckBox() {
        if (!this.contextMenuElement) {
            return;
        }
        for (const child of this.contextMenuElement.children) {
            if (child.className !== 'soft-context-menu-separator') {
                ARIAUtils.markAsMenuItemCheckBox(child);
            }
        }
    }
    setFocusOnTheFirstItem(focusOnTheFirstItem) {
        this.focusOnTheFirstItem = focusOnTheFirstItem;
    }
}
//# sourceMappingURL=SoftContextMenu.js.map