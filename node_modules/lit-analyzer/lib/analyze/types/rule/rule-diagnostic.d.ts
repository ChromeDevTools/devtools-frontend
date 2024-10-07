import { SourceFileRange } from "../range.js";
import { RuleFix } from "./rule-fix.js";
export interface RuleDiagnostic {
    location: SourceFileRange;
    message: string;
    fixMessage?: string;
    suggestion?: string;
    fix?: () => RuleFix[] | RuleFix;
}
//# sourceMappingURL=rule-diagnostic.d.ts.map