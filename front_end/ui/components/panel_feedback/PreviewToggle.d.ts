import '../../../ui/kit/kit.js';
import '../../legacy/legacy.js';
import * as Root from '../../../core/root/root.js';
export interface PreviewToggleData {
    name: string;
    helperText: string | null;
    feedbackURL: string | null;
    experiment: Root.ExperimentNames.ExperimentName;
    learnMoreURL?: string;
    onChangeCallback?: (checked: boolean) => void;
}
export declare class PreviewToggle extends HTMLElement {
    #private;
    set data(data: PreviewToggleData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-preview-toggle': PreviewToggle;
    }
}
