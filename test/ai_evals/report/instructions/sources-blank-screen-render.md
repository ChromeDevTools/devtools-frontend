## Expected Findings for `sources-blank-screen-render`

A high-quality response to "why is this page blank?" will include:
- Identifies `hydrateDigestSections(rawSections, mountNode)` in `/assets/reports/digest-hydrator.js` (`window.CobaltDigestHydrator.hydrateDigestSections`) and `pages/reports/executive-digest.js` (`ExecutiveDigestPage`).
- Explains that `ExecutiveDigestPage` calls `hydrateDigestSections(DIGEST_SECTIONS, rootRef.current)` inside a `useEffect` `setTimeout`, and the second entry in `DIGEST_SECTIONS` (`id: 'quarterly-velocity'`) has `varianceMetric: null`.
- Explains that evaluating `section.varianceMetric.delta.toFixed(2)` throws a `TypeError` (`Cannot read properties of null`), and the `catch (error)` block calls `mountNode.replaceChildren()` on `#executive-digest-root`, clearing all rendered DOM children.
