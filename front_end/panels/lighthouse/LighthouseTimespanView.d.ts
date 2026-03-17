import * as UI from '../../ui/legacy/legacy.js';
import type { LighthousePanel } from './LighthousePanel.js';
export declare class TimespanView extends UI.Dialog.Dialog {
    private panel;
    private statusHeader;
    private contentContainer;
    private endButton;
    constructor(panel: LighthousePanel);
    show(dialogRenderElement: Element): void;
    reset(): void;
    ready(): void;
    render(): void;
    private endTimespan;
    private cancel;
}
