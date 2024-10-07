import { Node, SourceFile } from "typescript";
import { ComponentDeclaration } from "./component-declaration";
export interface ComponentDefinition {
    sourceFile: SourceFile;
    identifierNodes: Set<Node>;
    tagNameNodes: Set<Node>;
    tagName: string;
    declaration?: ComponentDeclaration;
}
//# sourceMappingURL=component-definition.d.ts.map