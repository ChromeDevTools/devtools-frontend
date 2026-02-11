import { Overlay, type ResetData } from './common.js';
import { ResizerType } from './drag_resize_handler.js';
import { type ContainerQueryHighlight } from './highlight_container_query.js';
import { type FlexContainerHighlight } from './highlight_flex_common.js';
import { type GridHighlight } from './highlight_grid_common.js';
import { type IsolatedElementHighlight } from './highlight_isolated_element.js';
import { type ScrollSnapHighlight } from './highlight_scroll_snap.js';
import type { GreenDevAnchorsHighlight, GreenDevAnchorsOverlay } from './tool_green_dev_anchors.js';
export interface PersistentToolMessage {
    highlightType: string;
    highlightIndex: number;
    newWidth: string;
    newHeight: string;
    resizerType: ResizerType;
}
interface DraggableMetadata {
    type: ResizerType;
    highlightIndex: number;
    initialWidth?: number;
    initialHeight?: number;
}
export declare class PersistentOverlay extends Overlay {
    private gridLabelState;
    private gridLabels;
    private draggableBorders;
    private dragHandler?;
    private greenDevAnchorsOverlay?;
    setGreenDevAnchorsOverlay(greenDevAnchorsOverlay: GreenDevAnchorsOverlay): void;
    reset(data: ResetData): void;
    renderGridMarkup(): void;
    install(): void;
    uninstall(): void;
    drawGridHighlight(highlight: GridHighlight): void;
    drawFlexContainerHighlight(highlight: FlexContainerHighlight): void;
    drawScrollSnapHighlight(highlight: ScrollSnapHighlight): void;
    drawContainerQueryHighlight(highlight: ContainerQueryHighlight): void;
    drawGreenDevFloatyAnchors(highlights: GreenDevAnchorsHighlight[]): void;
    drawIsolatedElementHighlight(highlight: IsolatedElementHighlight): void;
    isPointInDraggablePath(x: number, y: number): DraggableMetadata | undefined;
}
export {};
