import { VisibilityKind } from "../analyze/types/visibility-kind";
/**
 * Removes all items from an array with visibilities that are less visible than "visibility".
 * @param visibility
 * @param array
 */
export declare function filterVisibility<T extends {
    visibility?: VisibilityKind;
}>(visibility: VisibilityKind | undefined, array: T[]): T[];
//# sourceMappingURL=model-util.d.ts.map