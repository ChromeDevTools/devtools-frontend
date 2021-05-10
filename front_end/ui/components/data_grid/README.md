# data-grid

The data-grid component takes in tabular data and renders it into a table. It does not provide complex functionality such as sorting or filtering. For that, you should use a `data-grid-controller` component.

## Passing data into the data grid

The data-grid takes in `rows` and `columns` separately. See the type definitions
of these in `DataGridUtils.ts` for an explanation on each individual field.

For example, to construct a table of capital cities around the world, we
might pass in:

```js
const columns = [
  { id: 'city', title: 'City', widthWeighting: 50, hideable: false, visible: true },
  { id: 'country', title: 'Country', widthWeighting: 50, hideable: false, visible: true },
]

const rows = [
  { cells: [
      { columnId: 'city', value: 'London', title: 'London' },
      { columnId: 'country', value: 'UK', title: 'UK' }
    ]
  },
  { cells: [
      { columnId: 'city', value: 'Berlin', title: 'Berlin' },
      { columnId: 'country', value: 'Germany', title: 'Germany' }
    ]
  },
]
```

The field `title` in rows is used as the key for sorting and search as
well for the title attribute of the cell.

# data-grid-controller

A data-grid-controller extends the basic data-grid with more
functionality. It renders a regular data-grid, but contains logic for
filtering and sorting columns.

You create a data-grid-controller in the same way as you create a data-grid, and
the structure of the `rows` and `columns` is identical. Any column you wish to
be sortable should have `sortable: true` set. Currently colums are sorted
alphabetically (or numerically if the values are numbers) in ASC or DESC order.
We do not yet have the ability to provide custom compartor functions for column
sorting.

A data-grid-controller can optionally also take an array of filters. These
should be created via `TextUtils.FilterParser`.

```ts
const keys = ['city', 'country'];
const parser = new TextUtils.FilterParser(keys);
// Pass this into devtools-data-grid-controller to filter accordingly
const filters = parser.parse('lond')
```

# data-grid resizing

The DataGrid supports clicking and dragging on a column to resize it. Read on if
you want to know about the implementation details...

You cannot add a mouse event listener to find out when a table cell border is
dragged, so what we do is render a 20px wide handler that is invisibly placed at
the right hand edge of a cell (represented by H in the diagram below).

The handler is responsible for resizing the cell it lives in, and the cell to
its right. That's why the far right table cells do not have a handler in,
because there is no cell to the right. In the code, and in this doc, these cells
will be referred to as the "left cell" and the "right cell".

|---------|---------|
| cell1  H| cell2   |
|---------|---------|

When the user starts to drag we first gather some data that we need to resize
correctly:

1. The initial width in pixels of both cells.
2. The initial width in percentages of both cells.
3. The initial X position of the mouse that started the drag.
4. The `col` elements for each cell (as these are what we resize).

We then bind a `mousemove` listener to the `document` housing our data-grid. We
do this to allow the user to move their mouse outside of the small resize
handler without losing the drag - else you have to be very precise with your
cursor!

When we get a mouse move event, we calculate the delta of the mouse move
(event.x - initialX) as a percentage of the data grid width. Then, depending on
if the pixel delta was positive (user moved their mouse to the right) or
negative (to the left) we can then adjust the widths accordingly.

If the user moved positively (to the right):
- the left cell width becomes (initialWidth + percentageDelta)%
- the right cell width becomes (initialWidth - percentageDelta)%

If the user moved negatively (to the left):
- the left cell width becomes (initialWidth - percentageDelta)%
- the right cell width becomes (initialWidth + percentageDelta)%

We also clamp these widths. The minimum % a column is allowed to be is 10% (in
time we may alter this), and the largest it's allowed to grow to is the sum of
the left and right column's initial % width, minus the 10% minimum. So if the
left cell has a width of 30%, and the right cell has 40%, that means:

- the minimum width is 10%
- the maximum width is (30% + 40%) - 10%

We then apply these percentages but before we do we `Math.floor` the left cell
and `Math.ceil` the right cell. This is to ensure we end up with a nice round %
number at the end, and also avoids a tiny mouse move changing a column's
percentage width by such a small amount that the user sees a tiny stutter, which
is not great. Doing this reduces the smoothness of the resizing by a tiny amount
(barely noticable), but by keeping the widths in percentages we don't have to
manually calculate pixel values or deal with the window being resized, so the
advantages of working solely in % are worth it.
