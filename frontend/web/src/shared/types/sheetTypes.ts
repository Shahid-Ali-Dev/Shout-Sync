export enum SheetType {
  SPREADSHEET = 1,
  KANBAN = 2,
  TABLE = 3,
  FORM = 4
}

export enum ColumnType {
  TEXT = 1,
  NUMBER = 2,
  DATE = 3,
  SELECT = 4,
  CHECKBOX = 5,
  FORMULA = 6,
  USER = 7,
  STATUS = 8
}

export interface SheetColumn {
  id: string;
  sheet: string;
  name: string;
  key: string;
  column_type: ColumnType;
  width: number;
  order: number;
  is_required: boolean;
  options: string[];
  formula?: string;
  settings: any;
}

export interface Cell {
  id: string;
  row: string;
  column: string;
  column_key: string;
  value: string;
  raw_value: any;
  updated_by: string;
  updated_by_name: string;
  updated_at: string;
}

export interface SheetRow {
  id: string;
  sheet: string;
  order: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  cells: Cell[];
}

export interface ProjectSheet {
  id: string;
  project: string;
  name: string;
  description: string;
  sheet_type: SheetType;
  created_by: string;
  created_by_name: string;
  is_public: boolean;
  settings: any;
  columns: SheetColumn[];
  rows: SheetRow[];
  row_count: number;
  created_at: string;
  updated_at: string;
}

export interface SheetComment {
  id: string;
  sheet: string;
  cell?: string;
  user: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkCellUpdate {
  updates: {
    row_id: string;
    column_key: string;
    value: any;
  }[];
}