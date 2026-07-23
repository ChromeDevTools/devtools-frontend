export declare class LCPEntryManager {
    _onBeforeProcessingEntry?: (entry: LargestContentfulPaint) => void;
    _softNavigationEntryMap?: Map<number, PerformanceSoftNavigation>;
    _processEntry(entry: LargestContentfulPaint): void;
}
