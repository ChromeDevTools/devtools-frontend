import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as UI from '../../ui/legacy/legacy.js';
interface CopyChangesDiff {
    diff: Diff.Diff.DiffArray | undefined;
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
}
interface GeminiChangesViewInput {
    /**
     * These are the set of diffs tracked by the Changes Panel.
     */
    diffs: CopyChangesDiff[];
    /**
     * Supplied by the Patch Agent if it has made any changes on behalf of the
     * user.
     */
    patchAgentCSSChange: string | null;
    onCopyToClipboard: (text: string) => void;
}
type GeminiChangesView = (input: GeminiChangesViewInput, output: object, target: HTMLElement) => void;
export declare class CopyChangesToPrompt extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: GeminiChangesView);
    get patchAgentCSSChange(): string | null;
    set patchAgentCSSChange(code: string);
    wasShown(): void;
    willHide(): void;
    set workspaceDiff(diff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
    performUpdate(): Promise<void>;
}
export {};
