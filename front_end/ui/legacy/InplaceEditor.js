// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as ARIAUtils from './ARIAUtils.js';
import { Keys } from './KeyboardShortcut.js';
import { ElementFocusRestorer, markBeingEdited } from './UIUtils.js';
let inplaceEditorInstance = null;
export class InplaceEditor {
    focusRestorer;
    static startEditing(element, config) {
        if (!inplaceEditorInstance) {
            inplaceEditorInstance = new InplaceEditor();
        }
        return inplaceEditorInstance.startEditing(element, config);
    }
    editorContent(editingContext) {
        const element = editingContext.element;
        if (element.tagName === 'INPUT' && element.type === 'text') {
            return element.value;
        }
        return element.textContent || '';
    }
    setUpEditor(editingContext) {
        const element = editingContext.element;
        element.classList.add('editing');
        element.setAttribute('contenteditable', 'plaintext-only');
        const oldRole = element.getAttribute('role');
        ARIAUtils.markAsTextBox(element);
        editingContext.oldRole = oldRole;
        // Using element.getAttribute('tabIndex') instead of element.tabIndex so
        // that we do not get a default value if the tabIndex attribute is not set.
        const oldTabIndex = element.getAttribute('tabIndex');
        if (typeof oldTabIndex !== 'number' || oldTabIndex < 0) {
            element.tabIndex = 0;
        }
        this.focusRestorer = new ElementFocusRestorer(element);
        editingContext.oldTabIndex = oldTabIndex;
    }
    closeEditor(editingContext) {
        const element = editingContext.element;
        element.classList.remove('editing');
        element.removeAttribute('contenteditable');
        if (typeof editingContext.oldRole !== 'string') {
            element.removeAttribute('role');
        }
        else {
            element.setAttribute('role', editingContext.oldRole);
        }
        if (typeof editingContext.oldTabIndex !== 'number') {
            element.removeAttribute('tabIndex');
        }
        else {
            element.setAttribute('tabIndex', editingContext.oldTabIndex);
        }
        element.scrollTop = 0;
        element.scrollLeft = 0;
    }
    cancelEditing(editingContext) {
        const element = editingContext.element;
        if (element.tagName === 'INPUT' && element.type === 'text') {
            element.value = editingContext.oldText || '';
        }
        else {
            element.textContent = editingContext.oldText;
        }
    }
    startEditing(element, config) {
        if (!markBeingEdited(element, true)) {
            return null;
        }
        const editingContext = { element, config, oldRole: null, oldTabIndex: null, oldText: null };
        const committedCallback = config.commitHandler;
        const cancelledCallback = config.cancelHandler;
        const pasteCallback = config.pasteHandler;
        const context = config.context;
        let moveDirection = '';
        const self = this;
        this.setUpEditor(editingContext);
        editingContext.oldText = this.editorContent(editingContext);
        function blurEventListener(e) {
            if (!config.blurHandler(element, e)) {
                return;
            }
            editingCommitted.call(element);
        }
        function cleanUpAfterEditing() {
            markBeingEdited(element, false);
            element.removeEventListener('blur', blurEventListener, false);
            element.removeEventListener('keydown', keyDownEventListener, true);
            if (pasteCallback) {
                element.removeEventListener('paste', pasteEventListener, true);
            }
            if (self.focusRestorer) {
                self.focusRestorer.restore();
            }
            self.closeEditor(editingContext);
        }
        function editingCancelled() {
            self.cancelEditing(editingContext);
            cleanUpAfterEditing();
            cancelledCallback(this, context);
        }
        function editingCommitted() {
            cleanUpAfterEditing();
            committedCallback(this, self.editorContent(editingContext), editingContext.oldText, context, moveDirection);
            element.dispatchEvent(new Event('change'));
        }
        function defaultFinishHandler(event) {
            if (event.key === 'Enter') {
                return 'commit';
            }
            if (event.keyCode === Keys.Esc.code || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
                return 'cancel';
            }
            if (event.key === 'Tab') {
                return 'move-' + (event.shiftKey ? 'backward' : 'forward');
            }
            return '';
        }
        function handleEditingResult(result, event) {
            if (result === 'commit') {
                editingCommitted.call(element);
                event.consume(true);
            }
            else if (result === 'cancel') {
                editingCancelled.call(element);
                event.consume(true);
            }
            else if (result?.startsWith('move-')) {
                moveDirection = result.substring(5);
                if (event.key === 'Tab') {
                    event.consume(true);
                }
                blurEventListener();
            }
        }
        function pasteEventListener(event) {
            if (!pasteCallback) {
                return;
            }
            const result = pasteCallback(event);
            handleEditingResult(result, event);
        }
        function keyDownEventListener(event) {
            let result = defaultFinishHandler(event);
            if (!result && config.postKeydownFinishHandler) {
                const postKeydownResult = config.postKeydownFinishHandler(event);
                if (postKeydownResult) {
                    result = postKeydownResult;
                }
            }
            handleEditingResult(result, event);
        }
        element.addEventListener('blur', blurEventListener, false);
        element.addEventListener('keydown', keyDownEventListener, true);
        if (pasteCallback !== undefined) {
            element.addEventListener('paste', pasteEventListener, true);
        }
        const handle = { cancel: editingCancelled.bind(element), commit: editingCommitted.bind(element) };
        return handle;
    }
}
export class Config {
    commitHandler;
    cancelHandler;
    context;
    blurHandler;
    pasteHandler;
    postKeydownFinishHandler;
    constructor(commitHandler, cancelHandler, context, blurHandler = () => true) {
        this.commitHandler = commitHandler;
        this.cancelHandler = cancelHandler;
        this.context = context;
        this.blurHandler = blurHandler;
    }
    setPostKeydownFinishHandler(postKeydownFinishHandler) {
        this.postKeydownFinishHandler = postKeydownFinishHandler;
    }
}
//# sourceMappingURL=InplaceEditor.js.map