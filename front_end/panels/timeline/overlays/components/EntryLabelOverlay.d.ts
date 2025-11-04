import '../../../../ui/components/icon_button/icon_button.js';
import '../../../../ui/components/tooltips/tooltips.js';
import '../../../../ui/components/spinners/spinners.js';
import * as AiAssistanceModels from '../../../../models/ai_assistance/ai_assistance.js';
export declare class EntryLabelRemoveEvent extends Event {
    static readonly eventName = "entrylabelremoveevent";
    constructor();
}
export declare class EntryLabelChangeEvent extends Event {
    newLabel: string;
    static readonly eventName = "entrylabelchangeevent";
    constructor(newLabel: string);
}
export declare class LabelAnnotationsConsentDialogVisibilityChange extends Event {
    isVisible: boolean;
    static readonly eventName = "labelannotationsconsentdialogvisiblitychange";
    constructor(isVisible: boolean);
}
export declare class EntryLabelOverlay extends HTMLElement {
    #private;
    static readonly LABEL_AND_CONNECTOR_SHIFT_LENGTH = 8;
    static readonly LABEL_CONNECTOR_HEIGHT = 7;
    static readonly MAX_LABEL_LENGTH = 100;
    /**
     * The entry label overlay consists of 3 parts - the label part with the label string inside,
     * the line connecting the label to the entry, and a black box around an entry to highlight the entry with a label.
     * ________
     * |_label__|                <-- label part with the label string inside
     *     \
     *      \                   <-- line connecting the label to the entry with a circle at the end
     *       \
     * _______◯_________
     * |_____entry______|         <--- box around an entry
     *
     * `drawLabel` method below draws the first part.
     * `drawConnector` method below draws the second part - the connector line with a circle and the svg container for them.
     * `drawEntryHighlightWrapper` draws the third part.
     * We only rerender the first part if the label changes and the third part if the size of the entry changes.
     * The connector and circle shapes never change so we only draw the second part when the component is created.
     *
     * Otherwise, the entry label overlay object only gets repositioned.
     */
    constructor(label: string, shouldDrawBelowEntry?: boolean);
    /**
     * So we can provide a mocked agent in tests. Do not call this method outside of a test!
     */
    overrideAIAgentForTest(agent: AiAssistanceModels.PerformanceAnnotationsAgent.PerformanceAnnotationsAgent): void;
    entryHighlightWrapper(): HTMLElement | null;
    set entryLabelVisibleHeight(entryLabelVisibleHeight: number);
    setLabelEditabilityAndRemoveEmptyLabel(editable: boolean): void;
    set callTree(callTree: AiAssistanceModels.AICallTree.AICallTree | null);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-entry-label-overlay': EntryLabelOverlay;
    }
}
