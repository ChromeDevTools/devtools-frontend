import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * Responsible for asking autofill for current form issues. This currently happens when devtools is first open.
 */
// TODO(crbug.com/1399414): Trigger check form issues when an element with an associated issue is editted in the issues panel.
export class CheckFormsIssuesTrigger {
    constructor(targetManager = SDK.TargetManager.TargetManager.instance()) {
        targetManager.addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.#pageLoaded, this, { scoped: true });
        for (const model of targetManager.models(SDK.ResourceTreeModel.ResourceTreeModel)) {
            if (model.target().outermostTarget() !== model.target()) {
                continue;
            }
            this.#checkFormsIssues(model);
        }
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!Root.DevToolsContext.globalInstance().has(CheckFormsIssuesTrigger) || forceNew) {
            Root.DevToolsContext.globalInstance().set(CheckFormsIssuesTrigger, new CheckFormsIssuesTrigger());
        }
        return Root.DevToolsContext.globalInstance().get(CheckFormsIssuesTrigger);
    }
    // TODO(crbug.com/1399414): Handle response by dropping current issues in favor of new ones.
    #checkFormsIssues(resourceTreeModel) {
        void resourceTreeModel.target().auditsAgent().invoke_checkFormsIssues();
    }
    #pageLoaded(event) {
        const { resourceTreeModel } = event.data;
        this.#checkFormsIssues(resourceTreeModel);
    }
}
//# sourceMappingURL=CheckFormsIssuesTrigger.js.map