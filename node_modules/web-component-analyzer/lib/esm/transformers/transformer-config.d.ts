import { VisibilityKind } from "../analyze/types/visibility-kind";
export interface TransformerConfig {
    cwd?: string;
    visibility?: VisibilityKind;
    markdown?: {
        titleLevel?: number;
        headerLevel?: number;
    };
    inlineTypes?: boolean;
}
//# sourceMappingURL=transformer-config.d.ts.map