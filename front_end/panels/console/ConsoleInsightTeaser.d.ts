import '../../ui/components/tooltips/tooltips.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ConsoleViewMessage } from './ConsoleViewMessage.js';
declare const enum State {
    READY = "ready",
    GENERATING = "generating",// Before receiving first chunk
    PARTIAL_TEASER = "partial-teaser",// After receiving first chunk
    TEASER = "teaser",
    ERROR = "error"
}
interface ViewInput {
    onTellMeMoreClick: (event: Event) => void;
    uuid: string;
    headerText: string;
    mainText: string;
    isInactive: boolean;
    dontShowChanged: (e: Event) => void;
    hasTellMeMoreButton: boolean;
    isSlowGeneration: boolean;
    state: State;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class ConsoleInsightTeaser extends UI.Widget.Widget {
    #private;
    constructor(uuid: string, consoleViewMessage: ConsoleViewMessage, element?: HTMLElement, view?: View);
    maybeGenerateTeaser(): void;
    abortTeaserGeneration(): void;
    setInactive(isInactive: boolean): void;
    performUpdate(): Promise<void> | void;
    wasShown(): void;
    willHide(): void;
}
export {};
