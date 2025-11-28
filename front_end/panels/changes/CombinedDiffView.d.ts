import '../../ui/kit/kit.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import type * as Diff from '../../third_party/diff/diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
interface SingleDiffViewInput {
    diff: Diff.Diff.DiffArray;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    icon: Lit.TemplateResult;
    copied: boolean;
    selectedFileUrl?: string;
    onCopy: (fileUrl: string) => void;
    onFileNameClick: (fileUrl: string) => void;
}
export interface ViewOutput {
    scrollToSelectedDiff?: () => void;
}
export interface ViewInput {
    singleDiffViewInputs: SingleDiffViewInput[];
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class CombinedDiffView extends UI.Widget.Widget {
    #private;
    /**
     * Ignores urls that start with any in the list
     */
    ignoredUrls: string[];
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    set workspaceDiff(workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
    set selectedFileUrl(fileUrl: string | undefined);
    performUpdate(): Promise<void>;
}
export {};
