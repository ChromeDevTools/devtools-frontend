import * as SDK from '../../core/sdk/sdk.js';
/**
 * Responsible for asking autofill for current form issues. This currently happens when devtools is first open.
 */
export declare class CheckFormsIssuesTrigger {
    #private;
    constructor(targetManager?: SDK.TargetManager.TargetManager);
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): CheckFormsIssuesTrigger;
}
