import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    isProfiling: boolean;
    log: SDK.PaintProfiler.PaintProfilerLogItem[];
    profiles: Protocol.LayerTree.PaintProfile[] | null | undefined;
    logCategories: PaintProfilerCategory[] | undefined;
    innerBarWidth: number;
    minBarHeight: number;
    barPaddingWidth: number;
    outerBarWidth: number;
    windowLeftRatio: number;
    windowRightRatio: number;
}
interface ViewOutput {
    onCanvasContainerCreated: (el: Element | undefined) => void;
}
declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
declare const PaintProfilerView_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.WINDOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.WINDOW_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.WINDOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.WINDOW_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.WINDOW_CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.Widget;
export declare class PaintProfilerView extends PaintProfilerView_base {
    #private;
    private canvasContainer?;
    private readonly innerBarWidth;
    private minBarHeight;
    private readonly barPaddingWidth;
    private readonly outerBarWidth;
    private samplesPerBar;
    private log;
    private snapshot?;
    private logCategories?;
    private profiles?;
    private updateImageTimer?;
    showImageCallback?: (arg0?: string | undefined) => void;
    private isProfiling;
    constructor(element?: HTMLElement, view?: View);
    set snapshotAndLog(data: {
        snapshot: SDK.PaintProfiler.PaintProfilerSnapshot | null;
        log: SDK.PaintProfiler.PaintProfilerLogItem[];
        clipRect?: Protocol.DOM.Rect | null;
    } | null);
    get snapshoAndLog(): {
        log: SDK.PaintProfiler.PaintProfilerLogItem[];
        snapshot?: SDK.PaintProfiler.PaintProfilerSnapshot | null;
    };
    static categories(): Record<string, PaintProfilerCategory>;
    private static initLogItemCategories;
    private static categoryForLogItem;
    wasShown(): void;
    onResize(): void;
    setSnapshotAndLog(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot | null, log: SDK.PaintProfiler.PaintProfilerLogItem[], clipRect: Protocol.DOM.Rect | null): Promise<void>;
    set scale(scale: number);
    get scale(): number;
    performUpdate(): void;
    private onWindowChanged;
    selectionWindow(): {
        left: number;
        right: number;
    } | null;
    private updateImage;
    private reset;
}
export declare const enum Events {
    WINDOW_CHANGED = "WindowChanged"
}
export interface EventTypes {
    [Events.WINDOW_CHANGED]: {
        left: number;
        right: number;
    } | null;
}
export interface CommandLogViewInput {
    visibleLogItems: SDK.PaintProfiler.PaintProfilerLogItem[];
}
export declare const COMMAND_LOG_DEFAULT_VIEW: (input: CommandLogViewInput, _output: undefined, target: HTMLElement) => void;
type CommandLogView = typeof COMMAND_LOG_DEFAULT_VIEW;
export declare class PaintProfilerCommandLogView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: CommandLogView);
    wasShown(): void;
    set commandLog(log: SDK.PaintProfiler.PaintProfilerLogItem[]);
    get commandLog(): SDK.PaintProfiler.PaintProfilerLogItem[];
    set selectionWindow(window: {
        left: number;
        right: number;
    } | null);
    get selectionWindow(): {
        left: number;
        right: number;
    } | null;
    performUpdate(): Promise<void>;
}
export declare class PaintProfilerCategory {
    name: string;
    title: string;
    color: string;
    constructor(name: string, title: string, color: string);
}
export {};
