import '../../ui/components/tooltips/tooltips.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ConsoleViewMessage } from './ConsoleViewMessage.js';
interface ViewInput {
    onTellMeMoreClick: (event: Event) => void;
    uuid: string;
    headerText: string;
    mainText: string;
    isInactive: boolean;
    dontShowChanged: (e: Event) => void;
    hasTellMeMoreButton: boolean;
    isSlowGeneration: boolean;
    isError: boolean;
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
