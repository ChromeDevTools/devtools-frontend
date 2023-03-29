import { CdpClient } from '../../CdpConnection';
import { IEventManager } from '../events/EventManager';
export declare class NetworkProcessor {
    #private;
    private constructor();
    static create(cdpClient: CdpClient, eventManager: IEventManager): Promise<NetworkProcessor>;
}
