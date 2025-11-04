import '../../../ui/components/expandable_list/expandable_list.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface StackTraceData {
    frame: SDK.ResourceTreeModel.ResourceTreeFrame;
    buildStackTraceRows: (stackTrace: Protocol.Runtime.StackTrace, target: SDK.Target.Target | null, linkifier: Components.Linkifier.Linkifier, tabStops: boolean | undefined, updateCallback?: (arg0: Array<Components.JSPresentationUtils.StackTraceRegularRow | Components.JSPresentationUtils.StackTraceAsyncRow>) => void) => Array<Components.JSPresentationUtils.StackTraceRegularRow | Components.JSPresentationUtils.StackTraceAsyncRow>;
}
interface StackTraceRowData {
    stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow;
}
export declare class StackTraceRow extends HTMLElement {
    #private;
    set data(data: StackTraceRowData);
}
interface StackTraceLinkButtonData {
    onShowAllClick: () => void;
    hiddenCallFramesCount: number;
    expandedView: boolean;
}
export declare class StackTraceLinkButton extends HTMLElement {
    #private;
    set data(data: StackTraceLinkButtonData);
}
export declare class StackTrace extends HTMLElement {
    #private;
    set data(data: StackTraceData);
    createRowTemplates(): Lit.TemplateResult[];
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-stack-trace-row': StackTraceRow;
        'devtools-stack-trace-link-button': StackTraceLinkButton;
        'devtools-resources-stack-trace': StackTrace;
    }
}
export {};
