declare type EventType = string | symbol;
declare type Handler<T = any> = (event?: T) => void;
declare type WildcardHandler = (type: EventType, event?: any) => void;
declare type EventHandlerList = Array<Handler>;
declare type WildCardEventHandlerList = Array<WildcardHandler>;
declare type EventHandlerMap = Map<EventType, EventHandlerList | WildCardEventHandlerList>;
interface Emitter {
    all: EventHandlerMap;
    on<T = any>(type: EventType, handler: Handler<T>): void;
    on(type: '*', handler: WildcardHandler): void;
    off<T = any>(type: EventType, handler: Handler<T>): void;
    off(type: '*', handler: WildcardHandler): void;
    emit<T = any>(type: EventType, event?: T): void;
    emit(type: '*', event?: any): void;
}
/**
 * Mitt: Tiny (~200b) functional event emitter / pubsub.
 * @name mitt
 * @returns {Mitt}
 */
declare function mitt(all?: EventHandlerMap): Emitter;

export { Emitter, EventHandlerList, EventHandlerMap, EventType, Handler, WildCardEventHandlerList, WildcardHandler, mitt as default };
