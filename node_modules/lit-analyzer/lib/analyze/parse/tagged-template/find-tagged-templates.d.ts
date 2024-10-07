import { Node, SourceFile, TaggedTemplateExpression } from "typescript";
/**
 * Returns all virtual documents in a given file.
 * @param sourceFile
 * @param templateTags
 */
export declare function findTaggedTemplates(sourceFile: SourceFile, templateTags: string[]): TaggedTemplateExpression[];
export declare function findTaggedTemplates(sourceFile: SourceFile, templateTags: string[], position?: number): TaggedTemplateExpression | undefined;
export interface TaggedTemplateVisitContext {
    parent?: TaggedTemplateExpression;
    emitTaggedTemplateNode(node: TaggedTemplateExpression): void;
    shouldCheckTemplateTag(templateTag: string): boolean;
}
export declare function visitTaggedTemplateNodes(astNode: Node, context: TaggedTemplateVisitContext): void;
//# sourceMappingURL=find-tagged-templates.d.ts.map