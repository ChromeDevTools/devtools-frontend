import { Node } from "typescript";
import { ComponentMember } from "../../types/features/component-member";
import { AnalyzerDeclarationVisitContext } from "../analyzer-flavor";
/**
 * Discovers members based on standard vanilla custom element rules
 * @param node
 * @param context
 */
export declare function discoverMembers(node: Node, context: AnalyzerDeclarationVisitContext): ComponentMember[] | undefined;
//# sourceMappingURL=discover-members.d.ts.map