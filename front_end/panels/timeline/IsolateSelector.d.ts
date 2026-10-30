import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class IsolateSelector extends UI.Toolbar.ToolbarComboBox implements SDK.IsolateManager.Observer {
    #private;
    readonly itemByIsolate: Map<SDK.IsolateManager.Isolate, HTMLOptionElement>;
    constructor(targetManager: SDK.TargetManager.TargetManager, isolateManager: SDK.IsolateManager.IsolateManager);
    isolateAdded(isolate: SDK.IsolateManager.Isolate): void;
    isolateRemoved(isolate: SDK.IsolateManager.Isolate): void;
    isolateChanged(isolate: SDK.IsolateManager.Isolate): void;
    targetChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void;
}
