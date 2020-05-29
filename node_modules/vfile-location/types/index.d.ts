// TypeScript Version: 3.0

import {Point} from 'unist'
import {VFile} from 'vfile'

declare namespace vfileLocation {
  type Position = Pick<Point, 'line' | 'column'>
  type PositionWithOffset = Required<Point>
  type Offset = NonNullable<Point['offset']>

  interface Location {
    /**
     * Get the offset for a line and column based position in the bound file.
     * Returns `-1` when given invalid or out of bounds input.
     */
    toOffset: (position: Position) => Offset

    /**
     * Get the line and column-based position for offset in the bound file.
     */
    toPosition: (offset: Offset) => PositionWithOffset
  }
}

/**
 * Get transform functions for the given `document`.
 */
declare function vfileLocation(document: string | VFile): vfileLocation.Location

export = vfileLocation
