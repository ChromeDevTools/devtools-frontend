import type * as DataGrid from '../ui/legacy/components/data_grid/data_grid.js';
export declare function getCellElementFromNodeAndColumnId<T>(dataGrid: DataGrid.DataGrid.DataGridImpl<T>, node: DataGrid.DataGrid.DataGridNode<T>, columnId: string): Element | null;
export declare function selectNodeByKey<T>(dataGrid: DataGrid.DataGrid.DataGridImpl<T>, key: string | null): DataGrid.DataGrid.DataGridNode<T> | null;
