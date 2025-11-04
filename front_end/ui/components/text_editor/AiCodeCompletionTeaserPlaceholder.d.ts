import type * as PanelCommon from '../../../panels/common/common.js';
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
export declare function flattenRect(rect: DOMRect, left: boolean): {
    left: number;
    right: number;
    top: number;
    bottom: number;
};
export declare class AiCodeCompletionTeaserPlaceholder extends CM.WidgetType {
    readonly teaser: PanelCommon.AiCodeCompletionTeaser;
    constructor(teaser: PanelCommon.AiCodeCompletionTeaser);
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
}
export declare function aiCodeCompletionTeaserPlaceholder(teaser: PanelCommon.AiCodeCompletionTeaser): CM.Extension;
