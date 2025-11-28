import '../../ui/components/icon_button/icon_button.js';
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    compact?: boolean;
    errors: number;
    warnings: number;
    issues: number;
    showIssuesHandler: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare class WarningErrorCounterWidget extends UI.Widget.Widget {
    private readonly setVisibility;
    private readonly view;
    private readonly throttler;
    updatingForTest?: boolean;
    private compact?;
    static instanceForTest: WarningErrorCounterWidget | null;
    constructor(element: HTMLElement, setVisibility: (visible: boolean) => void, view?: View);
    onSetCompactLayout(event: Common.EventTarget.EventTargetEvent<boolean>): void;
    setCompactLayout(enable: boolean): void;
    private updatedForTest;
    private update;
    get titlesForTesting(): string | null;
    private showIssues;
    performUpdate(): Promise<void>;
}
export declare class WarningErrorCounter implements UI.Toolbar.Provider {
    private readonly toolbarItem;
    private constructor();
    item(): UI.Toolbar.ToolbarItem | null;
    static instance(opts?: {
        forceNew: boolean | null;
    }): WarningErrorCounter;
}
export {};
