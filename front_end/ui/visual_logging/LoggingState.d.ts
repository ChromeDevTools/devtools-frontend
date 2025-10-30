import type { Loggable } from './Loggable.js';
import { type LoggingConfig } from './LoggingConfig.js';
export interface LoggingState {
    impressionLogged: boolean;
    processed: boolean;
    config: LoggingConfig;
    veid: number;
    parent: LoggingState | null;
    processedForDebugging?: boolean;
    size: DOMRect;
    selectOpen?: boolean;
    pendingChangeContext?: string;
}
export declare function getOrCreateLoggingState(loggable: Loggable, config: LoggingConfig, parent?: Loggable): LoggingState;
export declare function getLoggingState(loggable: Loggable): LoggingState | null;
type ParentProvider = (e: Element) => Element | undefined;
export declare function registerParentProvider(name: string, provider: ParentProvider): void;
/** MUST NOT BE EXPORTED */
declare const PARENT: unique symbol;
type ElementWithParent = Element & {
    [PARENT]?: Element;
};
export declare function setMappedParent(element: ElementWithParent, parent: Element): void;
export {};
