import type * as SDK from '../core/sdk/sdk.js';
import type { ProtocolMapping } from '../generated/protocol-mapping.js';
export declare function dispatchEvent<E extends keyof ProtocolMapping.Events>(target: SDK.Target.Target, eventName: E, ...payload: ProtocolMapping.Events[E]): void;
