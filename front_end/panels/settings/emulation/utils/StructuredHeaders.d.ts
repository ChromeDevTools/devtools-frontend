export declare const enum ResultKind {
    ERROR = 0,
    PARAM_NAME = 1,
    PARAMETER = 2,
    PARAMETERS = 3,
    ITEM = 4,
    INTEGER = 5,
    DECIMAL = 6,
    STRING = 7,
    TOKEN = 8,
    BINARY = 9,
    BOOLEAN = 10,
    LIST = 11,
    INNER_LIST = 12,
    SERIALIZATION_RESULT = 13
}
export interface Error {
    kind: ResultKind.ERROR;
}
export interface Integer {
    kind: ResultKind.INTEGER;
    value: number;
}
export interface Decimal {
    kind: ResultKind.DECIMAL;
    value: number;
}
export interface String {
    kind: ResultKind.STRING;
    value: string;
}
export interface Token {
    kind: ResultKind.TOKEN;
    value: string;
}
export interface Binary {
    kind: ResultKind.BINARY;
    value: string;
}
export interface Boolean {
    kind: ResultKind.BOOLEAN;
    value: boolean;
}
/**
 * bare-item = sf-integer / sf-decimal / sf-string / sf-token
 * / sf-binary / sf-boolean
 **/
export type BareItem = Integer | Decimal | String | Token | Binary | Boolean;
export interface ParamName {
    kind: ResultKind.PARAM_NAME;
    value: string;
}
/**
 * parameter     = param-name [ "=" param-value ]
 * param-value   = bare-item
 **/
export interface Parameter {
    kind: ResultKind.PARAMETER;
    name: ParamName;
    value: BareItem;
}
/** parameters  = *( ";" *SP parameter ) **/
export interface Parameters {
    kind: ResultKind.PARAMETERS;
    items: Parameter[];
}
/** sf-item   = bare-item parameters **/
export interface Item {
    kind: ResultKind.ITEM;
    value: BareItem;
    parameters: Parameters;
}
/**
 * inner-list    = "(" *SP [ sf-item *( 1*SP sf-item ) *SP ] ")"
 * parameters
 **/
export interface InnerList {
    kind: ResultKind.INNER_LIST;
    items: Item[];
    parameters: Parameters;
}
/** list-member = sf-item / inner-list **/
export type ListMember = Item | InnerList;
/** sf-list = list-member *( OWS "," OWS list-member ) **/
export interface List {
    kind: ResultKind.LIST;
    items: ListMember[];
}
export interface SerializationResult {
    kind: ResultKind.SERIALIZATION_RESULT;
    value: string;
}
export declare function parseItem(input: string): Item | Error;
export declare function parseList(input: string): List | Error;
/** 4.1.3.  Serializing an Item **/
export declare function serializeItem(input: Item): SerializationResult | Error;
/** 4.1.1.  Serializing a List **/
export declare function serializeList(input: List): SerializationResult | Error;
