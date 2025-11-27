// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import keybindsSettingsTabStyles from './keybindsSettingsTab.css.js';
import settingsScreenStyles from './settingsScreen.css.js';
const UIStrings = {
    /**
     * @description Text for keyboard shortcuts
     */
    shortcuts: 'Shortcuts',
    /**
     * @description Text appearing before a select control offering users their choice of keyboard shortcut presets.
     */
    matchShortcutsFromPreset: 'Shortcut preset',
    /**
     * @description Screen reader label for list of keyboard shortcuts in settings
     */
    keyboardShortcutsList: 'Keyboard shortcuts list',
    /**
     * @description Screen reader label for an icon denoting a shortcut that has been changed from its default
     */
    shortcutModified: 'Shortcut modified',
    /**
     * @description Screen reader label for an empty shortcut cell in custom shortcuts settings tab
     */
    noShortcutForAction: 'No shortcut for action',
    /**
     * @description Link text in the settings pane to add another shortcut for an action
     */
    addAShortcut: 'Add a shortcut',
    /**
     * @description Placeholder text in the settings pane when adding a new shortcut.
     * Explaining that key strokes are going to be recoded.
     */
    recordingKeys: 'Recoding keys',
    /**
     * @description Label for a button in the settings pane that confirms changes to a keyboard shortcut
     */
    confirmChanges: 'Confirm changes',
    /**
     * @description Label for a button in the settings pane that discards changes to the shortcut being edited
     */
    discardChanges: 'Discard changes',
    /**
     * @description Label for a button in the settings pane that removes a keyboard shortcut.
     */
    removeShortcut: 'Remove shortcut',
    /**
     * @description Label for a button in the settings pane that edits a keyboard shortcut
     */
    editShortcut: 'Edit shortcut',
    /**
     * @description Message shown in settings when the user inputs a modifier-only shortcut such as Ctrl+Shift.
     */
    shortcutsCannotContainOnly: 'Shortcuts cannot contain only modifier keys.',
    /**
     * @description Messages shown in shortcuts settings when the user inputs a shortcut that is already in use.
     * @example {Performance} PH1
     * @example {Start/stop recording} PH2
     */
    thisShortcutIsInUseByS: 'This shortcut is in use by {PH1}: {PH2}.',
    /**
     * @description Message shown in settings when to restore default shortcuts.
     */
    RestoreDefaultShortcuts: 'Restore default shortcuts',
    /**
     * @description Message shown in settings to show the full list of keyboard shortcuts.
     */
    FullListOfDevtoolsKeyboard: 'Full list of DevTools keyboard shortcuts and gestures',
    /**
     * @description Label for a button in the shortcut editor that resets all shortcuts for the current action.
     */
    ResetShortcutsForAction: 'Reset shortcuts for action',
    /**
     * @description Screen reader announcement for shortcut removed
     * @example {Start/stop recording} PH1
     */
    shortcutRemoved: '{PH1} Shortcut removed',
    /**
     * @description Screen reader announcement for shortcut restored to default
     */
    shortcutChangesRestored: 'Changes to shortcut restored to default',
    /**
     * @description Screen reader announcement for applied short cut changes
     */
    shortcutChangesApplied: 'Changes to shortcut applied',
    /**
     * @description Screen reader announcement for discarded short cut changes
     */
    shortcutChangesDiscarded: 'Changes to shortcut discarded',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/KeybindsSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class KeybindsSettingsTab extends UI.Widget.VBox {
    items;
    list;
    editingItem;
    editingRow;
    constructor() {
        super({
            jslog: `${VisualLogging.pane('keybinds')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(keybindsSettingsTabStyles, settingsScreenStyles);
        const settingsContent = this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
        settingsContent.classList.add('settings-card-container');
        const keybindsSetSetting = Common.Settings.Settings.instance().moduleSetting('active-keybind-set');
        const userShortcutsSetting = Common.Settings.Settings.instance().moduleSetting('user-shortcuts');
        keybindsSetSetting.addChangeListener(this.update, this);
        const keybindsSetSelect = SettingsUI.SettingsUI.createControlForSetting(keybindsSetSetting, i18nString(UIStrings.matchShortcutsFromPreset));
        const card = settingsContent.createChild('devtools-card');
        card.heading = i18nString(UIStrings.shortcuts);
        if (keybindsSetSelect) {
            keybindsSetSelect.classList.add('keybinds-set-select');
        }
        this.items = new UI.ListModel.ListModel();
        this.list = new UI.ListControl.ListControl(this.items, this, UI.ListControl.ListMode.NonViewport);
        this.list.element.classList.add('shortcut-list');
        this.items.replaceAll(this.createListItems());
        UI.ARIAUtils.markAsList(this.list.element);
        UI.ARIAUtils.setLabel(this.list.element, i18nString(UIStrings.keyboardShortcutsList));
        const footer = document.createElement('div');
        footer.classList.add('keybinds-footer');
        const docsLink = UI.XLink.XLink.create('https://developer.chrome.com/docs/devtools/shortcuts/', i18nString(UIStrings.FullListOfDevtoolsKeyboard), undefined, undefined, 'learn-more');
        docsLink.classList.add('docs-link');
        footer.appendChild(docsLink);
        const restoreDefaultShortcutsButton = UI.UIUtils.createTextButton(i18nString(UIStrings.RestoreDefaultShortcuts), () => {
            userShortcutsSetting.set([]);
            keybindsSetSetting.set(UI.ShortcutRegistry.DefaultShortcutSetting);
        }, { jslogContext: 'restore-default-shortcuts' });
        footer.appendChild(restoreDefaultShortcutsButton);
        this.editingItem = null;
        this.editingRow = null;
        if (keybindsSetSelect) {
            card.append(keybindsSetSelect);
        }
        card.append(this.list.element, footer);
        this.update();
    }
    createElementForItem(item) {
        const element = document.createElement('div');
        let itemContent;
        if (typeof item === 'string') {
            itemContent = element;
            itemContent.classList.add('keybinds-category-header');
            itemContent.textContent = UI.ActionRegistration.getLocalizedActionCategory(item);
            UI.ARIAUtils.setLevel(itemContent, 1);
        }
        else {
            const listItem = new ShortcutListItem(item, this, item === this.editingItem);
            itemContent = listItem.element;
            UI.ARIAUtils.setLevel(itemContent, 2);
            if (item === this.editingItem) {
                this.editingRow = listItem;
            }
            itemContent.classList.add('keybinds-list-item');
            element.classList.add('keybinds-list-item-wrapper');
            element.appendChild(itemContent);
        }
        UI.ARIAUtils.markAsListitem(itemContent);
        itemContent.tabIndex = item === this.list.selectedItem() && item !== this.editingItem ? 0 : -1;
        return element;
    }
    commitChanges(item, editedShortcuts) {
        for (const [originalShortcut, newDescriptors] of editedShortcuts) {
            if (originalShortcut.type !== "UnsetShortcut" /* UI.KeyboardShortcut.Type.UNSET_SHORTCUT */) {
                UI.ShortcutRegistry.ShortcutRegistry.instance().removeShortcut(originalShortcut);
                if (!newDescriptors) {
                    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutRemoved);
                }
            }
            if (newDescriptors) {
                UI.ShortcutRegistry.ShortcutRegistry.instance().registerUserShortcut(originalShortcut.changeKeys(newDescriptors).changeType("UserShortcut" /* UI.KeyboardShortcut.Type.USER_SHORTCUT */));
                if (originalShortcut.type === "UnsetShortcut" /* UI.KeyboardShortcut.Type.UNSET_SHORTCUT */) {
                    Host.userMetrics.actionTaken(Host.UserMetrics.Action.UserShortcutAdded);
                }
                else {
                    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutModified);
                }
            }
        }
        this.stopEditing(item);
    }
    /**
     * This method will never be called.
     */
    heightForItem(_item) {
        return 0;
    }
    isItemSelectable(_item) {
        return true;
    }
    selectedItemChanged(_from, to, fromElement, toElement) {
        if (fromElement) {
            fromElement.tabIndex = -1;
        }
        if (toElement) {
            if (to === this.editingItem && this.editingRow) {
                this.editingRow.focus();
            }
            else {
                toElement.tabIndex = 0;
                if (this.list.element.hasFocus()) {
                    toElement.focus();
                }
            }
            this.setDefaultFocusedElement(toElement);
        }
    }
    updateSelectedItemARIA(_fromElement, _toElement) {
        return true;
    }
    startEditing(action) {
        this.list.selectItem(action);
        if (this.editingItem) {
            this.stopEditing(this.editingItem);
        }
        UI.UIUtils.markBeingEdited(this.list.element, true);
        this.editingItem = action;
        this.list.refreshItem(action);
    }
    stopEditing(action) {
        UI.UIUtils.markBeingEdited(this.list.element, false);
        this.editingItem = null;
        this.editingRow = null;
        this.list.refreshItem(action);
        this.focus();
    }
    createListItems() {
        const actions = UI.ActionRegistry.ActionRegistry.instance()
            .actions()
            .filter(action => action.configurableBindings())
            .sort((actionA, actionB) => {
            if (actionA.category() < actionB.category()) {
                return -1;
            }
            if (actionA.category() > actionB.category()) {
                return 1;
            }
            if (actionA.id() < actionB.id()) {
                return -1;
            }
            if (actionA.id() > actionB.id()) {
                return 1;
            }
            return 0;
        });
        const items = [];
        let currentCategory;
        actions.forEach(action => {
            if (currentCategory !== action.category()) {
                items.push(action.category());
            }
            items.push(action);
            currentCategory = action.category();
        });
        return items;
    }
    onEscapeKeyPressed(event) {
        const deepActiveElement = UI.DOMUtilities.deepActiveElement(document);
        if (this.editingRow && deepActiveElement?.nodeName === 'INPUT') {
            this.editingRow.onEscapeKeyPressed(event);
        }
    }
    update() {
        if (this.editingItem) {
            this.stopEditing(this.editingItem);
        }
        this.list.refreshAllItems();
        if (!this.list.selectedItem()) {
            this.list.selectItem(this.items.at(0));
        }
    }
    willHide() {
        super.willHide();
        if (this.editingItem) {
            this.stopEditing(this.editingItem);
        }
    }
}
export class ShortcutListItem {
    isEditing;
    settingsTab;
    item;
    element;
    editedShortcuts;
    shortcutInputs;
    shortcuts;
    elementToFocus;
    confirmButton;
    addShortcutLinkContainer;
    errorMessageElement;
    secondKeyTimeout;
    constructor(item, settingsTab, isEditing) {
        this.isEditing = Boolean(isEditing);
        this.settingsTab = settingsTab;
        this.item = item;
        this.element = document.createElement('div');
        this.element.setAttribute('jslog', `${VisualLogging.item().context(item.id()).track({ keydown: 'Escape' })}`);
        this.editedShortcuts = new Map();
        this.shortcutInputs = new Map();
        this.shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(item.id());
        this.elementToFocus = null;
        this.confirmButton = null;
        this.addShortcutLinkContainer = null;
        this.errorMessageElement = null;
        this.secondKeyTimeout = null;
        this.update();
    }
    focus() {
        if (this.elementToFocus) {
            this.elementToFocus.focus();
        }
    }
    update() {
        this.element.removeChildren();
        this.elementToFocus = null;
        this.shortcutInputs.clear();
        this.element.classList.toggle('keybinds-editing', this.isEditing);
        this.element.createChild('div', 'keybinds-action-name keybinds-list-text').textContent = this.item.title();
        this.shortcuts.forEach(this.createShortcutRow, this);
        if (this.shortcuts.length === 0) {
            this.createEmptyInfo();
        }
        if (this.isEditing) {
            this.setupEditor();
        }
    }
    createEmptyInfo() {
        if (UI.ShortcutRegistry.ShortcutRegistry.instance().actionHasDefaultShortcut(this.item.id())) {
            const icon = IconButton.Icon.create('keyboard-pen', 'keybinds-modified');
            UI.ARIAUtils.setLabel(icon, i18nString(UIStrings.shortcutModified));
            this.element.appendChild(icon);
        }
        if (!this.isEditing) {
            const emptyElement = this.element.createChild('div', 'keybinds-shortcut keybinds-list-text');
            UI.ARIAUtils.setLabel(emptyElement, i18nString(UIStrings.noShortcutForAction));
            this.element.appendChild(this.createEditButton());
        }
    }
    setupEditor() {
        this.addShortcutLinkContainer = this.element.createChild('div', 'keybinds-shortcut');
        const addShortcutButton = UI.UIUtils.createTextButton(i18nString(UIStrings.addAShortcut), this.addShortcut.bind(this), { jslogContext: 'add-shortcut' });
        this.addShortcutLinkContainer.appendChild(addShortcutButton);
        if (!this.elementToFocus) {
            this.elementToFocus = addShortcutButton;
        }
        this.errorMessageElement = this.element.createChild('div', 'keybinds-info keybinds-error hidden');
        UI.ARIAUtils.markAsAlert(this.errorMessageElement);
        this.element.appendChild(this.createIconButton(i18nString(UIStrings.ResetShortcutsForAction), 'undo', '', 'undo', this.resetShortcutsToDefaults.bind(this)));
        this.confirmButton = this.createIconButton(i18nString(UIStrings.confirmChanges), 'checkmark', 'keybinds-confirm-button', 'confirm', () => {
            this.settingsTab.commitChanges(this.item, this.editedShortcuts);
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesApplied, { PH1: this.item.title() }));
        });
        this.element.appendChild(this.confirmButton);
        this.element.appendChild(this.createIconButton(i18nString(UIStrings.discardChanges), 'cross', 'keybinds-cancel-button', 'cancel', () => {
            this.settingsTab.stopEditing(this.item);
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesDiscarded));
        }));
        this.element.addEventListener('keydown', event => {
            if (Platform.KeyboardUtilities.isEscKey(event)) {
                this.settingsTab.stopEditing(this.item);
                event.consume(true);
            }
        });
    }
    addShortcut() {
        const shortcut = new UI.KeyboardShortcut.KeyboardShortcut([], this.item.id(), "UnsetShortcut" /* UI.KeyboardShortcut.Type.UNSET_SHORTCUT */);
        this.shortcuts.push(shortcut);
        this.update();
        const shortcutInput = this.shortcutInputs.get(shortcut);
        if (shortcutInput) {
            shortcutInput.focus();
        }
    }
    createShortcutRow(shortcut, index) {
        if (this.editedShortcuts.has(shortcut) && !this.editedShortcuts.get(shortcut)) {
            return;
        }
        let icon;
        if (shortcut.type !== "UnsetShortcut" /* UI.KeyboardShortcut.Type.UNSET_SHORTCUT */ && !shortcut.isDefault()) {
            icon = IconButton.Icon.create('keyboard-pen', 'keybinds-modified');
            UI.ARIAUtils.setLabel(icon, i18nString(UIStrings.shortcutModified));
            this.element.appendChild(icon);
        }
        const shortcutElement = this.element.createChild('div', 'keybinds-shortcut keybinds-list-text');
        if (this.isEditing) {
            const shortcutInput = shortcutElement.createChild('input', 'harmony-input');
            shortcutInput.setAttribute('jslog', `${VisualLogging.textField().track({ change: true })}`);
            shortcutInput.setAttribute('placeholder', i18nString(UIStrings.recordingKeys));
            shortcutInput.spellcheck = false;
            shortcutInput.maxLength = 0;
            this.shortcutInputs.set(shortcut, shortcutInput);
            if (!this.elementToFocus) {
                this.elementToFocus = shortcutInput;
            }
            shortcutInput.value = shortcut.title();
            const userDescriptors = this.editedShortcuts.get(shortcut);
            if (userDescriptors) {
                shortcutInput.value = this.shortcutInputTextForDescriptors(userDescriptors);
            }
            shortcutInput.addEventListener('keydown', this.onShortcutInputKeyDown.bind(this, shortcut, shortcutInput));
            shortcutInput.addEventListener('blur', () => {
                if (this.secondKeyTimeout !== null) {
                    clearTimeout(this.secondKeyTimeout);
                    this.secondKeyTimeout = null;
                }
            });
            shortcutElement.appendChild(this.createIconButton(i18nString(UIStrings.removeShortcut), 'bin', 'keybinds-delete-button', 'delete', () => {
                const index = this.shortcuts.indexOf(shortcut);
                if (!shortcut.isDefault()) {
                    this.shortcuts.splice(index, 1);
                }
                this.editedShortcuts.set(shortcut, null);
                this.update();
                this.focus();
                this.validateInputs();
                UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutRemoved, { PH1: this.item.title() }));
            }));
        }
        else {
            const separator = Host.Platform.isMac() ? '\u2004' : ' + ';
            const keys = shortcut.descriptors.flatMap(descriptor => descriptor.name.split(separator));
            keys.forEach(key => {
                shortcutElement.createChild('div', 'keybinds-key').createChild('span').textContent = key;
            });
            if (index === 0) {
                this.element.appendChild(this.createEditButton());
            }
        }
    }
    createEditButton() {
        return this.createIconButton(i18nString(UIStrings.editShortcut), 'edit', 'keybinds-edit-button', 'edit', () => this.settingsTab.startEditing(this.item));
    }
    createIconButton(label, iconName, className, jslogContext, listener) {
        const button = new Buttons.Button.Button();
        button.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName, jslogContext, title: label };
        button.addEventListener('click', listener);
        UI.ARIAUtils.setLabel(button, label);
        if (className) {
            button.classList.add(className);
        }
        return button;
    }
    onShortcutInputKeyDown(shortcut, shortcutInput, event) {
        if (event.key !== 'Tab') {
            const eventDescriptor = this.descriptorForEvent(event);
            const userDescriptors = this.editedShortcuts.get(shortcut) || [];
            this.editedShortcuts.set(shortcut, userDescriptors);
            const isLastKeyOfShortcut = userDescriptors.length === 2 && UI.KeyboardShortcut.KeyboardShortcut.isModifier(userDescriptors[1].key);
            const shouldClearOldShortcut = userDescriptors.length === 2 && !isLastKeyOfShortcut;
            if (shouldClearOldShortcut) {
                userDescriptors.splice(0, 2);
            }
            if (this.secondKeyTimeout) {
                clearTimeout(this.secondKeyTimeout);
                this.secondKeyTimeout = null;
                userDescriptors.push(eventDescriptor);
            }
            else if (isLastKeyOfShortcut) {
                userDescriptors[1] = eventDescriptor;
            }
            else if (!UI.KeyboardShortcut.KeyboardShortcut.isModifier(eventDescriptor.key)) {
                userDescriptors[0] = eventDescriptor;
                this.secondKeyTimeout = window.setTimeout(() => {
                    this.secondKeyTimeout = null;
                }, UI.ShortcutRegistry.KeyTimeout);
            }
            else {
                userDescriptors[0] = eventDescriptor;
            }
            shortcutInput.value = this.shortcutInputTextForDescriptors(userDescriptors);
            this.validateInputs();
            event.consume(true);
        }
    }
    descriptorForEvent(event) {
        const userKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(event);
        const codeAndModifiers = UI.KeyboardShortcut.KeyboardShortcut.keyCodeAndModifiersFromKey(userKey);
        let key = UI.KeyboardShortcut.Keys[event.key] || UI.KeyboardShortcut.KeyBindings[event.key];
        if (!key && !/^[a-z]$/i.test(event.key)) {
            const keyCode = event.code;
            // if we still don't have a key name, let's try the code before falling back to the raw key
            key = UI.KeyboardShortcut.Keys[keyCode] || UI.KeyboardShortcut.KeyBindings[keyCode];
            if (keyCode.startsWith('Digit')) {
                key = keyCode.slice(5);
            }
            else if (keyCode.startsWith('Key')) {
                key = keyCode.slice(3);
            }
        }
        return UI.KeyboardShortcut.KeyboardShortcut.makeDescriptor(key || event.key, codeAndModifiers.modifiers);
    }
    shortcutInputTextForDescriptors(descriptors) {
        return descriptors.map(descriptor => descriptor.name).join(' ');
    }
    resetShortcutsToDefaults() {
        this.editedShortcuts.clear();
        for (const shortcut of this.shortcuts) {
            if (shortcut.type === "UnsetShortcut" /* UI.KeyboardShortcut.Type.UNSET_SHORTCUT */) {
                const index = this.shortcuts.indexOf(shortcut);
                this.shortcuts.splice(index, 1);
            }
            else if (shortcut.type === "UserShortcut" /* UI.KeyboardShortcut.Type.USER_SHORTCUT */) {
                this.editedShortcuts.set(shortcut, null);
            }
        }
        const disabledDefaults = UI.ShortcutRegistry.ShortcutRegistry.instance().disabledDefaultsForAction(this.item.id());
        disabledDefaults.forEach(shortcut => {
            if (this.shortcuts.includes(shortcut)) {
                return;
            }
            this.shortcuts.push(shortcut);
            this.editedShortcuts.set(shortcut, shortcut.descriptors);
        });
        this.update();
        this.focus();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.shortcutChangesRestored, { PH1: this.item.title() }));
    }
    onEscapeKeyPressed(event) {
        const activeElement = UI.DOMUtilities.deepActiveElement(document);
        for (const [shortcut, shortcutInput] of this.shortcutInputs.entries()) {
            if (activeElement === shortcutInput) {
                this.onShortcutInputKeyDown(shortcut, shortcutInput, event);
            }
        }
    }
    validateInputs() {
        const confirmButton = this.confirmButton;
        const errorMessageElement = this.errorMessageElement;
        if (!confirmButton || !errorMessageElement) {
            return;
        }
        confirmButton.disabled = false;
        errorMessageElement.classList.add('hidden');
        this.shortcutInputs.forEach((shortcutInput, shortcut) => {
            const userDescriptors = this.editedShortcuts.get(shortcut);
            if (!userDescriptors) {
                return;
            }
            if (userDescriptors.some(descriptor => UI.KeyboardShortcut.KeyboardShortcut.isModifier(descriptor.key))) {
                confirmButton.disabled = true;
                shortcutInput.classList.add('error-input');
                UI.ARIAUtils.setInvalid(shortcutInput, true);
                errorMessageElement.classList.remove('hidden');
                errorMessageElement.textContent = i18nString(UIStrings.shortcutsCannotContainOnly);
                return;
            }
            const conflicts = UI.ShortcutRegistry.ShortcutRegistry.instance()
                .actionsForDescriptors(userDescriptors)
                .filter(actionId => actionId !== this.item.id());
            if (conflicts.length) {
                confirmButton.disabled = true;
                shortcutInput.classList.add('error-input');
                UI.ARIAUtils.setInvalid(shortcutInput, true);
                errorMessageElement.classList.remove('hidden');
                if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(conflicts[0])) {
                    return;
                }
                const action = UI.ActionRegistry.ActionRegistry.instance().getAction(conflicts[0]);
                const actionTitle = action.title();
                const actionCategory = action.category();
                errorMessageElement.textContent =
                    i18nString(UIStrings.thisShortcutIsInUseByS, { PH1: actionCategory, PH2: actionTitle });
                return;
            }
            shortcutInput.classList.remove('error-input');
            UI.ARIAUtils.setInvalid(shortcutInput, false);
        });
    }
}
//# sourceMappingURL=KeybindsSettingsTab.js.map