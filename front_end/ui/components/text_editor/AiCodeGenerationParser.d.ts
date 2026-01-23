import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
export interface CommentNodeInfo {
    text: string;
    to: number;
}
export declare class AiCodeGenerationParser {
    static extractCommentNodeInfo(state: CodeMirror.EditorState, cursorPosition: number): CommentNodeInfo | undefined;
}
