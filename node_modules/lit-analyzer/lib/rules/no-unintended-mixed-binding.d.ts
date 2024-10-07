import { RuleModule } from "../analyze/types/rule/rule-module.js";
/**
 * This rule validates that bindings are not followed by certain characters that indicate typos.
 *
 * Examples:
 *   <input value=${val}' />
 *   <input value='${val}'' />
 *   <input value=${val}} />
 */
declare const rule: RuleModule;
export default rule;
//# sourceMappingURL=no-unintended-mixed-binding.d.ts.map