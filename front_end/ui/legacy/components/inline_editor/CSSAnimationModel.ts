// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../core/sdk/sdk.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../../ui/legacy/legacy.js';

const cssParser = CodeMirror.css.cssLanguage.parser;

const enum LonghandPart {
  Direction = 'D',
  FillMode = 'F',
  PlayState = 'P',
  IterationCount = 'I',
  EasingFunction = 'E',
}

const identifierLonghandMap: Map<string, LonghandPart> = new Map(
    Object.entries({
      'normal': LonghandPart.Direction,
      'alternate': LonghandPart.Direction,
      'reverse': LonghandPart.Direction,
      'alternate-reverse': LonghandPart.Direction,
      'none': LonghandPart.FillMode,
      'forwards': LonghandPart.FillMode,
      'backwards': LonghandPart.FillMode,
      'both': LonghandPart.FillMode,
      'running': LonghandPart.PlayState,
      'paused': LonghandPart.PlayState,
      'infinite': LonghandPart.IterationCount,
      'linear': LonghandPart.EasingFunction,
      'ease': LonghandPart.EasingFunction,
      'ease-in': LonghandPart.EasingFunction,
      'ease-out': LonghandPart.EasingFunction,
      'ease-in-out': LonghandPart.EasingFunction,
    }),
);

function tokenize(text: string): string[] {
  const textToParse = `*{animation:${text};}`;
  const parsed = cssParser.parse(textToParse);
  // Take the cursor from declaration
  const cursor = parsed.cursorAt(textToParse.indexOf(':') + 1);
  cursor.firstChild();
  cursor.nextSibling();

  const tokens: string[] = [];
  while (cursor.nextSibling()) {
    tokens.push(textToParse.substring(cursor.from, cursor.to));
  }
  return tokens;
}

/**
 * For animation shorthand, we can show two swatches:
 * - Easing function swatch (or also called bezier swatch)
 * - Animation name swatch
 * - Variable swatch
 * all the other tokens in the shorthands are rendered as text.
 *
 * This helper model takes an animation shorthand value (`1s linear slide-in`)
 * and finds out which parts to render as "what" by taking its syntax and parsing logic
 * into consideration. Details can be found here: https://w3c.github.io/csswg-drafts/css-animations/#animation.
 *
 * The rule says that whenever there is a keyword that is valid for a property other than
 * `animation-name` whose values are not found earlier in the shorthand must be accepted
 * for those properties rather than for `animation-name`.
 *
 * Beware that, an animation shorthand can contain multiple animation definitions that are
 * separated by a comma (The syntax is animation = <single-animation>#). The above rule only
 * applies to parsing of <single-animation>.
 */
export class CSSAnimationModel {
  parts: Part[];
  private constructor(parts: Part[]) {
    this.parts = parts;
  }

  static parse(text: string, animationNames: string[]): CSSAnimationModel {
    const tokens = tokenize(text);
    // `animationNames` can be an array that map to the animation names of
    // different single animations in the order of presence.
    let searchedAnimationNameIndex = 0;
    const parts: Part[] = [];
    const foundLonghands = {
      [LonghandPart.EasingFunction]: false,
      [LonghandPart.IterationCount]: false,
      [LonghandPart.Direction]: false,
      [LonghandPart.FillMode]: false,
      [LonghandPart.PlayState]: false,
    };

    for (const token of tokens) {
      const matchedLonghandPart = identifierLonghandMap.get(token);
      const matchesToLonghand = matchedLonghandPart && !foundLonghands[matchedLonghandPart];

      let type: PartType = PartType.Text;
      if (token.match(UI.Geometry.CubicBezier.Regex) && !foundLonghands[LonghandPart.EasingFunction]) {
        type = PartType.EasingFunction;
      } else if (token.match(SDK.CSSMetadata.VariableRegex)) {
        // Note: currently we don't handle resolving variables
        // and putting them in their respective longhand parts.
        // So, having a variable might break the logic for deciding on the
        // `animation-name` if the variable matches to a longhand
        // keyword and the `animation-name` is also the same keyword.
        // This case is very unlikely so we don't handle it for the
        // sake of keeping the implementation clearer.
        type = PartType.Variable;
      } else if (token === animationNames[searchedAnimationNameIndex] && !matchesToLonghand) {
        type = PartType.AnimationName;
      }

      parts.push({
        type,
        value: token,
      });

      // Mark the longhand part as found so that
      // the next identifier that might match to
      // this longhand part shouldn't match.
      if (matchedLonghandPart) {
        foundLonghands[matchedLonghandPart] = true;
      }

      if (token === ',') {
        // `token` being equal to `,` means that parsing of a `<single-animation>`
        // is complete and we start parsing of the next `<single-animation>`.
        // Because of that, we're resetting `foundLonghands` and moving the
        // animation name to match.
        for (const longhandPart of Object.keys(foundLonghands)) {
          foundLonghands[longhandPart as LonghandPart] = false;
        }
        searchedAnimationNameIndex++;
      }
    }

    return new CSSAnimationModel(parts);
  }
}

export const enum PartType {
  // Things that should be rendered as text
  Text = 'T',
  // Things that should be rendered with bezier swatch
  EasingFunction = 'EF',
  // Things that should be rendered with animation name swatch
  AnimationName = 'AN',
  // Things that should be rendered with variable swatch
  Variable = 'V',
}

type Part = {
  type: PartType,
  value: string,
};
