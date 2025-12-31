import '../../../ui/components/tooltips/tooltips.js';
import type * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
export type ImageInputData = {
    isLoading: true;
} | {
    isLoading: false;
    data: string;
    mimeType: string;
    inputType: AiAssistanceModel.AiAgent.MultimodalInputType;
};
export interface ViewInput {
    isLoading: boolean;
    isTextInputEmpty: boolean;
    blockedByCrossOrigin: boolean;
    isTextInputDisabled: boolean;
    inputPlaceholder: Platform.UIString.LocalizedString;
    selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
    inspectElementToggled: boolean;
    additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
    disclaimerText: string;
    conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
    multimodalInputEnabled: boolean;
    imageInput?: ImageInputData;
    uploadImageInputEnabled: boolean;
    isReadOnly: boolean;
    textAreaRef: Lit.Directives.Ref<HTMLTextAreaElement>;
    onContextClick: () => void;
    onInspectElementClick: () => void;
    onSubmit: (ev: SubmitEvent) => void;
    onTextAreaKeyDown: (ev: KeyboardEvent) => void;
    onCancel: (ev: SubmitEvent) => void;
    onNewConversation: () => void;
    onTextInputChange: (input: string) => void;
    onTakeScreenshot: () => void;
    onRemoveImageInput: () => void;
    onImageUpload: (ev: Event) => void;
    onImagePaste: (event: ClipboardEvent) => void;
}
export type ViewOutput = undefined;
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
/**
 * ChatInput is a presenter for the input area in the AI Assistance panel.
 */
export declare class ChatInput extends UI.Widget.Widget implements SDK.TargetManager.Observer {
    #private;
    isLoading: boolean;
    blockedByCrossOrigin: boolean;
    isTextInputDisabled: boolean;
    inputPlaceholder: Platform.UIString.LocalizedString;
    selectedContext: AiAssistanceModel.AiAgent.ConversationContext<unknown> | null;
    inspectElementToggled: boolean;
    additionalFloatyContext: UI.Floaty.FloatyContextSelection[];
    disclaimerText: string;
    conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType;
    multimodalInputEnabled: boolean;
    uploadImageInputEnabled: boolean;
    isReadOnly: boolean;
    setInputValue(text: string): void;
    onTextSubmit: (text: string, imageInput?: Host.AidaClient.Part, multimodalInputType?: AiAssistanceModel.AiAgent.MultimodalInputType) => void;
    onContextClick: () => void;
    onInspectElementClick: () => void;
    onCancelClick: () => void;
    onNewConversation: () => void;
    targetAdded(_target: SDK.Target.Target): void;
    targetRemoved(_target: SDK.Target.Target): void;
    constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
    focusTextInput(): void;
    onSubmit: (event: SubmitEvent) => void;
    onTextAreaKeyDown: (event: KeyboardEvent) => void;
    onCancel: (ev: SubmitEvent) => void;
    onImageUpload: (ev: Event) => void;
}
