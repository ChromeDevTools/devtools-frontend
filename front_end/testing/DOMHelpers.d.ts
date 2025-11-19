/**
 * These helpers are designed to be used when testing components or other code that renders into the DOM.
 * By using these helpers we ensure the DOM is correctly cleaned between test runs.
 *
 * Note that `resetTestDOM` is automatically run before each test (see `test_setup.ts`).
 **/
import type * as Platform from '../core/platform/platform.js';
import type * as NodeText from '../ui/components/node_text/node_text.js';
import * as UI from '../ui/legacy/legacy.js';
export declare const TEST_CONTAINER_ID = "__devtools-test-container-id";
interface RenderOptions {
    allowMultipleChildren?: boolean;
    includeCommonStyles?: boolean;
}
/**
 * Renders a given element into the DOM. By default it will error if it finds an element already rendered but this can be controlled via the options.
 **/
export declare function renderElementIntoDOM<E extends Node | UI.Widget.Widget>(element: E, renderOptions?: RenderOptions): E;
export declare function removeChildren(node: Node): void;
/**
 * Asserts that all elements of `nodeList` are at least of type `T`.
 */
export declare function assertElements<T extends Element>(nodeList: NodeListOf<Element>, elementClass: Platform.Constructor.Constructor<T>): asserts nodeList is NodeListOf<T>;
export declare function getElementWithinComponent<T extends HTMLElement, V extends Element>(component: T, selector: string, elementClass: Platform.Constructor.Constructor<V>): V;
export declare function getElementsWithinComponent<T extends HTMLElement, V extends Element>(component: T, selector: string, elementClass: Platform.Constructor.Constructor<V>): NodeListOf<V>;
export declare function waitForScrollLeft<T extends Element>(element: T, desiredScrollLeft: number): Promise<void>;
/**
 * Dispatches a mouse click event.
 */
export declare function dispatchClickEvent<T extends Element>(element: T, options?: MouseEventInit): void;
export declare function dispatchMouseUpEvent<T extends Element>(element: T, options?: MouseEventInit): void;
export declare function dispatchBlurEvent<T extends Element>(element: T, options?: FocusEventInit): void;
export declare function dispatchFocusEvent<T extends Element>(element: T, options?: FocusEventInit): void;
export declare function dispatchFocusOutEvent<T extends Element>(element: T, options?: FocusEventInit): void;
/**
 * Dispatches a keydown event. Errors if the event was not dispatched successfully.
 */
export declare function dispatchKeyDownEvent<T extends Element>(element: T, options?: KeyboardEventInit): void;
export declare function dispatchInputEvent<T extends Element>(element: T, options?: InputEventInit): void;
/**
 * Dispatches a mouse over event.
 */
export declare function dispatchMouseOverEvent<T extends Element>(element: T, options?: MouseEventInit): void;
/**
 * Dispatches a mouse out event.
 */
export declare function dispatchMouseOutEvent<T extends Element>(element: T, options?: MouseEventInit): void;
/**
 * Dispatches a mouse move event.
 */
export declare function dispatchMouseMoveEvent<T extends Element>(element: T, options?: MouseEventInit): void;
/**
 * Dispatches a mouse leave event.
 */
export declare function dispatchMouseLeaveEvent<T extends Element>(element: T, options?: MouseEventInit): void;
/**
 * Dispatches a clipboard copy event.
 */
export declare function dispatchCopyEvent<T extends Element>(element: T, options?: ClipboardEventInit): void;
/**
 * Dispatches a clipboard paste event.
 */
export declare function dispatchPasteEvent<T extends Element>(element: T, options?: ClipboardEventInit): void;
/**
 * Listens to an event of an element and returns a Promise that resolves to the
 * specified event type.
 */
export declare function getEventPromise<T extends Event>(element: HTMLElement, eventName: string): Promise<T>;
export declare function doubleRaf(): Promise<unknown>;
export declare function raf(): Promise<unknown>;
/**
 * It's useful to use innerHTML in the tests to have full confidence in the
 * renderer output, but Lit uses comment nodes to split dynamic from
 * static parts of a template, and we don't want our tests full of noise
 * from those.
 */
export declare function stripLitHtmlCommentNodes(text: string): string;
/**
 * Returns an array of textContents.
 * Multiple consecutive newLine and space characters are removed.
 */
export declare function getCleanTextContentFromElements(el: ShadowRoot | HTMLElement, selector: string): string[];
/**
 * Returns the text content for the first element matching the given `selector` within the provided `el`.
 * Will error if no element is found matching the selector.
 */
export declare function getCleanTextContentFromSingleElement(el: ShadowRoot | HTMLElement, selector: string): string;
export declare function cleanTextContent(input: string): string;
export declare function assertNodeTextContent(component: NodeText.NodeText.NodeText, expectedContent: string): void;
export declare function querySelectorErrorOnMissing<T extends HTMLElement = HTMLElement>(parent: HTMLElement, selector: string): T;
declare global {
    interface Window {
        assertScreenshot(elementId: string, filename: string): Promise<string | undefined>;
    }
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
export declare function assertScreenshot(filename: string): Promise<void>;
export declare function setColorScheme(scheme: 'dark' | 'light'): void;
export {};
