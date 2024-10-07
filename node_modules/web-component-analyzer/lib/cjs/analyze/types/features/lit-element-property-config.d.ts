import { SimpleType } from "ts-simple-type";
import { CallExpression, Node } from "typescript";
export interface LitElementPropertyConfig {
    type?: SimpleType | string;
    attribute?: string | boolean;
    node?: {
        type?: Node;
        attribute?: Node;
        decorator?: CallExpression;
    };
    hasConverter?: boolean;
    default?: unknown;
    reflect?: boolean;
    state?: boolean;
}
//# sourceMappingURL=lit-element-property-config.d.ts.map