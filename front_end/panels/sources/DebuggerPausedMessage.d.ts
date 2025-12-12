import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import type * as BreakpointManager from '../../models/breakpoints/breakpoints.js';
import * as UI from '../../ui/legacy/legacy.js';
interface DOMBreakpointData {
    type: Protocol.DOMDebugger.DOMBreakpointType;
    node: SDK.DOMModel.DOMNode;
    targetNode: SDK.DOMModel.DOMNode | null;
    insertion: boolean;
}
interface ViewInput {
    errorLike: boolean;
    mainText: string;
    subText?: string;
    title?: string;
    domBreakpointData?: DOMBreakpointData;
}
declare const DEFAULT_VIEW: (input: ViewInput | null, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class DebuggerPausedMessage extends UI.Widget.Widget {
    #private;
    private readonly view;
    constructor(element?: HTMLElement, view?: View);
    private static descriptionWithoutStack;
    private static createDOMBreakpointHitMessageDetails;
    render(details: SDK.DebuggerModel.DebuggerPausedDetails | null, debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, breakpointManager: BreakpointManager.BreakpointManager.BreakpointManager): Promise<void>;
    performUpdate(): void;
}
export declare const BreakpointTypeNouns: Map<Protocol.DOMDebugger.DOMBreakpointType, () => Platform.UIString.LocalizedString>;
export {};
