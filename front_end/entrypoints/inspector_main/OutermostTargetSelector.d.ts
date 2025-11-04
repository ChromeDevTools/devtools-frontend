import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class OutermostTargetSelector implements SDK.TargetManager.Observer, UI.SoftDropDown.Delegate<SDK.Target.Target>, UI.Toolbar.Provider {
    #private;
    readonly listItems: UI.ListModel.ListModel<SDK.Target.Target>;
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): OutermostTargetSelector;
    item(): UI.Toolbar.ToolbarItem;
    highlightedItemChanged(_from: SDK.Target.Target | null, _to: SDK.Target.Target | null, fromElement: Element | null, toElement: Element | null): void;
    titleFor(target: SDK.Target.Target): string;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    createElementForItem(item: SDK.Target.Target): Element;
    isItemSelectable(_item: SDK.Target.Target): boolean;
    itemSelected(item: SDK.Target.Target | null): void;
}
