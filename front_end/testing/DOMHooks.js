// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import * as TextEditor from '../ui/components/text_editor/text_editor.js';
import * as UI from '../ui/legacy/legacy.js';
import { raf, removeChildren, setColorScheme, TEST_CONTAINER_ID } from './DOMHelpers.js';
import { TestUniverse } from './TestUniverse.js';
const documentBodyElements = new Set();
let customTestUniverse = new TestUniverse();
export function setTestUniverseForWidgets(universe) {
    customTestUniverse = universe;
}
function resetTestUniverseForWidgets() {
    customTestUniverse = new TestUniverse();
}
function removeElementOrWidget(node, parent = document.body) {
    const widget = UI.Widget.Widget.get(node);
    if (widget) {
        widget.detach();
    }
    else {
        parent.removeChild(node);
    }
}
/**
 * If a widget creates a glass pane, it can get orphaned and not cleaned up correctly.
 */
function removeGlassPanes() {
    while (UI.Dialog.Dialog.hasInstance()) {
        UI.Dialog.Dialog.getInstance()?.hide();
    }
    for (const pane of document.body.querySelectorAll('[data-devtools-glass-pane]')) {
        removeElementOrWidget(pane);
    }
}
/**
 * If a text editor is created we create a special parent for the tooltip
 * This does not get cleared after render, but it's internals do.
 * So we need to manually remove it
 */
function removeTextEditorTooltip() {
    TextEditor.Config.removeTooltipHost();
}
function removeAnnouncer() {
    UI.ARIAUtils.LiveAnnouncer.removeAnnouncerElements(document.body);
}
/**
 * Completely cleans out the test DOM to ensure it's empty for the next test run.
 * This is run automatically between tests - you should not be manually calling this yourself.
 **/
export const cleanTestDOM = (testName = '') => {
    resetTestUniverseForWidgets();
    const previousContainer = document.getElementById(TEST_CONTAINER_ID);
    if (previousContainer) {
        removeChildren(previousContainer);
        previousContainer.remove();
    }
    removeGlassPanes();
    removeTextEditorTooltip();
    removeAnnouncer();
    SDK.CSSPropertyParserMatchers.removeCSSEvaluationElement();
    UI.UIUtils.resetElementsBeingEditedForTest();
    // Verify that nothing was left behind
    for (const child of document.body.children) {
        if (!documentBodyElements.has(child)) {
            console.error(`Test "${testName}" left DOM in document.body:`);
            console.error(child);
        }
    }
};
/**
 * Sets up the DOM for testing,
 * If not clean logs an error and cleans itself
 **/
export const setupTestDOM = async () => {
    for (const child of document.body.children) {
        documentBodyElements.add(child);
    }
    const previousContainer = document.getElementById(TEST_CONTAINER_ID);
    if (previousContainer) {
        // This should not be reachable, unless the
        // AfterEach hook fails before cleaning the DOM.
        // Clean it here and report
        console.error('Non clean test state found!');
        cleanTestDOM();
        await raf();
    }
    // Tests are run in light mode by default.
    setColorScheme('light');
    const newContainer = document.createElement('div');
    newContainer.id = TEST_CONTAINER_ID;
    newContainer.addEventListener(UI.UniverseRequestEvent.UniverseRequestEvent.eventName, (event) => {
        event.universe = customTestUniverse;
        event.stopPropagation();
    });
    // eslint-disable-next-line @devtools/no-document-body-mutation
    document.body.appendChild(newContainer);
};
//# sourceMappingURL=DOMHooks.js.map