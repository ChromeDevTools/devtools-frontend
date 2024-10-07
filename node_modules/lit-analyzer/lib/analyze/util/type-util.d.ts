import { SimpleType, SimpleTypeUnion } from "ts-simple-type";
/**
 * Brands a union as a primitive array type
 * This type is used for the "role" attribute that is a whitespace separated list
 * @param union
 */
export declare function makePrimitiveArrayType(union: SimpleTypeUnion): SimpleTypeUnion;
/**
 * Returns if a simple type is branded as a primitive array type
 * @param simpleType
 */
export declare function isPrimitiveArrayType(simpleType: SimpleType): simpleType is SimpleTypeUnion;
//# sourceMappingURL=type-util.d.ts.map