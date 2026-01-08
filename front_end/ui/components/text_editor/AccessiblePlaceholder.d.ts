import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
import type * as UI from '../../legacy/legacy.js';
export declare function flattenRect(rect: DOMRect, left: boolean): {
    left: number;
    right: number;
    top: number;
    bottom: number;
};
/**
 * A CodeMirror WidgetType that displays a UI.Widget.Widget as a placeholder.
 *
 * This custom placeholder implementation is used in place of the default
 * CodeMirror placeholder to provide better accessibility. Specifically,
 * it ensures that screen readers can properly announce the content within
 * the encapsulated widget.
 */
export declare class AccessiblePlaceholder extends CM.WidgetType {
    readonly teaser: UI.Widget.Widget;
    constructor(teaser: UI.Widget.Widget);
    toDOM(): HTMLElement;
    /**
     * Controls the cursor's height by reporting this widget's bounds as a
     * single line. This prevents the cursor from expanding vertically when the
     * placeholder content wraps across multiple lines.
     */
    coordsAt(dom: HTMLElement): {
        left: number;
        right: number;
        top: number;
        bottom: number;
    } | null;
    ignoreEvent(_: Event): boolean;
    destroy(dom: HTMLElement): void;
    eq(other: AccessiblePlaceholder): boolean;
}
