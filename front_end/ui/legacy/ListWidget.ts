// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';

import * as ARIAUtils from './ARIAUtils.js';
import listWidgetStyles from './listWidget.css.legacy.js';
import {Toolbar, ToolbarButton} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {createInput, createTextButton, ElementFocusRestorer} from './UIUtils.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
   *@description Text on a button to start editing text
   */
  editString: 'Edit',
  /**
   *@description Label for an item to remove something
   */
  removeString: 'Remove',
  /**
   *@description Text to save something
   */
  saveString: 'Save',
  /**
   *@description Text to add something
   */
  addString: 'Add',
  /**
   *@description Text to cancel something
   */
  cancelString: 'Cancel',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/ListWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ListWidget<T> extends VBox {
  private delegate: Delegate<T>;
  private readonly list: HTMLElement;
  private lastSeparator: boolean;
  private focusRestorer: ElementFocusRestorer|null;
  private items: T[];
  private editable: boolean[];
  private elements: Element[];
  private editor: Editor<T>|null;
  private editItem: T|null;
  private editElement: Element|null;
  private emptyPlaceholder: Element|null;
  constructor(delegate: Delegate<T>, delegatesFocus: boolean|undefined = true) {
    super(true, delegatesFocus);
    this.registerRequiredCSS(listWidgetStyles);
    this.delegate = delegate;

    this.list = this.contentElement.createChild('div', 'list');

    this.lastSeparator = false;
    this.focusRestorer = null;
    this.items = [];
    this.editable = [];
    this.elements = [];
    this.editor = null;
    this.editItem = null;
    this.editElement = null;

    this.emptyPlaceholder = null;

    this.updatePlaceholder();
  }

  clear(): void {
    this.items = [];
    this.editable = [];
    this.elements = [];
    this.lastSeparator = false;
    this.list.removeChildren();
    this.updatePlaceholder();
    this.stopEditing();
  }

  appendItem(item: T, editable: boolean): void {
    if (this.lastSeparator && this.items.length) {
      const element = document.createElement('div');
      element.classList.add('list-separator');
      this.list.appendChild(element);
    }
    this.lastSeparator = false;

    this.items.push(item);
    this.editable.push(editable);

    const element = this.list.createChild('div', 'list-item');
    element.appendChild(this.delegate.renderItem(item, editable));
    if (editable) {
      element.classList.add('editable');
      element.tabIndex = 0;
      element.appendChild(this.createControls(item, element));
    }
    this.elements.push(element);
    this.updatePlaceholder();
  }

  appendSeparator(): void {
    this.lastSeparator = true;
  }

  removeItem(index: number): void {
    if (this.editItem === this.items[index]) {
      this.stopEditing();
    }

    const element = this.elements[index];

    const previous = element.previousElementSibling;
    const previousIsSeparator = previous && previous.classList.contains('list-separator');

    const next = element.nextElementSibling;
    const nextIsSeparator = next && next.classList.contains('list-separator');

    if (previousIsSeparator && (nextIsSeparator || !next)) {
      (previous as Element).remove();
    }
    if (nextIsSeparator && !previous) {
      (next as Element).remove();
    }
    element.remove();

    this.elements.splice(index, 1);
    this.items.splice(index, 1);
    this.editable.splice(index, 1);
    this.updatePlaceholder();
  }

  addNewItem(index: number, item: T): void {
    this.startEditing(item, null, this.elements[index] || null);
  }

  setEmptyPlaceholder(element: Element|null): void {
    this.emptyPlaceholder = element;
    this.updatePlaceholder();
  }

  private createControls(item: T, element: Element): Element {
    const controls = document.createElement('div');
    controls.classList.add('controls-container');
    controls.classList.add('fill');
    controls.createChild('div', 'controls-gradient');

    const buttons = controls.createChild('div', 'controls-buttons');

    const toolbar = new Toolbar('', buttons);

    const editButton = new ToolbarButton(i18nString(UIStrings.editString), 'largeicon-edit');
    editButton.addEventListener(ToolbarButton.Events.Click, onEditClicked.bind(this));
    toolbar.appendToolbarItem(editButton);

    const removeButton = new ToolbarButton(i18nString(UIStrings.removeString), 'largeicon-trash-bin');
    removeButton.addEventListener(ToolbarButton.Events.Click, onRemoveClicked.bind(this));
    toolbar.appendToolbarItem(removeButton);

    return controls;

    function onEditClicked(this: ListWidget<T>): void {
      const index = this.elements.indexOf(element);
      const insertionPoint = this.elements[index + 1] || null;
      this.startEditing(item, element, insertionPoint);
    }

    function onRemoveClicked(this: ListWidget<T>): void {
      const index = this.elements.indexOf(element);
      this.element.focus();
      this.delegate.removeItemRequested(this.items[index], index);
    }
  }

  wasShown(): void {
    super.wasShown();
    this.stopEditing();
  }

  private updatePlaceholder(): void {
    if (!this.emptyPlaceholder) {
      return;
    }

    if (!this.elements.length && !this.editor) {
      this.list.appendChild(this.emptyPlaceholder);
    } else {
      this.emptyPlaceholder.remove();
    }
  }

  private startEditing(item: T, element: Element|null, insertionPoint: Element|null): void {
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
    this.editor.beginEdit(
        item, index, element ? i18nString(UIStrings.saveString) : i18nString(UIStrings.addString),
        this.commitEditing.bind(this), this.stopEditing.bind(this));
  }

  private commitEditing(): void {
    const editItem = this.editItem;
    const isNew = !this.editElement;
    const editor = (this.editor as Editor<T>);
    this.stopEditing();
    if (editItem) {
      this.delegate.commitEdit(editItem, editor, isNew);
    }
  }

  private stopEditing(): void {
    this.list.classList.remove('list-editing');
    this.element.classList.remove('list-editing');
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.editElement) {
      this.editElement.classList.remove('hidden');
    }
    if (this.editor && this.editor.element.parentElement) {
      this.editor.element.remove();
    }

    this.editor = null;
    this.editItem = null;
    this.editElement = null;
    this.updatePlaceholder();
  }
}

export interface Delegate<T> {
  renderItem(item: T, editable: boolean): Element;
  removeItemRequested(item: T, index: number): void;
  beginEdit(item: T): Editor<T>;
  commitEdit(item: T, editor: Editor<T>, isNew: boolean): void;
}

export interface CustomEditorControl<T> extends HTMLElement {
  value: T;
  validate: () => ValidatorResult;
}

export type EditorControl<T = string> = (HTMLInputElement|HTMLSelectElement|CustomEditorControl<T>);

export class Editor<T> {
  element: HTMLDivElement;
  private readonly contentElementInternal: HTMLElement;
  private commitButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private errorMessageContainer: HTMLElement;
  private readonly controls: EditorControl[];
  private readonly controlByName: Map<string, EditorControl>;
  private readonly validators: ((arg0: T, arg1: number, arg2: EditorControl) => ValidatorResult)[];
  private commit: (() => void)|null;
  private cancel: (() => void)|null;
  private item: T|null;
  private index: number;

  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('editor-container');
    this.element.addEventListener(
        'keydown', onKeyDown.bind(null, Platform.KeyboardUtilities.isEscKey, this.cancelClicked.bind(this)), false);

    this.contentElementInternal = this.element.createChild('div', 'editor-content');
    this.contentElementInternal.addEventListener(
        'keydown', onKeyDown.bind(null, event => event.key === 'Enter', this.commitClicked.bind(this)), false);

    const buttonsRow = this.element.createChild('div', 'editor-buttons');
    this.commitButton = createTextButton('', this.commitClicked.bind(this), '', true /* primary */);
    buttonsRow.appendChild(this.commitButton);
    this.cancelButton =
        createTextButton(i18nString(UIStrings.cancelString), this.cancelClicked.bind(this), '', true /* primary */);
    buttonsRow.appendChild(this.cancelButton);

    this.errorMessageContainer = this.element.createChild('div', 'list-widget-input-validation-error');
    ARIAUtils.markAsAlert(this.errorMessageContainer);

    function onKeyDown(predicate: (arg0: KeyboardEvent) => boolean, callback: () => void, event: KeyboardEvent): void {
      if (predicate(event)) {
        event.consume(true);
        callback();
      }
    }

    this.controls = [];
    this.controlByName = new Map();
    this.validators = [];

    this.commit = null;
    this.cancel = null;
    this.item = null;
    this.index = -1;
  }

  contentElement(): Element {
    return this.contentElementInternal;
  }

  createInput(
      name: string, type: string, title: string,
      validator: (arg0: T, arg1: number, arg2: EditorControl) => ValidatorResult): HTMLInputElement {
    const input = (createInput('', type) as HTMLInputElement);
    input.placeholder = title;
    input.addEventListener('input', this.validateControls.bind(this, false), false);
    input.addEventListener('blur', this.validateControls.bind(this, false), false);
    ARIAUtils.setAccessibleName(input, title);
    this.controlByName.set(name, input);
    this.controls.push(input);
    this.validators.push(validator);
    return input;
  }

  createSelect(
      name: string, options: string[], validator: (arg0: T, arg1: number, arg2: EditorControl) => ValidatorResult,
      title?: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.classList.add('chrome-select');
    for (let index = 0; index < options.length; ++index) {
      const option = (select.createChild('option') as HTMLOptionElement);
      option.value = options[index];
      option.textContent = options[index];
    }
    if (title) {
      Tooltip.install(select, title);
      ARIAUtils.setAccessibleName(select, title);
    }
    select.addEventListener('input', this.validateControls.bind(this, false), false);
    select.addEventListener('blur', this.validateControls.bind(this, false), false);
    this.controlByName.set(name, select);
    this.controls.push(select);
    this.validators.push(validator);
    return select;
  }

  createCustomControl<S, U extends CustomEditorControl<S>>(
      name: string, ctor: {new(): U},
      validator: (arg0: T, arg1: number, arg2: EditorControl) => ValidatorResult): CustomEditorControl<S> {
    const control = new ctor();
    this.controlByName.set(name, control as unknown as CustomEditorControl<string>);
    this.controls.push(control as unknown as CustomEditorControl<string>);
    this.validators.push(validator);
    return control;
  }

  control(name: string): EditorControl {
    const control = this.controlByName.get(name);
    if (!control) {
      throw new Error(`Control with name ${name} does not exist, please verify.`);
    }
    return control;
  }

  private validateControls(forceValid: boolean): void {
    let allValid = true;
    this.errorMessageContainer.textContent = '';
    for (let index = 0; index < this.controls.length; ++index) {
      const input = this.controls[index];
      const {valid, errorMessage} = this.validators[index].call(null, (this.item as T), this.index, input);

      input.classList.toggle('error-input', !valid && !forceValid);
      if (valid || forceValid) {
        ARIAUtils.setInvalid(input, false);
      } else {
        ARIAUtils.setInvalid(input, true);
      }

      if (!forceValid && errorMessage && !this.errorMessageContainer.textContent) {
        this.errorMessageContainer.textContent = errorMessage;
      }

      allValid = allValid && valid;
    }
    this.commitButton.disabled = !allValid;
  }

  requestValidation(): void {
    this.validateControls(false);
  }

  beginEdit(item: T, index: number, commitButtonTitle: string, commit: () => void, cancel: () => void): void {
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

  private commitClicked(): void {
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

  private cancelClicked(): void {
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
export interface ValidatorResult {
  valid: boolean;
  errorMessage?: string;
}
