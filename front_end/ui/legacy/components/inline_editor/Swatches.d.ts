import '../../../components/icon_button/icon_button.js';
import type * as IconButton from '../../../components/icon_button/icon_button.js';
import type { CSSShadowModel } from './CSSShadowEditor.js';
export declare class CSSShadowSwatch extends HTMLElement {
    #private;
    constructor(model: CSSShadowModel);
    model(): CSSShadowModel;
    iconElement(): IconButton.Icon.Icon;
}
declare global {
    interface HTMLElementTagNameMap {
        'css-shadow-swatch': CSSShadowSwatch;
    }
}
