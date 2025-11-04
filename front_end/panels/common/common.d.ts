import type * as Platform from '../../core/platform/platform.js';
export declare class TypeToAllowDialog {
    static show(options: {
        jslogContext: {
            dialog: string;
            input: string;
        };
        header: Platform.UIString.LocalizedString;
        message: Platform.UIString.LocalizedString;
        typePhrase: Platform.UIString.LocalizedString;
        inputPlaceholder: Platform.UIString.LocalizedString;
    }): Promise<boolean>;
}
export { AiCodeCompletionTeaser } from './AiCodeCompletionTeaser.js';
export { FreDialog } from './FreDialog.js';
export { GdpSignUpDialog } from './GdpSignUpDialog.js';
export { AiCodeCompletionDisclaimer } from './AiCodeCompletionDisclaimer.js';
export { AiCodeCompletionSummaryToolbar } from './AiCodeCompletionSummaryToolbar.js';
export * from './BadgeNotification.js';
export * as ExtensionPanel from './ExtensionPanel.js';
export * as ExtensionServer from './ExtensionServer.js';
export * as ExtensionView from './ExtensionView.js';
export * as PersistenceUtils from './PersistenceUtils.js';
