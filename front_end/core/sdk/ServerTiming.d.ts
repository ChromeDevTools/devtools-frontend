import type { NameValue } from './NetworkRequest.js';
/**
 * Represents an authored single server timing metric. https://w3c.github.io/server-timing/#the-server-timing-header-field
 */
export interface ServerTimingMetric {
    /** The name of the metric, a single token */
    name: string;
    /** A human-readable description of the metric. */
    desc?: string;
    /** The duration; milliseconds is recommended. https://w3c.github.io/server-timing/#duration-attribute. */
    dur?: number;
}
export declare const cloudflarePrefix = "(cf) ";
export declare const cloudinaryPrefix = "(cld) ";
export declare class ServerTiming {
    metric: string;
    value: number | null;
    description: string | null;
    constructor(metric: string, value: number | null, description: string | null);
    static parseHeaders(headers: NameValue[]): ServerTiming[] | null;
    static createFromHeaderValue(valueString: string): ServerTimingMetric[];
    static getParserForParameter(paramName: string): ((arg0: ServerTimingMetric, arg1: string | null) => void) | null;
    static showWarning(msg: string): void;
}
