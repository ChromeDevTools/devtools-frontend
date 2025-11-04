import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Platform from '../../core/platform/platform.js';
import type { PlatformFileSystem } from '../../models/persistence/PlatformFileSystem.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const enum ExcludedFolderStatus {
    VALID = 1,
    ERROR_NOT_A_PATH = 2,
    ERROR_NOT_UNIQUE = 3
}
export interface PathWithStatus {
    path: Platform.DevToolsPath.EncodedPathString;
    status: ExcludedFolderStatus;
}
export interface EditFileSystemViewInput {
    fileSystemPath: Platform.DevToolsPath.UrlString;
    excludedFolderPaths: PathWithStatus[];
    onCreate: (event: CustomEvent<{
        url?: string;
    }>) => void;
    onEdit: (event: CustomEvent<{
        node: HTMLElement;
        columnId: string;
        valueBeforeEditing: string;
        newText: string;
    }>) => void;
    onDelete: (event: CustomEvent<HTMLElement>) => void;
}
export type View = (input: EditFileSystemViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class EditFileSystemView extends UI.Widget.VBox {
    #private;
    constructor(element: HTMLElement | undefined, view?: View);
    set fileSystem(fileSystem: PlatformFileSystem);
    wasShown(): void;
    performUpdate(): void;
}
