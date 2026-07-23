export declare const getVisibilityWatcher: (reset?: boolean) => {
    readonly firstHiddenTime: number;
    onHidden(cb: () => void): void;
};
