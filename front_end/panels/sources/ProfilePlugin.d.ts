import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import { Plugin } from './Plugin.js';
export declare class PerformanceProfilePlugin extends Plugin {
    #private;
    updateEffect: CodeMirror.StateEffectType<Workspace.UISourceCode.LineColumnProfileMap>;
    field: CodeMirror.StateField<CodeMirror.RangeSet<CodeMirror.GutterMarker>>;
    gutter: CodeMirror.Extension;
    compartment: CodeMirror.Compartment;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode, transformer: SourceFrame.SourceFrame.Transformer);
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    private getLineMap;
    editorExtension(): CodeMirror.Extension;
    decorationChanged(type: Workspace.UISourceCode.DecoratorType, editor: TextEditor.TextEditor.TextEditor): void;
}
