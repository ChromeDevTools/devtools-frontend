export * from './types/base.js';
export * from './types/cls.js';
export * from './types/fcp.js';
export * from './types/inp.js';
export * from './types/lcp.js';
export * from './types/ttfb.js';
interface PerformanceEntryMap {
    'event': PerformanceEventTiming;
    'interaction-contentful-paint': InteractionContentfulPaint;
    'layout-shift': LayoutShift;
    'navigation': PerformanceNavigationTiming;
    'paint': PerformancePaintTiming;
    'resource': PerformanceResourceTiming;
    'soft-navigation': PerformanceSoftNavigation;
}
declare global {
    interface Document {
        prerendering?: boolean;
        wasDiscarded?: boolean;
    }
    interface Performance {
        getEntriesByType<K extends keyof PerformanceEntryMap>(type: K): PerformanceEntryMap[K][];
    }
    interface PerformanceEntry {
        navigationId?: number;
    }
    interface PerformanceObserverInit {
        durationThreshold?: number;
    }
    interface PerformanceNavigationTiming extends PerformanceEntry {
        activationStart?: number;
    }
    interface PerformanceEventTiming extends PerformanceEntry {
        duration: DOMHighResTimeStamp;
        readonly interactionId: number;
        readonly targetSelector: string;
    }
    interface LayoutShiftAttribution {
        node: Node | null;
        previousRect: DOMRectReadOnly;
        currentRect: DOMRectReadOnly;
    }
    interface LayoutShift extends PerformanceEntry {
        value: number;
        sources: LayoutShiftAttribution[];
        hadRecentInput: boolean;
    }
    interface LargestContentfulPaint extends PerformanceEntry {
        readonly renderTime: DOMHighResTimeStamp;
        readonly loadTime: DOMHighResTimeStamp;
        readonly size: number;
        readonly id: string;
        readonly url: string;
        readonly element: Element | null;
    }
    interface InteractionContentfulPaint extends PerformanceEntry {
        readonly interactionId: number;
        readonly largestContentfulPaint?: LargestContentfulPaint;
    }
    interface PerformanceSoftNavigation extends PerformanceEntry {
        readonly interactionId: number;
        readonly navigationType?: NavigationType;
        readonly paintTime?: number;
        readonly presentationTime?: number;
        readonly getLargestInteractionContentfulPaint?: () => InteractionContentfulPaint | null;
    }
    var PerformanceSoftNavigation: {
        prototype: PerformanceSoftNavigation;
    };
    export type ScriptInvokerType = 'classic-script' | 'module-script' | 'event-listener' | 'user-callback' | 'resolve-promise' | 'reject-promise';
    export type ScriptWindowAttribution = 'self' | 'descendant' | 'ancestor' | 'same-page' | 'other';
    interface PerformanceScriptTiming extends PerformanceEntry {
        readonly startTime: DOMHighResTimeStamp;
        readonly duration: DOMHighResTimeStamp;
        readonly name: string;
        readonly entryType: string;
        readonly invokerType: ScriptInvokerType;
        readonly invoker: string;
        readonly executionStart: DOMHighResTimeStamp;
        readonly sourceURL: string;
        readonly sourceFunctionName: string;
        readonly sourceCharPosition: number;
        readonly pauseDuration: DOMHighResTimeStamp;
        readonly forcedStyleAndLayoutDuration: DOMHighResTimeStamp;
        readonly window?: Window;
        readonly windowAttribution: ScriptWindowAttribution;
    }
    interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
        readonly startTime: DOMHighResTimeStamp;
        readonly duration: DOMHighResTimeStamp;
        readonly name: string;
        readonly entryType: string;
        readonly renderStart: DOMHighResTimeStamp;
        readonly styleAndLayoutStart: DOMHighResTimeStamp;
        readonly blockingDuration: DOMHighResTimeStamp;
        readonly firstUIEventTimestamp: DOMHighResTimeStamp;
        readonly scripts: PerformanceScriptTiming[];
    }
}
