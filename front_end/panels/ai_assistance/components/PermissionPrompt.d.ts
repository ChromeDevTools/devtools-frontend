import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';
import * as Lit from '../../../ui/lit/lit.js';
import type { Step } from './ChatMessage.js';
/**
 * Renders the permission prompt for a step that needs approval.
 *
 * Used only with the natural language interface
 * (`AiUtils.isNaturalLanguageInterfaceEnabled()`), where `ChatView` renders
 * it in place of the chat input. Without the flag, `ChatMessage` renders the
 * legacy Cancel / Continue buttons from `renderSideEffectConfirmationUi` inside
 * the step.
 *
 * A separate UI is needed because the natural language interface significantly
 * changes the permission prompt.
 *
 * TODO(b/516828269): Remove `renderSideEffectConfirmationUi` once the natural
 * language interface launches.
 */
export declare function renderPermissionPrompt(step: Step, disclaimerText: string): Lit.LitTemplate;
