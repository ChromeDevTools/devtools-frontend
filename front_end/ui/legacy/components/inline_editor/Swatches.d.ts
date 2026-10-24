import '../../../kit/kit.js';
import type { Icon } from '../../../kit/kit.js';
import type { CSSShadowModel } from './CSSShadowEditor.js';
export declare class CSSShadowSwatch extends HTMLElement {
    #private;
    constructor(model?: CSSShadowModel);
    model(): CSSShadowModel;
    get cssShadowModel(): CSSShadowModel;
    set cssShadowModel(model: CSSShadowModel);
    iconElement(): Icon;
}
declare global {
    interface HTMLElementTagNameMap {
        'css-shadow-swatch': CSSShadowSwatch;
    }
}
