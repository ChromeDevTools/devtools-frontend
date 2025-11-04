import type * as Protocol from '../../generated/protocol.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    rootLayer: Protocol.CSS.CSSLayerData;
}
interface ViewOutput {
    treeOutline: TreeOutline.TreeOutline.TreeOutline<string> | undefined;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class LayersWidget extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    wasShown(): void;
    wasHidden(): void;
    performUpdate(): Promise<void>;
    revealLayer(layerName: string): Promise<void>;
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): LayersWidget;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    private readonly button;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ButtonProvider;
    private clicked;
    item(): UI.Toolbar.ToolbarToggle;
}
export {};
