/**
 * Returns a label for the walkthrough toggle button.
 * The label includes the current action (Show/Hide) and a smart-truncated version of the prompt.
 */
export declare function getButtonLabel(input: {
    isExpanded: boolean;
    isLoading: boolean;
    hasWidgets: boolean;
    prompt: string;
    stepTitle?: string;
}): string;
