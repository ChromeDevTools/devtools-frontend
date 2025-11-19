// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Buttons from '../ui/components/buttons/buttons.js';
import * as UI from '../ui/legacy/legacy.js';
import { checkForPendingActivity } from './TrackAsyncOperations.js';
export const TEST_CONTAINER_ID = '__devtools-test-container-id';
/**
 * Renders a given element into the DOM. By default it will error if it finds an element already rendered but this can be controlled via the options.
 **/
export function renderElementIntoDOM(element, renderOptions = {}) {
    const container = document.getElementById(TEST_CONTAINER_ID);
    if (!container) {
        throw new Error(`renderElementIntoDOM expects to find ${TEST_CONTAINER_ID}`);
    }
    const allowMultipleChildren = Boolean(renderOptions.allowMultipleChildren);
    if (container.childNodes.length !== 0 && !allowMultipleChildren) {
        throw new Error(`renderElementIntoDOM expects the container to be empty ${container.innerHTML}`);
    }
    if (renderOptions.includeCommonStyles) {
        container.appendChild(document.createElement('style')).textContent = UI.inspectorCommonStyles;
        container.appendChild(document.createElement('style')).textContent = Buttons.textButtonStyles;
    }
    if (element instanceof Node) {
        container.appendChild(element);
    }
    else {
        element.markAsRoot();
        element.show(container);
    }
    return element;
}
export function removeChildren(node) {
    while (true) {
        const { firstChild } = node;
        if (firstChild === null) {
            break;
        }
        const widget = UI.Widget.Widget.get(firstChild);
        if (widget) {
            // Child is a widget, so we have to use the Widget system to remove it from the DOM.
            widget.detach();
            continue;
        }
        // For regular children, recursively remove their children, since some of them
        // might be widgets, and only afterwards remove the child from the current node.
        removeChildren(firstChild);
        node.removeChild(firstChild);
    }
}
/**
 * Asserts that all elements of `nodeList` are at least of type `T`.
 */
export function assertElements(nodeList, elementClass) {
    nodeList.forEach(e => assert.instanceOf(e, elementClass));
}
export function getElementWithinComponent(component, selector, elementClass) {
    assert.isNotNull(component.shadowRoot);
    const element = component.shadowRoot.querySelector(selector);
    assert.instanceOf(element, elementClass);
    return element;
}
export function getElementsWithinComponent(component, selector, elementClass) {
    assert.isNotNull(component.shadowRoot);
    const elements = component.shadowRoot.querySelectorAll(selector);
    assertElements(elements, elementClass);
    return elements;
}
/* Waits for the given element to have a scrollLeft property of at least desiredScrollLeft */
export function waitForScrollLeft(element, desiredScrollLeft) {
    let lastScrollLeft = -1;
    let scrollLeftTimeout = null;
    const timeBetweenPolls = 50;
    return new Promise(resolve => {
        const pollForScrollLeft = () => {
            const newScrollLeft = element.scrollLeft;
            // If we get the same scroll value twice in a row, and it's at least what
            // we want, we're done!
            if (lastScrollLeft === newScrollLeft && newScrollLeft >= desiredScrollLeft) {
                if (scrollLeftTimeout) {
                    window.clearTimeout(scrollLeftTimeout);
                }
                resolve();
                return;
            }
            lastScrollLeft = newScrollLeft;
            scrollLeftTimeout = window.setTimeout(pollForScrollLeft, timeBetweenPolls);
        };
        window.setTimeout(pollForScrollLeft, timeBetweenPolls);
    });
}
/**
 * Dispatches a mouse click event.
 */
export function dispatchClickEvent(element, options = {}) {
    const clickEvent = new MouseEvent('click', options);
    element.dispatchEvent(clickEvent);
}
export function dispatchMouseUpEvent(element, options = {}) {
    const clickEvent = new MouseEvent('mouseup', options);
    element.dispatchEvent(clickEvent);
}
export function dispatchBlurEvent(element, options = {}) {
    const focusEvent = new FocusEvent('blur', options);
    element.dispatchEvent(focusEvent);
}
export function dispatchFocusEvent(element, options = {}) {
    const focusEvent = new FocusEvent('focus', options);
    element.dispatchEvent(focusEvent);
}
export function dispatchFocusOutEvent(element, options = {}) {
    const focusEvent = new FocusEvent('focusout', options);
    element.dispatchEvent(focusEvent);
}
/**
 * Dispatches a keydown event. Errors if the event was not dispatched successfully.
 */
export function dispatchKeyDownEvent(element, options = {}) {
    const clickEvent = new KeyboardEvent('keydown', options);
    const success = element.dispatchEvent(clickEvent);
    assert.isOk(success, 'Failed to trigger keydown event successfully.');
}
export function dispatchInputEvent(element, options = {}) {
    const inputEvent = new InputEvent('input', options);
    element.dispatchEvent(inputEvent);
}
/**
 * Dispatches a mouse over event.
 */
export function dispatchMouseOverEvent(element, options = {}) {
    const moveEvent = new MouseEvent('mouseover', options);
    element.dispatchEvent(moveEvent);
}
/**
 * Dispatches a mouse out event.
 */
export function dispatchMouseOutEvent(element, options = {}) {
    const moveEvent = new MouseEvent('mouseout', options);
    element.dispatchEvent(moveEvent);
}
/**
 * Dispatches a mouse move event.
 */
export function dispatchMouseMoveEvent(element, options = {}) {
    const moveEvent = new MouseEvent('mousemove', options);
    element.dispatchEvent(moveEvent);
}
/**
 * Dispatches a mouse leave event.
 */
export function dispatchMouseLeaveEvent(element, options = {}) {
    const leaveEvent = new MouseEvent('mouseleave', options);
    element.dispatchEvent(leaveEvent);
}
/**
 * Dispatches a clipboard copy event.
 */
export function dispatchCopyEvent(element, options = {}) {
    const copyEvent = new ClipboardEvent('copy', options);
    element.dispatchEvent(copyEvent);
}
/**
 * Dispatches a clipboard paste event.
 */
export function dispatchPasteEvent(element, options = {}) {
    const pasteEvent = new ClipboardEvent('paste', options);
    element.dispatchEvent(pasteEvent);
}
/**
 * Listens to an event of an element and returns a Promise that resolves to the
 * specified event type.
 */
export function getEventPromise(element, eventName) {
    return new Promise(resolve => {
        element.addEventListener(eventName, (event) => {
            resolve(event);
        }, { once: true });
    });
}
export async function doubleRaf() {
    return await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
export async function raf() {
    return await new Promise(resolve => requestAnimationFrame(resolve));
}
/**
 * It's useful to use innerHTML in the tests to have full confidence in the
 * renderer output, but Lit uses comment nodes to split dynamic from
 * static parts of a template, and we don't want our tests full of noise
 * from those.
 */
export function stripLitHtmlCommentNodes(text) {
    /**
     * Lit comments take the form of:
     * <!--?lit$1234?--> or:
     * <!--?-->
     * <!---->
     * And this regex matches all of them.
     */
    return text.replaceAll(/<!--(\?)?(lit\$[0-9]+\$)?-->/g, '');
}
/**
 * Returns an array of textContents.
 * Multiple consecutive newLine and space characters are removed.
 */
export function getCleanTextContentFromElements(el, selector) {
    const elements = Array.from(el.querySelectorAll(selector));
    return elements.map(element => {
        return ((element instanceof HTMLElement ? element.innerText : element.textContent) ?? '')
            .trim()
            .replace(/[ \n]{2,}/g, ' ');
    });
}
/**
 * Returns the text content for the first element matching the given `selector` within the provided `el`.
 * Will error if no element is found matching the selector.
 */
export function getCleanTextContentFromSingleElement(el, selector) {
    const element = el.querySelector(selector);
    assert.isOk(element, `Could not find element with selector ${selector}`);
    return element.textContent ? cleanTextContent(element.textContent) : '';
}
export function cleanTextContent(input) {
    return input.trim().replace(/[ \n]{2,}/g, ' ');
}
export function assertNodeTextContent(component, expectedContent) {
    assert.isNotNull(component.shadowRoot);
    const content = Array.from(component.shadowRoot.querySelectorAll('span')).map(span => span.textContent).join('');
    assert.strictEqual(content, expectedContent);
}
export function querySelectorErrorOnMissing(parent, selector) {
    const elem = parent.querySelector(selector);
    if (!elem) {
        throw new Error(`Expected element with selector ${selector} not found.`);
    }
    return elem;
}
/**
 * Given a filename in the format "<folder>/<image.png>"
 * this function asserts that a screenshot taken from the element
 * identified by the TEST_CONTAINER_ID matches a screenshot
 * in test/interactions/goldens/linux/<folder>/<image.png>.
 *
 * Currently, it only asserts screenshots match goldens on Linux.
 * The function relies on the bindings exposed via the karma config.
 */
export async function assertScreenshot(filename) {
    // To avoid a lot of empty space in the screenshot.
    document.getElementById(TEST_CONTAINER_ID).style.width = 'fit-content';
    let frame = window;
    while (frame) {
        frame.scrollTo(0, 0);
        frame = frame.parent !== frame ? frame.parent : null;
    }
    // For test we load the fonts though the network - front_end/testing/test_setup.ts
    // Which means we may try to take screenshot while they are loading
    await document.fonts.ready;
    await raf();
    // Pending activity before taking screenshots results in flakiness.
    await checkForPendingActivity();
    if (!window.assertScreenshot) {
        window.assertScreenshot = async () => {
            debugger; // eslint-disable-line no-debugger
            return undefined;
        };
    }
    const errorMessage = await window.assertScreenshot(`#${TEST_CONTAINER_ID}`, filename);
    if (errorMessage) {
        throw new Error(errorMessage);
    }
}
export function setColorScheme(scheme) {
    document.documentElement.classList.toggle('theme-with-dark-background', scheme === 'dark');
}
//# sourceMappingURL=DOMHelpers.js.map