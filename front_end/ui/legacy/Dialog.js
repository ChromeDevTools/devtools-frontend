// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import dialogStyles from './dialog.css.js';
import { GlassPane } from './GlassPane.js';
import { InspectorView } from './InspectorView.js';
import { KeyboardShortcut, Keys } from './KeyboardShortcut.js';
import { WidgetFocusRestorer } from './Widget.js';
export class Dialog extends Common.ObjectWrapper.eventMixin(GlassPane) {
    tabIndexBehavior = "DisableAllTabIndex" /* OutsideTabIndexBehavior.DISABLE_ALL_OUTSIDE_TAB_INDEX */;
    tabIndexMap = new Map();
    focusRestorer = null;
    closeOnEscape = true;
    targetDocument = null;
    targetDocumentKeyDownHandler;
    escapeKeyCallback = null;
    constructor(jslogContext) {
        super();
        this.registerRequiredCSS(dialogStyles);
        this.contentElement.tabIndex = 0;
        this.contentElement.addEventListener('focus', () => this.widget().focus(), false);
        if (jslogContext) {
            this.contentElement.setAttribute('jslog', `${VisualLogging.dialog(jslogContext).track({ resize: true, keydown: 'Escape' })}`);
        }
        this.setPointerEventsBehavior("BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
        this.setOutsideClickCallback(event => {
            // If there are stacked dialogs, we only want to
            // handle the outside click for the top most dialog.
            if (Dialog.getInstance() !== this) {
                return;
            }
            this.hide();
            event.consume(true);
        });
        ARIAUtils.markAsModalDialog(this.contentElement);
        this.targetDocumentKeyDownHandler = this.onKeyDown.bind(this);
    }
    static hasInstance() {
        return Dialog.dialogs.length > 0;
    }
    /**
     * If there is only one dialog, returns that.
     * If there are stacked dialogs, returns the topmost one.
     */
    static getInstance() {
        return Dialog.dialogs[Dialog.dialogs.length - 1] || null;
    }
    /**
     * `stack` parameter is needed for being able to open a dialog on top
     * of an existing dialog. The main reason is, Settings Tab is
     * implemented as a Dialog. So, if we want to open a dialog on the
     * Settings Tab, we need to stack it on top of that dialog.
     *
     * @param where Container element of the dialog.
     * @param stack Whether to open this dialog on top of an existing dialog.
     */
    show(where, stack) {
        const document = (where instanceof Document ? where : (where || InspectorView.instance().element).ownerDocument);
        this.targetDocument = document;
        this.targetDocument.addEventListener('keydown', this.targetDocumentKeyDownHandler, true);
        if (!stack && Dialog.dialogs.length) {
            Dialog.dialogs.forEach(dialog => dialog.hide());
        }
        Dialog.dialogs.push(this);
        this.disableTabIndexOnElements(document);
        super.show(document);
        this.focusRestorer = new WidgetFocusRestorer(this.widget());
    }
    hide() {
        if (this.focusRestorer) {
            this.focusRestorer.restore();
        }
        super.hide();
        if (this.targetDocument) {
            this.targetDocument.removeEventListener('keydown', this.targetDocumentKeyDownHandler, true);
        }
        this.restoreTabIndexOnElements();
        this.dispatchEventToListeners("hidden" /* Events.HIDDEN */);
        const index = Dialog.dialogs.indexOf(this);
        if (index !== -1) {
            Dialog.dialogs.splice(index, 1);
        }
    }
    setAriaLabel(label) {
        ARIAUtils.setLabel(this.contentElement, label);
    }
    setCloseOnEscape(close) {
        this.closeOnEscape = close;
    }
    setEscapeKeyCallback(callback) {
        this.escapeKeyCallback = callback;
    }
    addCloseButton() {
        const closeButton = this.contentElement.createChild('dt-close-button', 'dialog-close-button');
        closeButton.addEventListener('click', this.hide.bind(this), false);
    }
    setOutsideTabIndexBehavior(tabIndexBehavior) {
        this.tabIndexBehavior = tabIndexBehavior;
    }
    disableTabIndexOnElements(document) {
        if (this.tabIndexBehavior === "PreserveTabIndex" /* OutsideTabIndexBehavior.PRESERVE_TAB_INDEX */) {
            return;
        }
        let exclusionSet = null;
        if (this.tabIndexBehavior === "PreserveMainViewTabIndex" /* OutsideTabIndexBehavior.PRESERVE_MAIN_VIEW_TAB_INDEX */) {
            exclusionSet = this.getMainWidgetTabIndexElements(InspectorView.instance().ownerSplit());
        }
        this.tabIndexMap.clear();
        let node = document;
        for (; node; node = node.traverseNextNode(document)) {
            if (node instanceof HTMLElement) {
                const element = (node);
                const tabIndex = element.tabIndex;
                if (!exclusionSet?.has(element)) {
                    if (tabIndex >= 0) {
                        this.tabIndexMap.set(element, tabIndex);
                        element.tabIndex = -1;
                    }
                    else if (element.hasAttribute('contenteditable')) {
                        this.tabIndexMap.set(element, element.hasAttribute('tabindex') ? tabIndex : 0);
                        element.tabIndex = -1;
                    }
                }
            }
        }
    }
    getMainWidgetTabIndexElements(splitWidget) {
        const elementSet = new Set();
        if (!splitWidget) {
            return elementSet;
        }
        const mainWidget = splitWidget.mainWidget();
        if (!mainWidget?.element) {
            return elementSet;
        }
        let node = mainWidget.element;
        for (; node; node = node.traverseNextNode(mainWidget.element)) {
            if (!(node instanceof HTMLElement)) {
                continue;
            }
            const element = (node);
            const tabIndex = element.tabIndex;
            if (tabIndex < 0) {
                continue;
            }
            elementSet.add(element);
        }
        return elementSet;
    }
    restoreTabIndexOnElements() {
        for (const element of this.tabIndexMap.keys()) {
            element.tabIndex = this.tabIndexMap.get(element);
        }
        this.tabIndexMap.clear();
    }
    onKeyDown(event) {
        const keyboardEvent = event;
        if (Dialog.getInstance() !== this) {
            return;
        }
        if (keyboardEvent.keyCode === Keys.Esc.code && KeyboardShortcut.hasNoModifiers(event)) {
            if (this.escapeKeyCallback) {
                this.escapeKeyCallback(event);
            }
            if (event.handled) {
                return;
            }
            if (this.closeOnEscape) {
                event.consume(true);
                this.hide();
            }
        }
    }
    static dialogs = [];
}
//# sourceMappingURL=Dialog.js.map