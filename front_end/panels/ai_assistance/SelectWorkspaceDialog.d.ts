import type * as Platform from '../../core/platform/platform.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
interface Folder {
    name: string;
    path: string;
    project?: Workspace.Workspace.Project;
    automaticFileSystem?: Persistence.AutomaticFileSystemManager.AutomaticFileSystem;
}
interface ViewInput {
    folders: Folder[];
    selectedIndex: number;
    selectProjectRootText: Platform.UIString.LocalizedString;
    showAutomaticWorkspaceNudge: boolean;
    onProjectSelected: (index: number) => void;
    onSelectButtonClick: () => void;
    onCancelButtonClick: () => void;
    onAddFolderButtonClick: () => void;
    onListItemKeyDown: (event: KeyboardEvent) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW: View;
export declare class SelectWorkspaceDialog extends UI.Widget.VBox {
    #private;
    constructor(options: {
        dialog: UI.Dialog.Dialog;
        onProjectSelected: (project: Workspace.Workspace.Project) => void;
        currentProject?: Workspace.Workspace.Project;
    }, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
    static show(onProjectSelected: (project: Workspace.Workspace.Project) => void, currentProject?: Workspace.Workspace.Project): void;
}
export {};
