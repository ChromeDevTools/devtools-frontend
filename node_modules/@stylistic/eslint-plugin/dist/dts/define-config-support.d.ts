import { RuleOptions } from "./rule-options2.js";

//#region dts/define-config-support.d.ts

declare module 'eslint-define-config' {
  export interface CustomRuleOptions extends RuleOptions {}
}