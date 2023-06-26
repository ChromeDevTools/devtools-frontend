import { CommonDataTypes, Script } from '../../../protocol/protocol.js';
import type { IEventManager } from '../events/EventManager.js';
import type { Realm } from './realm.js';
/**
 * Used to send messages from realm to BiDi user.
 * After initialization, use `sendMessageHandle` to get a handle to the delegate
 * in the realm, which can be used to send message.
 */
export declare class ChannelProxy {
    #private;
    private constructor();
    static init(channel: Script.ChannelProperties, eventManager: IEventManager, realm: Realm): Promise<ChannelProxy>;
    /**
     * Returns a handle to the delegate sending message.
     */
    get sendMessageHandle(): CommonDataTypes.Handle;
    initChannelListener(): Promise<void>;
}
