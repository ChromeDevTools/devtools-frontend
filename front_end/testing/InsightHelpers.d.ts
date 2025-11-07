import * as Trace from '../models/trace/trace.js';
export declare function processTrace(context: Mocha.Suite | Mocha.Context, traceFile: string): Promise<Trace.TraceModel.ParsedTrace & {
    insights: Trace.Insights.Types.TraceInsightSets;
}>;
export declare function createContextForNavigation(data: Trace.Handlers.Types.HandlerData, navigation: Trace.Types.Events.NavigationStart, frameId: string): Trace.Insights.Types.InsightSetContextWithNavigation;
export declare function getInsightSetOrError(insights: Trace.Insights.Types.TraceInsightSets, navigationOrNavigationId?: Trace.Types.Events.NavigationStart | string): Trace.Insights.Types.InsightSet;
export declare function getInsightOrError<InsightName extends keyof Trace.Insights.Types.InsightModels>(insightName: InsightName, insights: Trace.Insights.Types.TraceInsightSets, navigation?: Trace.Types.Events.NavigationStart): Trace.Insights.Types.InsightModels[InsightName];
export declare function getFirstOrError<T>(iterator: IterableIterator<T>): T;
export declare function getFirst<T>(iterator: IterableIterator<T>): T | undefined;
