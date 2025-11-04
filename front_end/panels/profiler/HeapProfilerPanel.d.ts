import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ProfilesPanel } from './ProfilesPanel.js';
export declare class HeapProfilerPanel extends ProfilesPanel implements UI.ContextMenu.Provider<SDK.RemoteObject.RemoteObject>, UI.ActionRegistration.ActionDelegate {
    constructor();
    static instance(): HeapProfilerPanel;
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, object: SDK.RemoteObject.RemoteObject): void;
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
    wasShown(): void;
    willHide(): void;
    showObject(snapshotObjectId: string, perspectiveName: string): void;
}
