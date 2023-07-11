import { CommonDataTypes, Script } from '../../../protocol/protocol.js';
import type { IEventManager } from '../events/EventManager.js';
import type { Realm } from './realm.js';
import Handle = CommonDataTypes.Handle;
/**
 * Used to send messages from realm to BiDi user.
 */
export declare class ChannelProxy {
    #private;
    constructor(channel: Script.ChannelProperties);
    /**
     * Creates a channel proxy in the given realm, initialises listener and
     * returns a handle to `sendMessage` delegate.
     */
    init(realm: Realm, eventManager: IEventManager): Promise<Handle>;
    /** Gets a ChannelProxy from window and returns its handle. */
    startListenerFromWindow(realm: Realm, eventManager: IEventManager): Promise<void>;
    /**
     * String to be evaluated to create a ProxyChannel and put it to window.
     * Returns the delegate `sendMessage`. Used to provide an argument for preload
     * script. Does the following:
     * 1. Creates a ChannelProxy.
     * 2. Puts the ChannelProxy to window['${this.#id}'] or resolves the promise
     *    by calling delegate stored in window['${this.#id}'].
     *    This is needed because `#getHandleFromWindow` can be called before or
     *    after this method.
     * 3. Returns the delegate `sendMessage` of the created ChannelProxy.
     */
    getEvalInWindowStr(): string;
}
