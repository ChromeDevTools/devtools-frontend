declare namespace Intl {
  /**
   * An object with properties reflecting the locale
   * and styles options computed during initialization
   * of the `Intl.DisplayNames` object
   *
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/resolvedOptions#Description).
   *
   * [Specification](https://tc39.es/ecma402/#sec-intl-displaynames-constructor)
   */
  interface DisplayNamesOptions {
    localeMatcher: RelativeTimeFormatLocaleMatcher;
    style: RelativeTimeFormatStyle;
    type: 'language'|'region'|'script'|'currency';
    fallback: 'code'|'none';
  }

  interface DisplayNames {
    /**
       * Receives a code and returns a string based on the locale and options provided when instantiating
       * [`Intl.DisplayNames()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames)
       *
       * @param code The `code` to provide depends on the `type`:
       *  - If the type is "region", code should be either an [ISO-3166 two letters region code](https://www.iso.org/iso-3166-country-codes.html),
       *    or a [three digits UN M49 Geographic Regions](https://unstats.un.org/unsd/methodology/m49/).
       *  - If the type is "script", code should be an [ISO-15924 four letters script code](https://unicode.org/iso15924/iso15924-codes.html).
       *  - If the type is "language", code should be a `languageCode` ["-" `scriptCode`] ["-" `regionCode` ] *("-" `variant` )
       *    subsequence of the unicode_language_id grammar in [UTS 35's Unicode Language and Locale Identifiers grammar](https://unicode.org/reports/tr35/#Unicode_language_identifier).
       *    `languageCode` is either a two letters ISO 639-1 language code or a three letters ISO 639-2 language code.
       *  - If the type is "currency", code should be a [3-letter ISO 4217 currency code](https://www.iso.org/iso-4217-currency-codes.html).
       *
       * @returns A language-specific formatted string.
       *
       * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/of).
       *
       * [Specification](https://tc39.es/ecma402/#sec-Intl.DisplayNames.prototype.of).
       */
    of(code: string): string;
    /**
       * Returns a new object with properties reflecting the locale and style formatting options computed during the construction of the current
       * [`Intl/DisplayNames`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames) object.
       *
       * @returns An object with properties reflecting the locale and formatting options computed during the construction of the
       *  given [`Intl/DisplayNames`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames) object.
       *
       * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/resolvedOptions).
       *
       * [Specification](https://tc39.es/ecma402/#sec-Intl.DisplayNames.prototype.resolvedOptions)
       */
    resolvedOptions(): DisplayNamesOptions;
  }

  /**
   * The [`Intl.DisplayNames()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames)
   * object enables the consistent translation of language, region and script display names.
   *
   * Part of [Intl object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
   * namespace and the [ECMAScript Internationalization API](https://www.ecma-international.org/publications/standards/Ecma-402.htm).
   *
   * [Compatibility](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames#browser_compatibility).
   */
  const DisplayNames: {
    prototype: DisplayNames;

    /**
       * Constructor creates [`Intl.DisplayNames`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames)
       * objects that enable the consistent translation of language, region and script display names.
       *
       * @param locales A string with a BCP 47 language tag, or an array of such strings.
       *   For the general form and interpretation of the `locales` argument, see the [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locale_identification_and_negotiation)
       *   page. The following Unicode extension key is allowed:
       *   - `nu` The numbering system to be used. Possible values include: `"arab"`, `"arabext"`, `"bali"`, `"beng"`, `"deva"`, `"fullwide"`, `"gujr"`, `"guru"`, `"hanidec"`, `"khmr"`, `"knda"`, `"laoo"`, `"latn"`, `"limb"`, `"mlym"`, `"mong"`, `"mymr"`, `"orya"`, `"tamldec"`, `"telu"`, `"thai"`, `"tibt"`.
       *
       * @param options An object with some or all of the following properties:
       *   - `localeMatcher` The locale matching algorithm to use. Possible values are `"lookup"` and `"best fit"`; the default is `"best fit"`.
       *     For information about this option, see the [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locale_identification_and_negotiation) page.
       *   - `style` The formatting style to use, the default is `"long"`. `"narrow"` `"short"` `"long"`
       *   - `type` The type to use. `"language"` `"region"` `"script"` `"currency"`
       *   - `fallback` The fallback to use, the default is `"code"`. `"code"` `"none"`
       *
       * @returns [Intl.DisplayNames](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames) object.
       *
       * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/DisplayNames).
       *
       * [Specification](https://tc39.es/ecma402/#sec-intl-displaynames-constructor).
       */
    new (locales?: UnicodeBCP47LocaleIdentifier|UnicodeBCP47LocaleIdentifier[], options?: Partial<DisplayNamesOptions>):
        DisplayNames;

    /**
       * Returns an array containing those of the provided locales that are supported in display names without having to fall back to the runtime's default locale.
       *
       * @param locales A string with a BCP 47 language tag, or an array of such strings.
       *   For the general form and interpretation of the `locales` argument, see the [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locale_identification_and_negotiation)
       *   page.
       *
       * @param options An object that may have the following property:
       *   - `localeMatcher` The locale matching algorithm to use. Possible values are `"lookup"` and `"best fit"`; the default is `"best fit"`.
       *     For information about this option, see the [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locale_identification_and_negotiation) page.
       *
       * @returns An array of strings representing a subset of the given locale tags that are supported in display names without having to fall back to the runtime's default locale.
       *
       * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames/supportedLocalesOf).
       *
       * [Specification](https://tc39.es/ecma402/#sec-Intl.DisplayNames.supportedLocalesOf).
       */
    supportedLocalesOf(
        locales: UnicodeBCP47LocaleIdentifier|UnicodeBCP47LocaleIdentifier[],
        options: {localeMatcher: RelativeTimeFormatLocaleMatcher}): UnicodeBCP47LocaleIdentifier[];
  };
}