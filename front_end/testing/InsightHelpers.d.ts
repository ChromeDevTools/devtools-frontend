import * as Trace from '../models/trace/trace.js';
export declare function processTrace(context: Mocha.Suite | Mocha.Context, traceFile: string): Promise<Trace.TraceModel.ParsedTrace & {
    insights: Trace.Insights.Types.TraceInsightSets;
}>;
/**
 * Replaces the model of a single insight on `insightSet` for the duration of
 * the current test.
 *
 * Parsed traces returned by `TraceLoader.traceEngine` are cached and shared
 * between tests (and, in the Node unit test runner, between test files), so
 * tests must never assign to `insightSet.model.<InsightName>` directly: the
 * fake model would leak into every later test that loads the same trace. This
 * helper installs the fake via sinon, so the global `sinon.restore()` that runs
 * after each test puts the original model back.
 */
export declare function stubInsightModel<InsightName extends keyof Trace.Insights.Types.InsightModels>(insightSet: Trace.Insights.Types.InsightSet, insightName: InsightName, model: Trace.Insights.Types.InsightModels[InsightName]): void;
export declare function createContextForNavigation(data: Trace.Handlers.Types.HandlerData, navigation: Trace.Types.Events.NavigationStart, frameId: string): Trace.Insights.Types.InsightSetContextWithNavigation;
export declare function getInsightSetOrError(insights: Trace.Insights.Types.TraceInsightSets, navigationOrNavigationId?: Trace.Types.Events.NavigationStart | string): Trace.Insights.Types.InsightSet;
export declare function getInsightOrError<InsightName extends keyof Trace.Insights.Types.InsightModels>(insightName: InsightName, insights: Trace.Insights.Types.TraceInsightSets, navigation?: Trace.Types.Events.NavigationStart): NonNullable<Trace.Insights.Types.InsightModels[InsightName]>;
export declare function getFirstOrError<T>(iterator: IterableIterator<T>): T;
export declare function getFirst<T>(iterator: IterableIterator<T>): T | undefined;
