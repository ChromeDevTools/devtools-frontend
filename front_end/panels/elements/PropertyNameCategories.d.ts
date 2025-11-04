export declare const enum Category {
    LAYOUT = "Layout",
    TEXT = "Text",
    APPEARANCE = "Appearance",
    ANIMATION = "Animation",
    GRID = "Grid",
    FLEX = "Flex",
    TABLE = "Table",
    CSS_VARIABLES = "CSS Variables",
    GENERATED_CONTENT = "Generated Content",
    OTHER = "Other"
}
export declare const DefaultCategoryOrder: Category[];
/**
 * Categorize a given property name to one or more categories.
 *
 * It matches against the static CategoriesByPropertyName first. It then
 * matches against several dynamic rules. It then tries to use the canonical
 * name's shorthands for matching. If nothing matches, it returns the "Other"
 * category.
 */
export declare const categorizePropertyName: (propertyName: string) => Category[];
