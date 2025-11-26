import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { HeapTimelineOverview, type IdsRangeChangedEvent } from './HeapTimelineOverview.js';
import type { Formatter, ProfileDataGridNode } from './ProfileDataGrid.js';
import { ProfileFlameChartDataProvider } from './ProfileFlameChartDataProvider.js';
import { type ProfileHeader, ProfileType } from './ProfileHeader.js';
import { ProfileView, WritableProfileHeader } from './ProfileView.js';
export declare class HeapProfileView extends ProfileView implements UI.SearchableView.Searchable {
    profileHeader: SamplingHeapProfileHeader;
    readonly profileType: SamplingHeapProfileTypeBase;
    adjustedTotal: number;
    readonly selectedSizeText: UI.Toolbar.ToolbarText;
    timestamps: number[];
    sizes: number[];
    max: number[];
    ordinals: number[];
    totalTime: number;
    lastOrdinal: number;
    readonly timelineOverview: HeapTimelineOverview;
    constructor(profileHeader: SamplingHeapProfileHeader);
    toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]>;
    onIdsRangeChanged(event: Common.EventTarget.EventTargetEvent<IdsRangeChangedEvent>): void;
    setSelectionRange(minId: number, maxId: number): void;
    onStatsUpdate(event: Common.EventTarget.EventTargetEvent<Protocol.HeapProfiler.SamplingHeapProfile | null>): void;
    columnHeader(columnId: string): Common.UIString.LocalizedString;
    createFlameChartDataProvider(): ProfileFlameChartDataProvider;
}
declare const SamplingHeapProfileTypeBase_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<SamplingHeapProfileType.EventTypes>;
    addEventListener<T extends keyof SamplingHeapProfileType.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<SamplingHeapProfileType.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<SamplingHeapProfileType.EventTypes, T>;
    once<T extends keyof SamplingHeapProfileType.EventTypes>(eventType: T): Promise<SamplingHeapProfileType.EventTypes[T]>;
    removeEventListener<T extends keyof SamplingHeapProfileType.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<SamplingHeapProfileType.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof SamplingHeapProfileType.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof SamplingHeapProfileType.EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<SamplingHeapProfileType.EventTypes, T>): void;
}) & typeof ProfileType;
export declare class SamplingHeapProfileTypeBase extends SamplingHeapProfileTypeBase_base {
    recording: boolean;
    clearedDuringRecording: boolean;
    constructor(typeId: string, description: string);
    profileBeingRecorded(): SamplingHeapProfileHeader | null;
    typeName(): string;
    fileExtension(): string;
    get buttonTooltip(): Common.UIString.LocalizedString;
    buttonClicked(): boolean;
    startRecordingProfile(): Promise<void>;
    stopRecordingProfile(): Promise<void>;
    createProfileLoadedFromFile(title: string): ProfileHeader;
    profileBeingRecordedRemoved(): void;
    startSampling(): void;
    stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile>;
}
export declare class SamplingHeapProfileType extends SamplingHeapProfileTypeBase {
    updateTimer: number;
    updateIntervalMs: number;
    constructor();
    static get instance(): SamplingHeapProfileType;
    get treeItemTitle(): Common.UIString.LocalizedString;
    get description(): string;
    hasTemporaryView(): boolean;
    startSampling(): void;
    obtainRecordingProfile(): SDK.HeapProfilerModel.HeapProfilerModel | null;
    stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile>;
    updateStats(): Promise<void>;
    static readonly TypeId = "SamplingHeap";
}
export declare namespace SamplingHeapProfileType {
    const enum Events {
        RECORDING_STOPPED = "RecordingStopped",
        STATS_UPDATE = "StatsUpdate"
    }
    interface EventTypes {
        [Events.RECORDING_STOPPED]: void;
        [Events.STATS_UPDATE]: Protocol.HeapProfiler.SamplingHeapProfile | null;
    }
}
export declare class SamplingHeapProfileHeader extends WritableProfileHeader {
    readonly heapProfilerModelInternal: SDK.HeapProfilerModel.HeapProfilerModel | null;
    protocolProfileInternal: {
        head: {
            callFrame: {
                functionName: string;
                scriptId: Protocol.Runtime.ScriptId;
                url: string;
                lineNumber: number;
                columnNumber: number;
            };
            children: never[];
            selfSize: number;
            id: number;
        };
        samples: never[];
        startTime: number;
        endTime: number;
        nodes: never[];
    };
    constructor(heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel | null, type: SamplingHeapProfileTypeBase, title?: string);
    createView(): HeapProfileView;
    protocolProfile(): Protocol.HeapProfiler.SamplingHeapProfile;
    heapProfilerModel(): SDK.HeapProfilerModel.HeapProfilerModel | null;
    profileType(): SamplingHeapProfileTypeBase;
}
export declare class SamplingHeapProfileNode extends CPUProfile.ProfileTreeModel.ProfileNode {
    self: number;
    constructor(node: Protocol.HeapProfiler.SamplingHeapProfileNode);
}
export declare class SamplingHeapProfileModel extends CPUProfile.ProfileTreeModel.ProfileTreeModel {
    modules: any;
    constructor(profile: Protocol.HeapProfiler.SamplingHeapProfile, minOrdinal?: number, maxOrdinal?: number);
}
export declare class NodeFormatter implements Formatter {
    readonly profileView: HeapProfileView;
    constructor(profileView: HeapProfileView);
    formatValue(value: number): string;
    formatValueAccessibleText(value: number): string;
    formatPercent(value: number, _node: ProfileDataGridNode): string;
    linkifyNode(node: ProfileDataGridNode): Element | null;
}
export declare class HeapFlameChartDataProvider extends ProfileFlameChartDataProvider {
    readonly profile: CPUProfile.ProfileTreeModel.ProfileTreeModel;
    readonly heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel | null;
    constructor(profile: CPUProfile.ProfileTreeModel.ProfileTreeModel, heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel | null);
    minimumBoundary(): number;
    totalTime(): number;
    entryHasDeoptReason(_entryIndex: number): boolean;
    formatValue(value: number, _precision?: number): string;
    calculateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    preparePopoverElement(entryIndex: number): Element | null;
}
export {};
