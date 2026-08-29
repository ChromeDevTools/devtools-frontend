import type { MetricType } from '../types.js';
export declare const initMetric: <MetricName extends MetricType['name']>(name: MetricName, value?: number, navigationType?: MetricType['navigationType'], navigationId?: number, navigationInteractionId?: number, navigationURL?: string, navigationStartTime?: number) => {
    name: MetricName;
    value: number;
    rating: 'good';
    delta: number;
    entries: (Extract<import("../types.js").CLSMetric, {
        name: MetricName;
    }> | Extract<import("../types.js").FCPMetric, {
        name: MetricName;
    }> | Extract<import("../types.js").INPMetric, {
        name: MetricName;
    }> | Extract<import("../types.js").LCPMetric, {
        name: MetricName;
    }> | Extract<import("../types.js").TTFBMetric, {
        name: MetricName;
    }>)["entries"];
    id: string;
    navigationType: "back-forward" | "back-forward-cache" | "navigate" | "prerender" | "reload" | "restore" | "soft-navigation";
    navigationId: number;
    navigationInteractionId: number | undefined;
    navigationURL: string | undefined;
    navigationStartTime: number;
};
