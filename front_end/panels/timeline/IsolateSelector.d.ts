import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class IsolateSelector extends UI.Toolbar.ToolbarItem implements SDK.IsolateManager.Observer {
    #private;
    menu: Menus.SelectMenu.SelectMenu;
    options?: Array<{
        index: number;
        isolate: SDK.IsolateManager.Isolate;
    }>;
    items?: Menus.Menu.MenuItem[];
    readonly itemByIsolate: Map<SDK.IsolateManager.Isolate, Menus.Menu.MenuItem>;
    constructor();
    isolateAdded(isolate: SDK.IsolateManager.Isolate): void;
    isolateRemoved(isolate: SDK.IsolateManager.Isolate): void;
    isolateChanged(isolate: SDK.IsolateManager.Isolate): void;
    targetChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void;
}
