export declare const getVisibilityWatcher: () => {
    readonly firstHiddenTime: number;
    onHidden(cb: () => void): void;
};
