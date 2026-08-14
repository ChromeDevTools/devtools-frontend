import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
/**
 * This is a slightly reduced version of `panels/LinearMemoryInspectorPane.LinearMemoryInspectorView.
 *
 * It's not hooked up to the LinearMemoryInspectorController and it operates on a fixed memory array thats
 * known upfront.
 */
declare class LinearMemoryInspectorView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement);
    wasShown(): void;
    setMemory(memory: Uint8Array<ArrayBuffer>): void;
    getPositionPercentage(): number;
    setPositionPercentage(percentage: number): void;
    refreshData(): void;
}
/**
 * Adapter for the linear memory inspector that can show a {@link StreamingContentData}.
 */
export declare class StreamingContentHexView extends LinearMemoryInspectorView {
    #private;
    constructor(streamingContentData: TextUtils.StreamingContentData.StreamingContentData, element?: HTMLElement);
    wasShown(): void;
    willHide(): void;
}
export {};
