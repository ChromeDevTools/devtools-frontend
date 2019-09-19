declare namespace compareVersions {
  /**
   * Allowed arithmetic operators
   */
  type CompareOperator = '>' | '>=' | '=' | '<' | '<=';
}

declare const compareVersions: {
  /**
   * Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
   * This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
   * @param firstVersion - First version to compare
   * @param secondVersion - Second version to compare
   * @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
   */
  (firstVersion: string, secondVersion: string): 1 | 0 | -1;

  /**
   * Compare [semver](https://semver.org/) version strings using the specified operator.
   * 
   * @param firstVersion First version to compare
   * @param secondVersion Second version to compare
   * @param operator Allowed arithmetic operator to use
   * @returns `true` if the comparison between the firstVersion and the secondVersion satisfies the operator, `false` otherwise.
   *
   * @example
   * ```
   * compareVersions.compare('10.1.8', '10.0.4', '>'); // return true
   * compareVersions.compare('10.0.1', '10.0.1', '='); // return true
   * compareVersions.compare('10.1.1', '10.2.2', '<'); // return true
   * compareVersions.compare('10.1.1', '10.2.2', '<='); // return true
   * compareVersions.compare('10.1.1', '10.2.2', '>='); // return false
   * ```
   */
	compare(
    firstVersion: string, 
    secondVersion: string, 
    operator: compareVersions.CompareOperator
  ): boolean;
};

export = compareVersions;