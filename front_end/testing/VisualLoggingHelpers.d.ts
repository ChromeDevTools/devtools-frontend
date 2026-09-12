import * as VisualLogging from '../ui/visual_logging/visual_logging-testing.js';
export declare function getVeId(loggable: VisualLogging.Loggable.Loggable | string): number;
/**
 * Returns the 32-bit integer hash generated for a visual logging string identifier.
 */
export declare function getVeHash(context: string): Promise<number>;
