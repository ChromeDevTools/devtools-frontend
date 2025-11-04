import '../../ui/components/panel_feedback/panel_feedback.js';
import '../../ui/components/panel_introduction_steps/panel_introduction_steps.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    onStartCapture: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare class CSSOverviewStartView extends UI.Widget.Widget {
    #private;
    onStartCapture: () => void;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
}
export {};
