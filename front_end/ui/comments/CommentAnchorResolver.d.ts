import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
export type EditorAnchorSignature = CommentManager.CommentManager.EditorAnchorSignature;
export type TimelineAnchorSignature = CommentManager.CommentManager.TimelineAnchorSignature;
export type CommentAnchorSignature = CommentManager.CommentManager.CommentAnchorSignature;
export type CommentThread = CommentManager.CommentManager.CommentThread;
/**
 * The comment thread UI itself is never a valid comment target: anything inside it (including the
 * DOM node link in its header) must stay inert while comment mode is on.
 */
export declare const COMMENT_THREAD_UI_SELECTOR = ".comment-thread-widget";
/**
 * Finds the closest ancestor (or the element itself) matching a CSS selector,
 * traversing across Shadow DOM boundaries (shadow root boundaries to shadow hosts).
 *
 * @param element The starting element for traversal.
 * @param selector The CSS selector to match against.
 * @returns The first matching Element or null if none is found.
 */
export declare function closestAcrossShadow(element: Element, selector: string): Element | null;
/**
 * Resolves the file path attribute for a CodeMirror editor element.
 *
 * @param element The editor element to check.
 * @returns The file path string or undefined if not found.
 */
export declare function getEditorFilePath(element: Element): string | undefined;
/**
 * Determines whether an anchor is backed by a tracked DOM element.
 *
 * Canvas-rendered anchors (such as Performance panel timeline entries) do not have
 * individual DOM nodes and manage their own overlays in canvas coordinates.
 * These anchors return false and bypass DOM-level node caching, rematching,
 * and IntersectionObserver tracking.
 *
 * @param anchor The comment anchor signature to check.
 * @returns True if the anchor corresponds to a DOM-tracked element; otherwise false.
 */
export declare function isDomTrackedAnchor(anchor: CommentAnchorSignature): boolean;
/**
 * Result returned by a {@link CustomAnchorResolver} representing an anchor
 * within a specialized or canvas-rendered view.
 */
export interface CustomAnchorResult {
    /** The anchor signature representing the commented item. */
    anchor: CommentAnchorSignature;
    /** The DOM element acting as the visual host (e.g. the canvas element). */
    anchorElement?: Element;
    /** Optional bounding box within the page for the hover or highlight overlay. */
    highlightRect?: {
        top: number;
        left: number;
        width: number;
        height: number;
        visible?: boolean;
    };
}
/**
 * Extension point allowing views that render custom content (such as canvas-based
 * flame charts) to provide custom anchor resolution for comments without direct DOM nodes.
 */
export interface CustomAnchorResolver {
    /**
     * Determines whether this resolver can handle anchors for the target element.
     *
     * @param element The element currently hovered or clicked.
     * @returns True if this resolver manages anchors within the given element.
     */
    matches(element: Element): boolean;
    /**
     * Resolves an anchor signature and highlight bounds for a point within the element.
     *
     * @param element The target element matched by this resolver.
     * @param options Pointer coordinates and a flag indicating if resolution is for a hover preview.
     * @returns The resolved anchor result, or null if no anchor is present at the specified location.
     */
    resolve(element: Element, options?: {
        clientX: number;
        clientY: number;
        forHover?: boolean;
    }): CustomAnchorResult | null;
}
/**
 * Registers a custom anchor resolver. Usually called when a view becomes visible
 * (e.g. inside `wasShown()`).
 *
 * @param resolver The custom anchor resolver to register.
 */
export declare function registerCustomAnchorResolver(resolver: CustomAnchorResolver): void;
/**
 * Unregisters a custom anchor resolver. Usually called when a view hides
 * (e.g. inside `willHide()`).
 *
 * @param resolver The custom anchor resolver to unregister.
 */
export declare function unregisterCustomAnchorResolver(resolver: CustomAnchorResolver): void;
/**
 * Clears all registered custom anchor resolvers. Test-only helper.
 */
export declare function clearCustomAnchorResolversForTest(): void;
/**
 * Finds the first registered custom anchor resolver that matches the given element.
 *
 * @param element The element to check.
 * @returns The matching resolver, or null if no resolver matches.
 */
export declare function getCustomAnchorResolverForElement(element: Element): CustomAnchorResolver | null;
/**
 * Checks whether an element contains non-empty text content (after trimming whitespace),
 * including text from any nested shadow roots.
 *
 * @param element The element to check.
 * @returns True if the element contains non-empty text; otherwise false.
 */
export declare function isNonEmptyItem(element: Element): boolean;
/**
 * Determines whether an element represents a tab header or tab title
 * (e.g. PanelTabHeader, role="tab", or .tab-header class) across shadow DOM boundaries,
 * which should be excluded from commenting.
 *
 * @param element The element to check.
 * @returns True if the element or any of its ancestors is a tab title; otherwise false.
 */
export declare function isTabTitle(element: Element): boolean;
/**
 * Resolves an arbitrary clicked or targeted DOM element to its appropriate semantic comment anchor element.
 *
 * Traversal hierarchy:
 * 1. Checks if the element is part of a tab title or of the comment thread UI (returns null if so).
 * 2. Escalates CodeMirror line/gutter elements to .cm-editor (only if the clicked line is non-empty).
 * 3. Checks for domain IDs (`data-network-request-id` or `data-backend-node-id`) across shadow boundaries,
 *    returning the owning domain element.
 * 4. Escalates minor controls / sub-elements up to semantic containers (e.g., TableRow, TreeItem).
 * 5. Falls back to the nearest visual logging element if no semantic container is found,
 *    excluding top-level containers and minor controls.
 *
 * @param element The source DOM element to resolve.
 * @returns The resolved semantic anchor Element, or null if unresolvable/empty/excluded.
 */
export declare function resolveCommentAnchorElement(element: Element, options?: {
    clientX: number;
    clientY: number;
    forHover?: boolean;
}): Element | null;
/**
 * Extracts the trailing Visual Element type name from a full visual logging path.
 * Used as a fast pre-filter optimization before calculating full ancestor VE paths.
 *
 * @param vePath The full visual logging path string (e.g. "Panel: elements > TreeItem: rule").
 * @returns The trailing VE type name (e.g. "TreeItem").
 */
export declare function extractVeName(vePath: string): string;
/**
 * Checks if an element matches the given visual logging path.
 *
 * @param element The DOM element to test.
 * @param vePath The expected visual logging path.
 * @param targetVeName Optional trailing VE name used as a fast pre-filter optimization to reject
 * non-matching elements without performing an expensive full DOM ancestor traversal in `VisualLogging.getVePath`.
 * @returns True if the element's VE path matches vePath; otherwise false.
 */
export declare function matchesVePath(element: Element, vePath: string, targetVeName?: string): boolean;
/**
 * Computes the 0-indexed position of an element among all elements sharing the same visual logging path
 * in document order across light and shadow DOM trees.
 *
 * @param element The target element.
 * @param vePath The visual logging path to match.
 * @param root The root Document or Element to search within (defaults to element's ownerDocument or document).
 * @returns The 0-based index among VE siblings.
 */
export declare function getSiblingIndex(element: Element, vePath: string, root?: Document | Element): number;
/**
 * Resolves a DOM element to a robust, serializable `CommentAnchorSignature`.
 *
 * The signature captures visual logging paths, text content, sibling index disambiguation,
 * domain IDs (`networkRequestId`, `backendNodeId`), and CodeMirror editor coordinates to allow
 * resilient rematching across DOM re-renders, filtering, and DevTools sessions.
 *
 * @param element The source DOM element to resolve into an anchor signature.
 * @param root Optional root Document or Element to search within for sibling index calculation.
 * @returns The resolved CommentAnchorSignature, or null if unresolvable.
 */
export declare function resolveCommentAnchor(element: Element, root?: Document | Element, options?: {
    clientX: number;
    clientY: number;
    forHover?: boolean;
}): CommentAnchorSignature | null;
/**
 * Searches a document or element tree (recursively traversing all Shadow DOM roots)
 * and returns all matching descendant elements up to the specified limit in document order.
 *
 * Note: The root container itself is not matched against selector; only descendants are returned.
 *
 * @param root The root Document or Element to search from.
 * @param selector The CSS selector to match against.
 * @param limit Maximum number of matching elements to return (defaults to Infinity).
 * @returns Array of matching Elements in document order.
 */
export declare function deepQuerySelectorAll(root: Document | Element, selector: string, limit?: number): Element[];
/**
 * Finds the first matching descendant element across light and shadow DOM trees.
 *
 * @param root The root Document or Element to search from.
 * @param selector The CSS selector to match against.
 * @returns The first matching Element or null if none is found.
 */
export declare function deepQuerySelector(root: Document | Element, selector: string): Element | null;
/**
 * Rematches a stored comment thread to its live corresponding DOM element.
 *
 * Matching pipeline:
 * 1. Primary fast-path: Query by domain IDs (`networkRequestId` or `backendNodeId`) across shadow roots.
 * 2. CodeMirror editor line match: Match editor and line number/text, scoped by `filePath` if present.
 * 3. Visual logging path fallback: Find all candidate elements matching `vePath`.
 * 4. Text content refinement: Filter candidates by `textSignature` and `parentTextSignature`.
 * 5. Sibling index disambiguation: Match exact sibling position when multiple candidates exist.
 *
 * @param comment The comment thread containing the anchor signature to rematch.
 * @param root The root Document or Element to search within (defaults to document).
 * @param cachedJslogElements Optional pre-collected list of `[jslog]` elements for performance.
 * @returns The rematched live Element, or null if no match is found.
 */
export declare function rematchCommentAnchor(comment: CommentThread, root?: Document | Element, cachedJslogElements?: Element[]): Element | null;
export interface VisibleRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}
/**
 * Computes the visible viewport-relative bounding box of an element after clipping against
 * all ancestor scroll/overflow containers and viewport boundaries across shadow DOM roots.
 *
 * @param element The source DOM element.
 * @param targetRect Optional explicit bounding box (e.g. for sub-lines or custom targets).
 * @returns The clipped viewport-relative rectangle or null if the element is completely clipped out of view or invisible.
 */
export declare function computeVisibleRect(element: Element, targetRect?: DOMRect): VisibleRect | null;
/**
 * Checks whether an element is connected to the DOM, visible according to `checkVisibility()`,
 * and has non-zero bounding box dimensions.
 *
 * @param element The element to check visibility for.
 * @returns True if the element is connected and rendered with non-zero size; otherwise false.
 */
export declare function isElementVisible(element: Element): boolean;
