import type { Loggable } from './Loggable.js';
import { type LoggingConfig } from './LoggingConfig.js';
import { type LoggingState } from './LoggingState.js';
export declare function setVeDebuggingEnabled(enabled: boolean, inspect?: (query: string) => void): void;
export declare function setHighlightedVe(veKey: string | null): void;
export declare function processForDebugging(loggable: Loggable): void;
type EventType = 'Click' | 'Drag' | 'Hover' | 'Change' | 'KeyDown' | 'Resize' | 'SettingAccess' | 'FunctionCall';
export declare function processEventForDebugging(event: EventType, state: LoggingState | null, extraInfo?: EventAttributes): void;
export declare function processEventForIntuitiveDebugging(event: EventType, state: LoggingState | null, extraInfo?: EventAttributes): void;
export declare function processEventForTestDebugging(event: EventType, state: LoggingState | null, _extraInfo?: EventAttributes): void;
export declare function processEventForAdHocAnalysisDebugging(event: EventType, state: LoggingState | null, extraInfo?: EventAttributes): void;
export interface EventAttributes {
    context?: string;
    width?: number;
    height?: number;
    mouseButton?: number;
    doubleClick?: boolean;
    name?: string;
    numericValue?: number;
    stringValue?: string;
}
type TestLogEntry = {
    impressions: string[];
} | {
    interaction: string;
    veid?: number;
};
export declare function processImpressionsForDebugging(states: LoggingState[]): void;
export declare function debugString(config: LoggingConfig): string;
export declare const enum DebugLoggingFormat {
    INTUITIVE = "Intuitive",
    TEST = "Test",
    AD_HOC_ANALYSIS = "AdHocAnalysis"
}
export declare function setVeDebugLoggingEnabled(enabled: boolean, format?: DebugLoggingFormat): void;
export declare function processStartLoggingForDebugging(): void;
/**
 * Verifies that VE events contains all the expected events in given order.
 * Unexpected VE events are ignored.
 **/
export declare function expectVeEvents(expectedEvents: TestLogEntry[]): Promise<void>;
export {};
