import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ElementsTreeOutline } from './ElementsTreeOutline.js';
export declare class TopLayerContainer extends UI.TreeOutline.TreeElement {
    tree: ElementsTreeOutline;
    document: SDK.DOMModel.DOMDocument;
    currentTopLayerDOMNodes: Set<SDK.DOMModel.DOMNode>;
    topLayerUpdateThrottler: Common.Throttler.Throttler;
    constructor(tree: ElementsTreeOutline, document: SDK.DOMModel.DOMDocument);
    throttledUpdateTopLayerElements(): Promise<void>;
    updateTopLayerElements(): Promise<void>;
    private removeCurrentTopLayerElementsAdorners;
    private addTopLayerAdorner;
}
