export const NODE_WIDTH = 260;
export const HEADER_HEIGHT = 36;
export const ROW_HEIGHT = 28;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;

export const TYPE_ALIASES: Record<string, string> = {
  "character varying": "varchar",
  "character": "char",
  "timestamp without time zone": "timestamp",
  "timestamp with time zone": "timestamptz",
  "double precision": "float8",
  "integer": "int4",
  "bigint": "int8",
  "smallint": "int2",
};

export const TYPE_ALIAS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_ALIASES).map(([k, v]) => [v, k]),
);

export const shortenType = (type: string): string =>
  TYPE_ALIASES[type] ?? type;

export const expandType = (type: string): string =>
  TYPE_ALIAS_REVERSE[type] ?? type;

export const typePillClass = (type: string): string => {
  switch (shortenType(type)) {
    case "uuid":
      return "text-violet-400 bg-violet-400/10";
    case "varchar":
    case "text":
    case "char":
    case "citext":
      return "text-emerald-400 bg-emerald-400/10";
    case "boolean":
      return "text-amber-400 bg-amber-400/10";
    case "timestamp":
    case "timestamptz":
    case "date":
      return "text-blue-400 bg-blue-400/10";
    case "float8":
    case "numeric":
    case "decimal":
    case "real":
    case "money":
      return "text-rose-400 bg-rose-400/10";
    case "int2":
    case "int4":
    case "int8":
    case "serial":
      return "text-fuchsia-400 bg-fuchsia-400/10";
    case "json":
    case "jsonb":
      return "text-cyan-400 bg-cyan-400/10";
    default:
      return "text-text-muted bg-bg-main";
  }
};

export const tableHeight = (columnCount: number): number =>
  HEADER_HEIGHT + columnCount * ROW_HEIGHT;

export const rowYOffset = (index: number): number =>
  HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;

export const relationId = (
  fromTable: string,
  fromColumn: string,
  toTable: string,
): string => `${fromTable}.${fromColumn}->${toTable}`;
