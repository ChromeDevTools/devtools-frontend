import * as Common from '../../core/common/common.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const HotColorScheme: string[];
export declare const ColdColorScheme: string[];
interface EventHandlers {
    setLive: (arg0: number) => number;
    setComplete: (arg0: number) => void;
    updateMaxTime: (arg0: number) => void;
}
export interface EventProperties {
    level: number;
    startTime: number;
    duration?: number;
    name: string;
    color?: string;
}
/**
 * Wrapper class for each event displayed on the timeline.
 */
export declare class Event {
    #private;
    private timelineData;
    private setLive;
    private readonly setComplete;
    private readonly updateMaxTime;
    private selfIndex;
    title: string;
    constructor(timelineData: PerfUI.FlameChart.FlameChartTimelineData, eventHandlers: EventHandlers, eventProperties?: EventProperties | undefined);
    /**
     * Render hovertext into the |htmlElement|
     */
    decorate(htmlElement: HTMLElement): void;
    /**
     * set an event to be "live" where it's ended time is always the chart maximum
     * or to be a fixed time.
     * @param time
     */
    set endTime(time: number);
    get id(): number;
    set level(level: number);
    set color(color: string);
    get color(): string;
    get fontColor(): string;
    get startTime(): number;
    get duration(): number;
    get live(): boolean;
}
export declare class TickingFlameChart extends UI.Widget.VBox {
    #private;
    private intervalTimer;
    private lastTimestamp;
    private ticking;
    private isShown;
    private readonly bounds;
    private readonly dataProvider;
    private readonly delegate;
    private readonly chartGroupExpansionSetting;
    private readonly chart;
    private stoppedPermanently?;
    constructor();
    /**
     * Add a marker with |properties| at |time|.
     */
    addMarker(properties: EventProperties): void;
    /**
     * Create an event which will be set to live by default.
     */
    startEvent(properties: EventProperties): Event;
    /**
     * Add a group with |name| that can contain |depth| different tracks.
     */
    addGroup(name: Common.UIString.LocalizedString, depth: number): void;
    private updateMaxTime;
    private onScroll;
    willHide(): void;
    wasShown(): void;
    set canTick(allowed: boolean);
    private start;
    private stop;
    private updateRender;
}
export {};
