import { Overlay, type PathCommands, type ResetData } from './common.js';
import { type PathBounds } from './highlight_common.js';
import { type ContainerQueryHighlight } from './highlight_container_query.js';
import { type FlexContainerHighlight, type FlexItemHighlight } from './highlight_flex_common.js';
import { type GridHighlight } from './highlight_grid_common.js';
import type { IsolatedElementHighlight } from './highlight_isolated_element.js';
import type { ScrollSnapHighlight } from './highlight_scroll_snap.js';
type ColorRgba = [number, number, number, number];
interface Path {
    path: PathCommands;
    outlineColor: string;
    fillColor: string;
    name: string;
}
interface ContrastInfo {
    backgroundColor: string;
    backgroundColorUnclampedRgba: ColorRgba;
    backgroundColorCssText: string;
    fontSize: string;
    fontWeight: string;
    contrastAlgorithm: 'apca' | 'aa' | 'aaa';
    textOpacity: number;
}
export interface ElementInfo {
    contrast?: ContrastInfo;
    tagName: string;
    idValue: string;
    className?: string;
    nodeWidth: number;
    nodeHeight: number;
    isLocked: boolean;
    isLockedAncestor: boolean;
    style: Record<string, string | undefined> & {
        'color-unclamped-rgba'?: ColorRgba;
        'background-color-unclamped-rgba'?: ColorRgba;
    };
    showAccessibilityInfo: boolean;
    isKeyboardFocusable: boolean;
    accessibleName: string;
    accessibleRole: string;
    layoutObjectName?: string;
}
interface Highlight {
    paths: Path[];
    showRulers: boolean;
    showExtensionLines: boolean;
    elementInfo: ElementInfo;
    colorFormat: string;
    gridInfo: GridHighlight[];
    flexInfo: FlexContainerHighlight[];
    flexItemInfo: FlexItemHighlight[];
    containerQueryInfo: ContainerQueryHighlight[];
    isolatedElementInfo: IsolatedElementHighlight[];
}
export declare class HighlightOverlay extends Overlay {
    private tooltip;
    private persistentOverlay?;
    private gridLabelState;
    reset(resetData: ResetData): void;
    install(): void;
    uninstall(): void;
    drawHighlight(highlight: Highlight): {
        bounds: PathBounds;
    };
    drawGridHighlight(highlight: GridHighlight): void;
    drawFlexContainerHighlight(highlight: FlexContainerHighlight): void;
    drawScrollSnapHighlight(highlight: ScrollSnapHighlight): void;
    drawContainerQueryHighlight(highlight: ContainerQueryHighlight): void;
    drawIsolatedElementHighlight(highlight: IsolatedElementHighlight): void;
    private drawAxis;
}
/**
 * Create the DOM node that displays the description of the highlighted element
 */
export declare function createElementDescription(elementInfo: ElementInfo, colorFormat: string): Element;
export {};
