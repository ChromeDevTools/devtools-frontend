import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import * as UI from '../../legacy.js';
import { Linkifier } from './Linkifier.js';
export interface Options {
    runtimeStackTrace?: Protocol.Runtime.StackTrace;
    tabStops?: boolean;
    widthConstrained?: boolean;
    showColumnNumber?: boolean;
    expandable?: boolean;
}
export declare class StackTracePreviewContent extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, target?: SDK.Target.Target, linkifier?: Linkifier, options?: Options);
    hasContent(): boolean;
    performUpdate(): void;
    get linkElements(): readonly HTMLElement[];
    set target(target: SDK.Target.Target | undefined);
    set linkifier(linkifier: Linkifier);
    set options(options: Options);
    set stackTrace(stackTrace: StackTrace.StackTrace.StackTrace);
    onDetach(): void;
}
