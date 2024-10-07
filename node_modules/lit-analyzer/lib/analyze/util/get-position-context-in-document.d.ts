import { TextDocument } from "../parse/document/text-document/text-document.js";
import { DocumentOffset } from "../types/range.js";
export interface DocumentPositionContext {
    text: string;
    offset: DocumentOffset;
    word: string;
    leftWord: string;
    rightWord: string;
    beforeWord: string;
    afterWord: string;
}
/**
 * Returns information about the position in a document.
 * @param document
 * @param offset
 */
export declare function getPositionContextInDocument(document: TextDocument, offset: DocumentOffset): DocumentPositionContext;
/**
 * Reads a word in a specific direction.
 * Stops if "stopChar" is encountered.
 * @param startPosition
 * @param stopChar
 * @param direction
 * @param text
 */
export declare function grabWordInDirection({ startOffset, stopChar, direction, text }: {
    stopChar: RegExp;
    direction: "left" | "right";
    text: string;
    startOffset: DocumentOffset;
}): string;
//# sourceMappingURL=get-position-context-in-document.d.ts.map