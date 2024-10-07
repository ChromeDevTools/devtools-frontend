import type { Node } from "typescript";
import { ComponentMember } from "../../types/features/component-member";
import { AnalyzerDeclarationVisitContext } from "../analyzer-flavor";
/**
 * Parses LWC related declaration members.
 * This is primary by looking at the "@api" decorator
 * @param node
 * @param context
 */
export declare function discoverMembers(node: Node, context: AnalyzerDeclarationVisitContext): ComponentMember[] | undefined;
//# sourceMappingURL=discover-members.d.ts.map