import '../third_party/axe-core/axe.js';
export declare const DISABLED_RULES: Record<string, {
    enabled: boolean;
}>;
export interface AxeConfig {
    checks: Array<{
        id: string;
        options: string[];
    }>;
    runOnly: {
        type: string;
        values: {
            include: string[];
            exclude: string[];
        };
    };
}
export declare const DEFAULT_CONFIG: AxeConfig;
export interface AxeFailedNode {
    target: string[];
    html: string;
    failureSummary?: string;
}
export interface AxeViolation {
    ruleId: string;
    ruleDescription: string;
    impact?: string;
    failedNodes: AxeFailedNode[];
}
export declare function getAxeViolations(element: Element | ShadowRoot, rules?: Record<string, {
    enabled: boolean;
}>): Promise<AxeViolation[]>;
