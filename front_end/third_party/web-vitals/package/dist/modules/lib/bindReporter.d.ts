import { MetricType, MetricRatingThresholds } from '../types.js';
export declare const bindReporter: <MetricName extends MetricType["name"]>(callback: (metric: Extract<MetricType, {
    name: MetricName;
}>) => void, metric: Extract<MetricType, {
    name: MetricName;
}>, thresholds: MetricRatingThresholds, reportAllChanges?: boolean) => (forceReport?: boolean) => void;
