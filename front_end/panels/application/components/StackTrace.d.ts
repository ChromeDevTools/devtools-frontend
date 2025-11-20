import '../../../ui/components/expandable_list/expandable_list.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type TemplateResult } from '../../../ui/lit/lit.js';
export interface StackTraceData {
    creationStackTraceData: {
        creationStackTrace: Protocol.Runtime.StackTrace | null;
        creationStackTraceTarget: SDK.Target.Target | null;
    };
    buildStackTraceRows: (stackTrace: Protocol.Runtime.StackTrace, target: SDK.Target.Target | null, linkifier: Components.Linkifier.Linkifier, tabStops: boolean | undefined, updateCallback?: (arg0: Array<Components.JSPresentationUtils.StackTraceRegularRow | Components.JSPresentationUtils.StackTraceAsyncRow>) => void) => Array<Components.JSPresentationUtils.StackTraceRegularRow | Components.JSPresentationUtils.StackTraceAsyncRow>;
}
interface StackTraceRowViewInput {
    stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow | null;
}
type StackTraceRowView = (input: StackTraceRowViewInput, output: undefined, target: HTMLElement) => void;
export declare class StackTraceRow extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: StackTraceRowView);
    stackTraceRowItem: Components.JSPresentationUtils.StackTraceRegularRow | null;
    performUpdate(): void;
}
interface StackTraceLinkViewInput {
    onShowAllClick: () => void;
    hiddenCallFramesCount: number | null;
    expandedView: boolean;
}
type StackTraceLinkView = (input: StackTraceLinkViewInput, output: undefined, target: HTMLElement) => void;
export declare class StackTraceLinkButton extends UI.Widget.Widget {
    #private;
    onShowAllClick: () => void;
    hiddenCallFramesCount: number | null;
    expandedView: boolean;
    constructor(element?: HTMLElement, view?: StackTraceLinkView);
    performUpdate(): void;
}
export declare class StackTrace extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement);
    set data(data: StackTraceData);
    createRowTemplates(): TemplateResult[];
}
export {};
