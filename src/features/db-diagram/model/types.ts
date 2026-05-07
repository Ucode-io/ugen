import type { SchemaColumn, SchemaConstraint } from "@/entities/database";

export interface DiagramTable {
  slug: string;
  label: string;
  columns: SchemaColumn[];
  constraints: SchemaConstraint[];
}

export interface DiagramRelation {
  id: string;
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
}

export interface DiagramPosition {
  x: number;
  y: number;
}

export type DiagramMode = "select" | "pan";
export type DiagramFilter = "all" | "tables" | "relations";

export interface DbmlParseError {
  line: number;
  message: string;
}
