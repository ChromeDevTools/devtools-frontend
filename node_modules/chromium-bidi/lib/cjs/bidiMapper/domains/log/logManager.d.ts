import { IEventManager } from '../events/EventManager.js';
import { RealmStorage } from '../script/realmStorage.js';
import { CdpTarget } from '../context/cdpTarget';
export declare class LogManager {
    #private;
    private constructor();
    static create(cdpTarget: CdpTarget, realmStorage: RealmStorage, eventManager: IEventManager): LogManager;
}
