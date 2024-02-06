import type { CdpTarget } from '../context/CdpTarget.js';
import type { EventManager } from '../session/EventManager.js';
import type { NetworkStorage } from './NetworkStorage.js';
/** Maps 1:1 to CdpTarget. */
export declare class NetworkManager {
    #private;
    private constructor();
    /** Returns the CDP Target associated with this NetworkManager instance. */
    get cdpTarget(): CdpTarget;
    static create(cdpTarget: CdpTarget, eventManager: EventManager, networkStorage: NetworkStorage): NetworkManager;
}
