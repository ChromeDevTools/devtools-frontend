import type * as SDK from '../core/sdk/sdk.js';
import type { ProtocolMapping } from '../generated/protocol-mapping.js';
export declare function dispatchEvent<E extends keyof ProtocolMapping.Events>(target: SDK.Target.Target, eventName: E, ...payload: ProtocolMapping.Events[E]): void;
/**
 * @deprecated use `describeWithEnvironment` instead. They are near equivalent.
 * `describeWithMockConnection` cleans up DOM and waits one more animation frame
 */
export declare function describeWithMockConnection(title: string, fn: (this: Mocha.Suite) => void): Mocha.Suite;
export declare namespace describeWithMockConnection {
    var only: (title: string, fn: (this: Mocha.Suite) => void, opts?: {
        reset: boolean;
    }) => Mocha.Suite;
}
