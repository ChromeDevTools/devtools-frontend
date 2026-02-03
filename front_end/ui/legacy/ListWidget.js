// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import './Toolbar.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import { html, render } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import listWidgetStyles from './listWidget.css.js';
import { Tooltip } from './Tooltip.js';
import { createInput, createTextButton, ElementFocusRestorer } from './UIUtils.js';
import { VBox } from './Widget.js';
const UIStrings = {
    /**
     * @description Text on a button to start editing text
     */
    editString: 'Edit',
    /**
     * @description Label for an item to remove something
     */
    removeString: 'Remove',
    /**
     * @description Text to save something
     */
    saveString: 'Save',
    /**
     * @description Text to add something
     */
    addString: 'Add',
    /**
     * @description Text to cancel something
     */
    cancelString: 'Cancel',
    /**
     * @description Text for screen reader to announce that an item has been saved.
     */
    changesSaved: 'Changes to item have been saved',
    /**
     * @description Text for screen reader to announce that an item has been removed.
     */
    removedItem: 'Item has been removed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/ListWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ListWidget extends VBox {
    delegate;
    list;
    lastSeparator;
    focusRestorer;
    #items;
    editable;
    elements;
    editor;
    editItem;
    editElement;
    emptyPlaceholder;
    isTable;
    constructor(delegate, delegatesFocus = true, isTable = false) {
        super({ useShadowDom: true, delegatesFocus });
        this.registerRequiredCSS(listWidgetStyles);
        this.delegate = delegate;
        this.list = this.contentElement.createChild('div', 'list');
        this.lastSeparator = false;
        this.focusRestorer = null;
        this.#items = [];
        this.editable = [];
        this.elements = [];
        this.editor = null;
        this.editItem = null;
        this.editElement = null;
        this.emptyPlaceholder = null;
        this.isTable = isTable;
        if (isTable) {
            this.list.role = 'table';
        }
        this.updatePlaceholder();
    }
    get items() {
        return this.#items;
    }
    clear() {
        this.#items = [];
        this.editable = [];
        this.elements = [];
        this.lastSeparator = false;
        this.list.removeChildren();
        this.updatePlaceholder();
        this.stopEditing();
    }
    updateItem(index, newItem, editable, focusable = true, controlLabels = {}) {
        if (index < 0 || index >= this.#items.length) {
            this.appendItem(newItem, editable, focusable, controlLabels);
            return;
        }
        this.#items[index] = newItem;
        this.editable[index] = editable;
        const element = this.elements[index];
        const [content, controls] = element.children;
        if (controls) {
            element.removeChild(controls);
        }
        this.delegate.updateItem?.(content, newItem, editable, index);
        element.classList.toggle('editable', editable);
        if (editable) {
            if (focusable) {
                element.tabIndex = 0;
            }
            element.appendChild(this.createControls(newItem, element, controlLabels));
        }
    }
    appendItem(item, editable, focusable = true, controlLabels = {}) {
        if (this.lastSeparator && this.#items.length) {
            const element = document.createElement('div');
            element.classList.add('list-separator');
            if (this.isTable) {
                element.role = 'rowgroup';
            }
            this.list.appendChild(element);
        }
        this.lastSeparator = false;
        this.#items.push(item);
        this.editable.push(editable);
        const element = this.list.createChild('div', 'list-item');
        if (this.isTable) {
            element.role = 'rowgroup';
        }
        const content = this.delegate.renderItem(item, editable, this.#items.length - 1);
        if (!content.hasAttribute('jslog')) {
            element.setAttribute('jslog', `${VisualLogging.item()}`);
        }
        element.appendChild(content);
        if (editable) {
            element.classList.add('editable');
            if (focusable) {
                element.tabIndex = 0;
            }
            element.appendChild(this.createControls(item, element, controlLabels));
        }
        this.elements.push(element);
        this.updatePlaceholder();
    }
    appendSeparator() {
        this.lastSeparator = true;
    }
    removeItem(index) {
        if (this.editItem === this.#items[index]) {
            this.stopEditing();
        }
        const element = this.elements[index];
        const previous = element.previousElementSibling;
        const previousIsSeparator = previous?.classList.contains('list-separator');
        const next = element.nextElementSibling;
        const nextIsSeparator = next?.classList.contains('list-separator');
        if (previousIsSeparator && (nextIsSeparator || !next)) {
            previous?.remove();
        }
        if (nextIsSeparator && !previous) {
            next?.remove();
        }
        element.remove();
        this.elements.splice(index, 1);
        this.#items.splice(index, 1);
        this.editable.splice(index, 1);
        this.updatePlaceholder();
    }
    addNewItem(index, item) {
        this.startEditing(item, null, this.elements[index] || null);
    }
    setEmptyPlaceholder(element) {
        this.emptyPlaceholder = element;
        this.updatePlaceholder();
    }
    createControls(item, element, controlLabels) {
        const controls = document.createElement('div');
        controls.classList.add('controls-container');
        controls.classList.add('fill');
        // clang-format off
        render(html `
      <div class="controls-gradient"></div>
      <div class="controls-buttons">
        <devtools-toolbar>
          <devtools-button class=toolbar-button
                           .iconName=${'edit'}
                           .jslogContext=${'edit-item'}
                           .title=${controlLabels?.edit ?? i18nString(UIStrings.editString)}
                           .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                           @click=${onEditClicked}></devtools-button>
          <devtools-button class=toolbar-button
                           .iconName=${'bin'}
                           .jslogContext=${'remove-item'}
                           .title=${controlLabels?.delete ?? i18nString(UIStrings.removeString)}
                           .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                           @click=${onRemoveClicked}></devtools-button>
        </devtools-toolbar>
      </div>`, controls, { host: this });
        // clang-format on
        return controls;
        function onEditClicked() {
            const index = this.elements.indexOf(element);
            const insertionPoint = this.elements[index + 1] || null;
            this.startEditing(item, element, insertionPoint);
        }
        function onRemoveClicked() {
            const index = this.elements.indexOf(element);
            this.element.focus();
            this.delegate.removeItemRequested(this.#items[index], index);
            ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.removedItem));
            if (this.elements.length >= 1) {
                // focus on the next item in the list, or the last item if we're removing the last item
                this.elements[Math.min(index, this.elements.length - 1)].focus();
            }
        }
    }
    wasShown() {
        super.wasShown();
        this.stopEditing();
    }
    updatePlaceholder() {
        if (!this.emptyPlaceholder) {
            return;
        }
        if (!this.elements.length && !this.editor) {
            this.list.appendChild(this.emptyPlaceholder);
        }
        else {
            this.emptyPlaceholder.remove();
        }
    }
    startEditing(item, element, insertionPoint) {
        if (element && this.editElement === element) {
            return;
        }
        this.stopEditing();
        this.focusRestorer = new ElementFocusRestorer(this.element);
        this.list.classList.add('list-editing');
        this.element.classList.add('list-editing');
        this.editItem = item;
        this.editElement = element;
        if (element) {
            element.classList.add('hidden');
        }
        const index = element ? this.elements.indexOf(element) : -1;
        this.editor = this.delegate.beginEdit(item);
        this.updatePlaceholder();
        this.list.insertBefore(this.editor.element, insertionPoint);
        this.editor.beginEdit(item, index, element ? i18nString(UIStrings.saveString) : i18nString(UIStrings.addString), this.commitEditing.bind(this), this.stopEditing.bind(this));
    }
    commitEditing() {
        const editItem = this.editItem;
        const isNew = !this.editElement;
        const editor = this.editor;
        // Focus on the current item or the new item after committing
        const focusElementIndex = this.editElement ? this.elements.indexOf(this.editElement) : this.elements.length - 1;
        this.stopEditing();
        if (editItem !== null) {
            this.delegate.commitEdit(editItem, editor, isNew);
            ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.changesSaved));
            if (this.elements[focusElementIndex]) {
                this.elements[focusElementIndex].focus();
            }
        }
    }
    stopEditing() {
        this.list.classList.remove('list-editing');
        this.element.classList.remove('list-editing');
        if (this.focusRestorer) {
            this.focusRestorer.restore();
        }
        if (this.editElement) {
            this.editElement.classList.remove('hidden');
        }
        if (this.editor?.element.parentElement) {
            this.editor.element.remove();
        }
        this.editor = null;
        this.editItem = null;
        this.editElement = null;
        this.updatePlaceholder();
    }
}
export class Editor {
    element;
    #contentElement;
    commitButton;
    cancelButton;
    errorMessageContainer;
    controls = [];
    controlByName = new Map();
    validators = [];
    commit = null;
    cancel = null;
    item = null;
    index = -1;
    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('editor-container');
        this.element.setAttribute('jslog', `${VisualLogging.pane('editor').track({ resize: true })}`);
        this.element.addEventListener('keydown', onKeyDown.bind(null, Platform.KeyboardUtilities.isEscKey, this.cancelClicked.bind(this)), false);
        this.#contentElement = this.element.createChild('div', 'editor-content');
        this.#contentElement.addEventListener('keydown', onKeyDown.bind(null, event => {
            if (event.key !== 'Enter') {
                return false;
            }
            if (event.target instanceof HTMLSelectElement) {
                // 'Enter' on <select> is supposed to open the drop down, so don't swallow that here.
                return false;
            }
            return true;
        }, this.commitClicked.bind(this)), false);
        const buttonsRow = this.element.createChild('div', 'editor-buttons');
        this.cancelButton = createTextButton(i18nString(UIStrings.cancelString), this.cancelClicked.bind(this), {
            jslogContext: 'cancel',
            variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        });
        this.cancelButton.setAttribute('jslog', `${VisualLogging.action('cancel').track({ click: true })}`);
        buttonsRow.appendChild(this.cancelButton);
        this.commitButton = createTextButton('', this.commitClicked.bind(this), {
            jslogContext: 'commit',
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
        });
        buttonsRow.appendChild(this.commitButton);
        this.errorMessageContainer = this.element.createChild('div', 'list-widget-input-validation-error');
        ARIAUtils.markAsAlert(this.errorMessageContainer);
        function onKeyDown(predicate, callback, event) {
            if (predicate(event)) {
                event.consume(true);
                callback();
            }
        }
    }
    contentElement() {
        return this.#contentElement;
    }
    createInput(name, type, title, validator) {
        const input = (createInput('', type));
        input.placeholder = title;
        input.addEventListener('input', this.validateControls.bind(this, false), false);
        input.setAttribute('jslog', `${VisualLogging.textField().track({ change: true, keydown: 'Enter' }).context(name)}`);
        ARIAUtils.setLabel(input, title);
        this.controlByName.set(name, input);
        this.controls.push(input);
        this.validators.push(validator);
        return input;
    }
    createSelect(name, options, validator, title) {
        const select = document.createElement('select');
        select.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context(name)}`);
        for (let index = 0; index < options.length; ++index) {
            const option = select.createChild('option');
            option.value = options[index];
            option.textContent = options[index];
            option.setAttribute('jslog', `${VisualLogging.item(Platform.StringUtilities.toKebabCase(options[index])).track({ click: true })}`);
        }
        if (title) {
            Tooltip.install(select, title);
            ARIAUtils.setLabel(select, title);
        }
        select.addEventListener('input', this.validateControls.bind(this, false), false);
        select.addEventListener('blur', this.validateControls.bind(this, false), false);
        this.controlByName.set(name, select);
        this.controls.push(select);
        this.validators.push(validator);
        return select;
    }
    createCustomControl(name, ctor, validator) {
        const control = new ctor();
        this.controlByName.set(name, control);
        this.controls.push(control);
        this.validators.push(validator);
        return control;
    }
    control(name) {
        const control = this.controlByName.get(name);
        if (!control) {
            throw new Error(`Control with name ${name} does not exist, please verify.`);
        }
        return control;
    }
    validateControls(forceValid) {
        let allValid = true;
        this.errorMessageContainer.textContent = '';
        for (let index = 0; index < this.controls.length; ++index) {
            const input = this.controls[index];
            const { valid, errorMessage } = this.validators[index].call(null, this.item, this.index, input);
            input.classList.toggle('error-input', !valid && !forceValid);
            if (valid || forceValid) {
                ARIAUtils.setInvalid(input, false);
            }
            else {
                ARIAUtils.setInvalid(input, true);
            }
            if (!forceValid && errorMessage) {
                if (this.errorMessageContainer.textContent) {
                    const br = document.createElement('br');
                    this.errorMessageContainer.append(br);
                }
                this.errorMessageContainer.append(errorMessage);
            }
            allValid = allValid && valid;
        }
        this.commitButton.disabled = !allValid;
    }
    requestValidation() {
        this.validateControls(false);
    }
    beginEdit(item, index, commitButtonTitle, commit, cancel) {
        this.commit = commit;
        this.cancel = cancel;
        this.item = item;
        this.index = index;
        this.commitButton.textContent = commitButtonTitle;
        this.element.scrollIntoViewIfNeeded(false);
        if (this.controls.length) {
            this.controls[0].focus();
        }
        this.validateControls(true);
    }
    commitClicked() {
        if (this.commitButton.disabled) {
            return;
        }
        const commit = this.commit;
        this.commit = null;
        this.cancel = null;
        this.item = null;
        this.index = -1;
        if (commit) {
            commit();
        }
    }
    cancelClicked() {
        const cancel = this.cancel;
        this.commit = null;
        this.cancel = null;
        this.item = null;
        this.index = -1;
        if (cancel) {
            cancel();
        }
    }
}
//# sourceMappingURL=ListWidget.js.map