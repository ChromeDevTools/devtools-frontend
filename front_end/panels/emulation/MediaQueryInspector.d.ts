import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    zoomFactor: number;
    markers: Map<Section, MediaQueryMarker[]>;
    onMediaQueryClicked: (model: MediaQueryUIModel) => void;
    onContextMenu: (event: Event, locations: SDK.CSSModel.CSSLocation[]) => void;
}
export interface MediaQueryMarker {
    active: boolean;
    model: MediaQueryUIModel;
    locations: SDK.CSSModel.CSSLocation[];
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: object, target: DocumentFragment) => void;
export declare class MediaQueryInspector extends UI.Widget.Widget<ShadowRoot> implements SDK.TargetManager.SDKModelObserver<SDK.CSSModel.CSSModel> {
    #private;
    private readonly view;
    readonly mediaThrottler: Common.Throttler.Throttler;
    private cssModel?;
    private cachedQueryModels?;
    constructor(element?: HTMLElement, view?: (input: ViewInput, _output: object, target: DocumentFragment) => void);
    get getWidthCallback(): (() => number) | undefined;
    set getWidthCallback(callback: (() => number) | undefined);
    get setWidthCallback(): ((arg0: number) => void) | undefined;
    set setWidthCallback(callback: ((arg0: number) => void) | undefined);
    modelAdded(cssModel: SDK.CSSModel.CSSModel): void;
    modelRemoved(cssModel: SDK.CSSModel.CSSModel): void;
    get scale(): number;
    set scale(scale: number);
    private onMediaQueryClicked;
    private onContextMenu;
    private revealSourceLocation;
    private scheduleMediaQueriesUpdate;
    private refetchMediaQueries;
    private squashAdjacentEqual;
    private rebuildMediaQueries;
    private buildMediaQueryMarkers;
    private zoomFactor;
    wasShown(): void;
    performUpdate(): void;
}
export declare const enum Section {
    MAX = 0,
    MIN_MAX = 1,
    MIN = 2
}
export declare class MediaQueryUIModel {
    #private;
    private cssMedia;
    constructor(cssMedia: SDK.CSSMedia.CSSMedia, minWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression | null, maxWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression | null, active: boolean);
    static createFromMediaQuery(cssMedia: SDK.CSSMedia.CSSMedia, mediaQuery: SDK.CSSMedia.CSSMediaQuery): MediaQueryUIModel | null;
    equals(other: MediaQueryUIModel): boolean;
    dimensionsEqual(other: MediaQueryUIModel): boolean;
    compareTo(other: MediaQueryUIModel): number;
    section(): Section;
    mediaText(): string;
    rawLocation(): SDK.CSSModel.CSSLocation | null;
    minWidthExpression(): SDK.CSSMedia.CSSMediaQueryExpression | null;
    maxWidthExpression(): SDK.CSSMedia.CSSMediaQueryExpression | null;
    minWidthValue(zoomFactor: number): number;
    maxWidthValue(zoomFactor: number): number;
    active(): boolean;
}
