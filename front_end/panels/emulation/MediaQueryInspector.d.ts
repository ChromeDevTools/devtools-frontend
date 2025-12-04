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
export declare const DEFAULT_VIEW: (input: ViewInput, _output: object, target: HTMLElement) => void;
export declare class MediaQueryInspector extends UI.Widget.Widget implements SDK.TargetManager.SDKModelObserver<SDK.CSSModel.CSSModel> {
    private readonly view;
    private readonly mediaThrottler;
    private readonly getWidthCallback;
    private readonly setWidthCallback;
    private scale;
    private cssModel?;
    private cachedQueryModels?;
    constructor(getWidthCallback: () => number, setWidthCallback: (arg0: number) => void, mediaThrottler: Common.Throttler.Throttler, view?: (input: ViewInput, _output: object, target: HTMLElement) => void);
    modelAdded(cssModel: SDK.CSSModel.CSSModel): void;
    modelRemoved(cssModel: SDK.CSSModel.CSSModel): void;
    setAxisTransform(scale: number): void;
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
