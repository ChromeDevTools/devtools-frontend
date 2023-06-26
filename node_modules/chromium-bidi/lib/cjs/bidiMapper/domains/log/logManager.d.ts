import type { IEventManager } from '../events/EventManager.js';
import type { RealmStorage } from '../script/realmStorage.js';
import type { CdpTarget } from '../context/cdpTarget.js';
export declare class LogManager {
    #private;
    private constructor();
    static create(cdpTarget: CdpTarget, realmStorage: RealmStorage, eventManager: IEventManager): LogManager;
}
