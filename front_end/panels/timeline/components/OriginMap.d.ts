import '../../../ui/kit/kit.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ListItem extends CrUXManager.OriginMapping {
    isTitleRow?: boolean;
}
export declare class OriginMap extends UI.Widget.WidgetElement<UI.Widget.Widget> implements UI.ListWidget.Delegate<ListItem> {
    #private;
    constructor();
    createWidget(): UI.Widget.Widget;
    startCreation(): void;
    renderItem(originMapping: ListItem): Element;
    removeItemRequested(_item: ListItem, index: number): void;
    commitEdit(originMapping: ListItem, editor: UI.ListWidget.Editor<ListItem>, isNew: boolean): void;
    beginEdit(originMapping: ListItem): UI.ListWidget.Editor<ListItem>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-origin-map': OriginMap;
    }
}
export {};
