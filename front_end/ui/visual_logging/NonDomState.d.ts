import type { Loggable } from './Loggable.js';
import type { LoggingConfig } from './LoggingConfig.js';
interface LoggableRegistration {
    loggable: Loggable;
    config: LoggingConfig;
    parent?: Loggable;
    size?: DOMRect;
}
export declare function registerLoggable(loggable: Loggable, config: LoggingConfig, parent?: Loggable, size?: DOMRect): void;
export declare function hasNonDomLoggables(parent?: Loggable): boolean;
export declare function getNonDomLoggables(parent?: Loggable): LoggableRegistration[];
export declare function unregisterLoggables(parent?: Loggable): void;
export declare function unregisterAllLoggables(): void;
export {};
