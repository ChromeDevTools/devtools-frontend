import { Node } from "typescript";
import { ComponentMember } from "../../types/features/component-member";
import { AnalyzerDeclarationVisitContext } from "../analyzer-flavor";
/**
 * Parses lit-related declaration members.
 * This is primary by looking at the "@property" decorator and the "static get properties()".
 * @param node
 * @param context
 */
export declare function discoverMembers(node: Node, context: AnalyzerDeclarationVisitContext): ComponentMember[] | undefined;
//# sourceMappingURL=discover-members.d.ts.map