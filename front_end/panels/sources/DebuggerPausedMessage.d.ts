import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface DOMBreakpointData {
    type: Protocol.DOMDebugger.DOMBreakpointType;
    node: SDK.DOMModel.DOMNode;
    targetNode: SDK.DOMModel.DOMNode | null;
    insertion: boolean;
}
export interface ViewInput {
    errorLike: boolean;
    mainText: string;
    subText?: string;
    title?: string;
    domBreakpointData?: DOMBreakpointData;
    onDisableBreakpoint?: () => void;
    onNeverPauseHere?: () => void;
    onDeactivateBreakpointsAndResume?: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput | null, _output: undefined, target: DocumentFragment) => void;
export type View = typeof DEFAULT_VIEW;
export declare class DebuggerPausedMessage extends UI.Widget.Widget<ShadowRoot> {
    #private;
    private readonly view;
    static readonly INJECT: readonly [
        typeof SDK.EventBreakpointsModel.EventBreakpointsManager,
        typeof Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
        typeof Breakpoints.BreakpointManager.BreakpointManager,
        typeof Common.Settings.Settings
    ];
    constructor(element: HTMLElement | undefined, [eventBreakpointsManager, debuggerWorkspaceBinding, breakpointManager, settings]: UI.Widget.WidgetDependencies<typeof DebuggerPausedMessage>, view?: View);
    private static descriptionWithoutStack;
    private static createDOMBreakpointHitMessageDetails;
    render(details: SDK.DebuggerModel.DebuggerPausedDetails | null, debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, breakpointManager: Breakpoints.BreakpointManager.BreakpointManager): Promise<void>;
    performUpdate(): void;
}
export declare const BreakpointTypeNouns: Map<Protocol.DOMDebugger.DOMBreakpointType, () => Platform.UIString.LocalizedString>;
