import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type * as CPUProfile from '../../../../models/cpu_profile/cpu_profile.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
export declare class Performance {
    private readonly helper;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): Performance;
    reset(): void;
    private appendLegacyCPUProfile;
    appendCPUProfile(profile: CPUProfile.CPUProfileDataModel.CPUProfileDataModel, target: SDK.Target.Target | null): void;
}
export declare class Memory {
    private readonly helper;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): Memory;
    reset(): void;
    appendHeapProfile(profile: Protocol.HeapProfiler.SamplingHeapProfile, target: SDK.Target.Target | null): void;
}
export declare class Helper {
    private readonly type;
    private readonly locationPool;
    private updateTimer;
    /**
     * Given a location in a script (with line and column numbers being 1-based) stores
     * the time spent at that location in a performance profile.
     */
    private locationData;
    constructor(type: Workspace.UISourceCode.DecoratorType);
    reset(): void;
    /**
     * Stores the time taken running a given script location (line and column)
     */
    addLocationData(target: SDK.Target.Target | null, scriptIdOrUrl: Platform.DevToolsPath.UrlString | number, { line, column }: {
        line: number;
        column: number;
    }, data: number): void;
    scheduleUpdate(): void;
    private doUpdate;
}
