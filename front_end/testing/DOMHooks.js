// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../ui/legacy/legacy.js';
import { raf, removeChildren, setColorScheme, TEST_CONTAINER_ID } from './DOMHelpers.js';
const documentBodyElements = new Set();
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
    // Found in front_end/ui/components/text_editor/config.ts
    for (const tooltip of document.body.querySelectorAll('.editor-tooltip-host')) {
        removeElementOrWidget(tooltip);
    }
}
function removeAnnouncer() {
    UI.ARIAUtils.LiveAnnouncer.removeAnnouncerElements(document.body);
}
/**
 * If a test calls localEvalCSS, an element is created on demand for this
 * purpose. This element is not removed from the DOM and will leak between tests
 * if not removed.
 */
function removeCSSEvaluationElement() {
    // Found in front_end/core/sdk/CSSPropertyParserMatchers.ts
    const element = document.getElementById('css-evaluation-element');
    if (element) {
        document.body.removeChild(element);
    }
}
/**
 * Completely cleans out the test DOM to ensure it's empty for the next test run.
 * This is run automatically between tests - you should not be manually calling this yourself.
 **/
export const cleanTestDOM = (testName = '') => {
    const previousContainer = document.getElementById(TEST_CONTAINER_ID);
    if (previousContainer) {
        removeChildren(previousContainer);
        previousContainer.remove();
    }
    removeGlassPanes();
    removeTextEditorTooltip();
    removeAnnouncer();
    removeCSSEvaluationElement();
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
    // eslint-disable-next-line @devtools/no-document-body-mutation
    document.body.appendChild(newContainer);
};
//# sourceMappingURL=DOMHooks.js.map