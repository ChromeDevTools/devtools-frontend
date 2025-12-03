import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Console from '../../console/console.js';
export declare class CloseEvent extends Event {
    static readonly eventName = "close";
    constructor();
}
export type PublicPromptBuilder = Pick<Console.PromptBuilder.PromptBuilder, 'buildPrompt' | 'getSearchQuery'>;
export type PublicAidaClient = Pick<Host.AidaClient.AidaClient, 'doConversation' | 'registerClientEvent'>;
export interface ViewInput {
    state: Extract<StateData, {
        type: State.INSIGHT;
    }> | {
        type: Exclude<State, State.INSIGHT>;
    };
    closing: boolean;
    disableAnimations: boolean;
    renderer: MarkdownView.MarkdownView.MarkdownInsightRenderer;
    citationClickHandler: (index: number) => void;
    selectedRating?: boolean;
    noLogging: boolean;
    areReferenceDetailsOpen: boolean;
    highlightedCitationIndex: number;
    callbacks: {
        onClose: () => void;
        onAnimationEnd: () => void;
        onCitationAnimationEnd: () => void;
        onSearch: () => void;
        onRating: (isPositive: boolean) => void;
        onReport: () => void;
        onGoToSignIn: () => void;
        onConsentReminderConfirmed: () => Promise<void>;
        onToggleReferenceDetails: (event: Event) => void;
        onDisclaimerSettingsLink: () => void;
        onReminderSettingsLink: () => void;
        onEnableInsightsInSettingsLink: () => void;
        onReferencesOpen: () => void;
    };
}
export interface ViewOutput {
    headerRef: Lit.Directives.Ref<HTMLHeadingElement>;
    citationLinks: HTMLElement[];
}
export declare const enum State {
    INSIGHT = "insight",
    LOADING = "loading",
    ERROR = "error",
    SETTING_IS_NOT_TRUE = "setting-is-not-true",
    CONSENT_REMINDER = "consent-reminder",
    NOT_LOGGED_IN = "not-logged-in",
    SYNC_IS_PAUSED = "sync-is-paused",
    OFFLINE = "offline"
}
type StateData = {
    type: State.LOADING;
    consentOnboardingCompleted: boolean;
} | {
    type: State.INSIGHT;
    tokens: MarkdownView.MarkdownView.MarkdownViewData['tokens'];
    validMarkdown: boolean;
    sources: Console.PromptBuilder.Source[];
    isPageReloadRecommended: boolean;
    completed: boolean;
    directCitationUrls: string[];
    relatedUrls: string[];
    timedOut?: boolean;
} & Host.AidaClient.DoConversationResponse | {
    type: State.ERROR;
    error: string;
} | {
    type: State.CONSENT_REMINDER;
    sources: Console.PromptBuilder.Source[];
    isPageReloadRecommended: boolean;
} | {
    type: State.SETTING_IS_NOT_TRUE;
} | {
    type: State.NOT_LOGGED_IN;
} | {
    type: State.SYNC_IS_PAUSED;
} | {
    type: State.OFFLINE;
};
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement | ShadowRoot) => void;
export type ViewFunction = typeof DEFAULT_VIEW;
export declare class ConsoleInsight extends UI.Widget.Widget {
    #private;
    static create(promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient): Promise<UI.Widget.WidgetElement<ConsoleInsight>>;
    disableAnimations: boolean;
    constructor(promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient, aidaPreconditions: Host.AidaClient.AidaAccessPreconditions, element?: HTMLElement, view?: ViewFunction);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
