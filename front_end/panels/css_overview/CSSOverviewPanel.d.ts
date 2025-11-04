import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type OverviewData } from './CSSOverviewCompletedView.js';
interface ViewInput {
    state: 'start' | 'processing' | 'completed';
    onStartCapture: () => void;
    onCancel: () => void;
    onReset: () => void;
    overviewData: OverviewData;
    target?: SDK.Target.Target;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSOverviewPanel extends UI.Panel.Panel implements SDK.TargetManager.Observer {
    #private;
    constructor(view?: View);
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(): void;
    performUpdate(): void;
}
export {};
