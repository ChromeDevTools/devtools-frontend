import { MetricType } from '../types.js';
export declare const initMetric: <MetricName extends MetricType["name"]>(name: MetricName, value?: number) => {
    name: MetricName;
    value: number;
    rating: "good";
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
    navigationType: "reload" | "navigate" | "prerender" | "back-forward" | "back-forward-cache" | "restore";
};
