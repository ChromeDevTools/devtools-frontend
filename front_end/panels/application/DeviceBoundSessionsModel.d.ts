import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
interface EventWithTimestamp {
    event: Protocol.Network.DeviceBoundSessionEventOccurredEvent;
    timestamp: Date;
}
export interface SessionAndEvents {
    session?: Protocol.Network.DeviceBoundSession;
    eventsById: Map<string, EventWithTimestamp>;
}
export declare class DeviceBoundSessionsModel extends Common.ObjectWrapper.ObjectWrapper<DeviceBoundSessionModelEventTypes> implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
    #private;
    constructor();
    modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void;
    modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void;
    addVisibleSite(site: string): void;
    clearVisibleSites(): void;
    clearEvents(): void;
    isSiteVisible(site: string): boolean;
    getSession(site: string, sessionId?: string): SessionAndEvents | undefined;
    getPreserveLogSetting(): Common.Settings.Setting<boolean>;
}
export declare const enum DeviceBoundSessionModelEvents {
    INITIALIZE_SESSIONS = "INITIALIZE_SESSIONS",
    ADD_VISIBLE_SITE = "ADD_VISIBLE_SITE",
    CLEAR_VISIBLE_SITES = "CLEAR_VISIBLE_SITES",
    EVENT_OCCURRED = "EVENT_OCCURRED",
    CLEAR_EVENTS = "CLEAR_EVENTS"
}
export interface DeviceBoundSessionModelEventTypes {
    [DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS]: {
        sessions: Protocol.Network.DeviceBoundSession[];
    };
    [DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE]: {
        site: string;
    };
    [DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES]: void;
    [DeviceBoundSessionModelEvents.EVENT_OCCURRED]: {
        site: string;
        sessionId?: string;
    };
    [DeviceBoundSessionModelEvents.CLEAR_EVENTS]: {
        emptySessions: Map<string, Array<string | undefined>>;
        emptySites: Set<string>;
    };
}
export {};
