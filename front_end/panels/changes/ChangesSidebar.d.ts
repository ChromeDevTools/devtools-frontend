import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    selectedSourceCode: Workspace.UISourceCode.UISourceCode | null;
    onSelect: (uiSourceCode: Workspace.UISourceCode.UISourceCode | null) => void;
    sourceCodes: Set<Workspace.UISourceCode.UISourceCode>;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
declare const ChangesSidebar_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.SELECTED_UI_SOURCE_CODE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.SELECTED_UI_SOURCE_CODE_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.SELECTED_UI_SOURCE_CODE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.SELECTED_UI_SOURCE_CODE_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.SELECTED_UI_SOURCE_CODE_CHANGED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.Widget;
export declare class ChangesSidebar extends ChangesSidebar_base {
    #private;
    constructor(target?: HTMLElement, view?: View);
    set workspaceDiff(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
    selectedUISourceCode(): Workspace.UISourceCode.UISourceCode | null;
    performUpdate(): void;
    private uiSourceCodeModifiedStatusChanged;
}
export declare const enum Events {
    SELECTED_UI_SOURCE_CODE_CHANGED = "SelectedUISourceCodeChanged"
}
export interface EventTypes {
    [Events.SELECTED_UI_SOURCE_CODE_CHANGED]: void;
}
export {};
