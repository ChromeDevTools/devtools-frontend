import '../../ui/legacy/legacy.js';
import '../../ui/components/buttons/buttons.js';
import '../../ui/components/cards/cards.js';
import * as Common from '../../core/common/common.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface WorkspaceSettingsTabInput {
    excludePatternSetting: Common.Settings.RegExpSetting;
    fileSystems: Array<{
        displayName: string;
        fileSystem: Persistence.IsolatedFileSystem.IsolatedFileSystem;
    }>;
    onAddClicked: () => void;
    onRemoveClicked: (fileSystem: Persistence.IsolatedFileSystem.IsolatedFileSystem) => void;
}
export type View = (input: WorkspaceSettingsTabInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class WorkspaceSettingsTab extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
