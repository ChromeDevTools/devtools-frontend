import { Expression, TaggedTemplateExpression } from "typescript";
import { DocumentOffset, DocumentRange, SourceFilePosition, SourceFileRange } from "../../../types/range.js";
import { VirtualDocument } from "./virtual-document.js";
export declare class VirtualAstDocument implements VirtualDocument {
    readonly fileName: string;
    readonly location: SourceFileRange;
    private readonly parts;
    private _text?;
    get text(): string;
    getPartsAtDocumentRange(range: DocumentRange): (Expression | string)[];
    sfPositionToDocumentOffset(position: SourceFilePosition): DocumentOffset;
    documentOffsetToSFPosition(offset: DocumentOffset): SourceFilePosition;
    constructor(parts: (Expression | string)[], location: SourceFileRange, fileName: string);
    constructor(astNode: TaggedTemplateExpression);
    protected substituteExpression(length: number, expression: Expression, prev: string, next: string | undefined, index: number): string;
}
//# sourceMappingURL=virtual-ast-document.d.ts.map