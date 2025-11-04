export interface ActionProperties {
    label: string;
    title?: string;
    onClick: () => void;
}
export interface SnackbarProperties {
    message: string;
    closable?: boolean;
    actionProperties?: ActionProperties;
}
export declare const DEFAULT_AUTO_DISMISS_MS = 5000;
/**
 * @property actionButtonClickHandler - Function to be triggered when action button is clicked.
 * @property dismissTimeout - reflects the `"dismiss-timeout"` attribute.
 * @property message - reflects the `"message"` attribute.
 * @property closable - reflects the `"closable"` attribute.
 * @property actionButtonLabel - reflects the `"action-button-label"` attribute.
 * @property actionButtonTitle - reflects the `"action-button-title"` attribute.
 * @attribute dismiss-timeout - Timeout in ms after which the snackbar is dismissed (if closable is false).
 * @attribute message - The message to display in the snackbar.
 * @attribute closable - If true, the snackbar will have a dismiss button. This cancels the auto dismiss behavior.
 * @attribute action-button-label - The text for the action button.
 * @attribute action-button-title - The title for the action button.
 *
 */
export declare class Snackbar extends HTMLElement {
    #private;
    static snackbarQueue: Snackbar[];
    /**
     * Returns the timeout (in ms) after which the snackbar is dismissed.
     */
    get dismissTimeout(): number;
    /**
     * Sets the value of the `"dismiss-timeout"` attribute for the snackbar.
     */
    set dismissTimeout(dismissMs: number);
    /**
     * Returns the message displayed in the snackbar.
     */
    get message(): string | null;
    /**
     * Sets the `"message"` attribute for the snackbar.
     */
    set message(message: string);
    /**
     * Returns whether the snackbar is closable. If true, the snackbar will have a dismiss button.
     * @default false
     */
    get closable(): boolean;
    /**
     * Sets the `"closable"` attribute for the snackbar.
     */
    set closable(closable: boolean);
    /**
     * Returns the text for the action button.
     */
    get actionButtonLabel(): string | null;
    /**
     * Sets the `"action-button-label"` attribute for the snackbar.
     */
    set actionButtonLabel(actionButtonLabel: string);
    /**
     * Returns the title for the action button.
     */
    get actionButtonTitle(): string | null;
    /**
     * Sets the `"action-button-title"` attribute for the snackbar.
     */
    set actionButtonTitle(actionButtonTitle: string);
    /**
     * Sets the function to be triggered when the action button is clicked.
     * @param actionButtonClickHandler
     */
    set actionButtonClickHandler(actionButtonClickHandler: () => void);
    constructor(properties: SnackbarProperties, container?: HTMLElement);
    static show(properties: SnackbarProperties, container?: HTMLElement): Snackbar;
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-snackbar': Snackbar;
    }
}
