import * as Extras from '../extras/extras.js';
import * as Handlers from '../handlers/handlers.js';
import type * as Types from '../types/types.js';
import { type InsightModel, type InsightSetContext } from './types.js';
export declare const UIStrings: {
    /** Title of an insight that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). */
    readonly title: "3rd parties";
    /**
     * @description Description of a DevTools insight that identifies the code on the page that the user doesn't control.
     * This is displayed after a user expands the section to see more. No character length limits.
     */
    readonly description: string;
    /** Label for a table column that displays the name of a third-party provider. */
    readonly columnThirdParty: "3rd party";
    /** Label for a column in a data table; entries will be the download size of a web resource in kilobytes. */
    readonly columnTransferSize: "Transfer size";
    /** Label for a table column that displays how much time each row spent running on the main thread, entries will be the number of milliseconds spent. */
    readonly columnMainThreadTime: "Main thread time";
    /**
     * @description Text block indicating that no third party content was detected on the page
     */
    readonly noThirdParties: "No third parties found";
};
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export type ThirdPartiesInsightModel = InsightModel<typeof UIStrings, {
    /** The entity for this navigation's URL. Any other entity is from a third party. */
    entitySummaries: Extras.ThirdParties.EntitySummary[];
    firstPartyEntity?: Extras.ThirdParties.Entity;
}>;
export declare function isThirdPartyInsight(model: InsightModel): model is ThirdPartiesInsightModel;
export declare function generateInsight(data: Handlers.Types.HandlerData, context: InsightSetContext): ThirdPartiesInsightModel;
export declare function createOverlaysForSummary(summary: Extras.ThirdParties.EntitySummary): Types.Overlays.Overlay[];
export declare function createOverlays(model: ThirdPartiesInsightModel): Types.Overlays.Overlay[];
