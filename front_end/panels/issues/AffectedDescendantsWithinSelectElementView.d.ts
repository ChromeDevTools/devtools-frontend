import type * as Platform from '../../core/platform/platform.js';
import { AffectedElementsView } from './AffectedElementsView.js';
export declare class AffectedDescendantsWithinSelectElementView extends AffectedElementsView {
    #private;
    update(): void;
    protected getResourceName(count: number): Platform.UIString.LocalizedString;
}
