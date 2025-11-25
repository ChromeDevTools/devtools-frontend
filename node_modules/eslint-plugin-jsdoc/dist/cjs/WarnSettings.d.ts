export default WarnSettings;
declare function WarnSettings(): {
    /**
     * Warn only once for each context and setting
     * @param {import('eslint').Rule.RuleContext} context
     * @param {string} setting
     * @returns {boolean}
     */
    hasBeenWarned(context: import("eslint").Rule.RuleContext, setting: string): boolean;
    /**
     * @param {import('eslint').Rule.RuleContext} context
     * @param {string} setting
     * @returns {void}
     */
    markSettingAsWarned(context: import("eslint").Rule.RuleContext, setting: string): void;
};
