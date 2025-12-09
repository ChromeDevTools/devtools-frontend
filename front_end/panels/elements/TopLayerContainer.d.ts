import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ElementsTreeOutline } from './ElementsTreeOutline.js';
export declare class TopLayerContainer extends UI.TreeOutline.TreeElement {
    tree: ElementsTreeOutline;
    document: SDK.DOMModel.DOMDocument;
    constructor(tree: ElementsTreeOutline, document: SDK.DOMModel.DOMDocument);
    topLayerElementsChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.EventTypes['TopLayerElementsChanged']>): void;
    revealInTopLayer(node: SDK.DOMModel.DOMNode): void;
}
