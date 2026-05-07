import type { SchemaColumn } from "@/entities/database";
import type {
  DbmlParseError,
  DiagramRelation,
  DiagramTable,
} from "../model/types";
import { expandType, relationId, shortenType } from "./constants";

/* ──────────────────────────────────────────────────────────────────────── *
 *  GENERATE — DiagramTable[] + relations → DBML text                       *
 * ──────────────────────────────────────────────────────────────────────── */

const formatColumn = (col: SchemaColumn): string => {
  const type = shortenType(col.type);
  const flags: string[] = [];
  const isPK = col.constraints?.some((c) => c.label === "PK");
  const isUnique = col.constraints?.some((c) => c.label === "UNIQUE");
  if (isPK) flags.push("pk");
  if (col.nullable === "NO" && !isPK) flags.push("not null");
  if (isUnique && !isPK) flags.push("unique");
  if (col.default !== null && col.default !== undefined && col.default !== "") {
    const def = String(col.default).replace(/'/g, "\\'");
    flags.push(`default: '${def}'`);
  }
  const flagsPart = flags.length ? ` [${flags.join(", ")}]` : "";
  return `  ${col.name} ${type}${flagsPart}`;
};

export const generateDbml = (
  tables: DiagramTable[],
  relations: DiagramRelation[],
): string => {
  const sortedTables = [...tables].sort((a, b) => a.slug.localeCompare(b.slug));
  const tableBlocks = sortedTables.map((t) => {
    const labelPart =
      t.label && t.label !== t.slug ? ` [headercolor: #004eea, note: '${t.label.replace(/'/g, "\\'")}']` : "";
    const body = t.columns.map(formatColumn).join("\n");
    return `Table ${t.slug}${labelPart} {\n${body}\n}`;
  });

  const refBlocks = [...relations]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => `Ref: ${r.from}.${r.fromColumn} > ${r.to}.${r.toColumn}`);

  return [tableBlocks.join("\n\n"), refBlocks.join("\n")]
    .filter(Boolean)
    .join("\n\n");
};

/* ──────────────────────────────────────────────────────────────────────── *
 *  PARSE — DBML text → diagram model                                       *
 *                                                                          *
 *  Minimal subset:                                                         *
 *    Table <slug> [<settings>] { <columns> }                               *
 *    Ref: <table>.<column> [> | < | -] <table>.<column>                    *
 *    // line comment                                                       *
 *  Inside a table:                                                         *
 *    <name> <type> [<flags>]                                               *
 *      flags: pk, not null, unique, default: '...'                         *
 * ──────────────────────────────────────────────────────────────────────── */

interface ParseResult {
  tables: DiagramTable[];
  relations: DiagramRelation[];
  errors: DbmlParseError[];
}

const stripComments = (text: string): string =>
  text.replace(/\/\/.*$/gm, "").replace(/--.*$/gm, "");

const parseColumnLine = (
  raw: string,
): { col: SchemaColumn; pk: boolean } | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("Note") || trimmed.startsWith("Indexes"))
    return null;

  // name type [flags]
  const m = trimmed.match(
    /^(\w+)\s+([a-zA-Z][\w\s()]*?)(?:\s*\[([^\]]*)\])?\s*$/,
  );
  if (!m) return null;
  const [, name, rawType, flagsStr] = m;
  const type = expandType(rawType.trim());
  const flags = (flagsStr ?? "")
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);

  const isPK = flags.some((f) => f === "pk" || f === "primary key");
  const isNotNull = flags.some(
    (f) => f === "not null" || f === "notnull",
  );
  const isUnique = flags.some((f) => f === "unique");
  const defaultMatch = flags
    .find((f) => f.startsWith("default:"))
    ?.replace(/^default:\s*/, "")
    .replace(/^['"]|['"]$/g, "");

  const constraints = [
    ...(isPK ? [{ label: "PK", name: `${name}_pk` }] : []),
    ...(isUnique ? [{ label: "UNIQUE", name: `${name}_uq` }] : []),
  ];

  const col: SchemaColumn = {
    name,
    type,
    nullable: isPK || isNotNull ? "NO" : "YES",
    default: defaultMatch ?? null,
    constraints: constraints.length > 0 ? constraints : null,
  };
  return { col, pk: isPK };
};

const findMatchingBrace = (text: string, start: number): number => {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

export const parseDbml = (text: string): ParseResult => {
  const tables: DiagramTable[] = [];
  const relations: DiagramRelation[] = [];
  const errors: DbmlParseError[] = [];
  const stripped = stripComments(text);

  // Tables
  const tableRegex = /Table\s+(\w+)(?:\s+as\s+\w+)?\s*(?:\[[^\]]*\])?\s*\{/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(stripped)) !== null) {
    const slug = match[1];
    const openBraceIdx = stripped.indexOf("{", match.index);
    const closeBraceIdx = findMatchingBrace(stripped, openBraceIdx);
    if (closeBraceIdx === -1) {
      const line = stripped.slice(0, match.index).split("\n").length;
      errors.push({ line, message: `Unterminated Table block: ${slug}` });
      continue;
    }
    const body = stripped.slice(openBraceIdx + 1, closeBraceIdx);
    tableRegex.lastIndex = closeBraceIdx;

    const columns: SchemaColumn[] = [];
    body.split("\n").forEach((rawLine, idx) => {
      const parsed = parseColumnLine(rawLine);
      if (!parsed) {
        if (rawLine.trim() && !rawLine.trim().startsWith("Note")) {
          errors.push({
            line:
              stripped.slice(0, openBraceIdx).split("\n").length + idx + 1,
            message: `Skipped: ${rawLine.trim()}`,
          });
        }
        return;
      }
      columns.push(parsed.col);
    });

    tables.push({ slug, label: slug, columns, constraints: [] });
  }

  // Refs:  Ref name?: table.col > table.col   (>, <, -, <>)
  const refRegex =
    /Ref\s*(?:\w+)?\s*:\s*(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)/g;
  let refMatch: RegExpExecArray | null;
  while ((refMatch = refRegex.exec(stripped)) !== null) {
    const [, t1, c1, op, t2, c2] = refMatch;
    // op direction: '>' means t1.c1 references t2.c2; '<' is reverse; '-' is one-to-one (treat as t1->t2)
    const reverse = op.includes("<") && !op.includes(">");
    const from = reverse ? t2 : t1;
    const fromCol = reverse ? c2 : c1;
    const to = reverse ? t1 : t2;
    const toCol = reverse ? c1 : c2;
    relations.push({
      id: relationId(from, fromCol, to),
      from,
      fromColumn: fromCol,
      to,
      toColumn: toCol,
    });
  }

  return { tables, relations, errors };
};

/* ──────────────────────────────────────────────────────────────────────── *
 *  Monaco language registration (kept idempotent).                         *
 * ──────────────────────────────────────────────────────────────────────── */

export const DBML_LANGUAGE_ID = "dbml";

// We don't depend on the heavy `monaco-editor` types directly — the
// wrapper `@monaco-editor/react` doesn't ship them as a runtime dep.
// A structural type covering only the methods we touch keeps things lean.
type MonacoLanguagesApi = {
  languages: {
    register: (lang: { id: string }) => void;
    setMonarchTokensProvider: (id: string, provider: unknown) => void;
    setLanguageConfiguration: (id: string, config: unknown) => void;
  };
};

let registered = false;

export const registerDbmlLanguage = (monaco: MonacoLanguagesApi): void => {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: DBML_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(DBML_LANGUAGE_ID, {
    defaultToken: "",
    tokenPostfix: ".dbml",
    keywords: [
      "Table",
      "Ref",
      "Indexes",
      "Note",
      "Project",
      "Enum",
      "TableGroup",
      "as",
      "pk",
      "primary key",
      "not null",
      "null",
      "unique",
      "default",
      "increment",
      "ref",
      "headercolor",
    ],
    typeKeywords: [
      "uuid",
      "varchar",
      "text",
      "char",
      "citext",
      "boolean",
      "bool",
      "int",
      "int2",
      "int4",
      "int8",
      "integer",
      "bigint",
      "smallint",
      "serial",
      "float",
      "float8",
      "numeric",
      "decimal",
      "real",
      "money",
      "date",
      "timestamp",
      "timestamptz",
      "json",
      "jsonb",
    ],
    operators: ["<", ">", "-", ":", ","],
    symbols: /[<>\-:,.]/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/--.*$/, "comment"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\[/, { token: "delimiter.bracket", next: "@settings" }],
        [
          /[A-Za-z_][\w]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@default": "identifier",
            },
          },
        ],
        [/[{}()]/, "@brackets"],
        [/[0-9]+/, "number"],
        [/@symbols/, "operator"],
        [/\s+/, "white"],
      ],
      settings: [
        [/\]/, { token: "delimiter.bracket", next: "@pop" }],
        [/'([^'\\]|\\.)*'/, "string"],
        [/"([^"\\]|\\.)*"/, "string"],
        [
          /[A-Za-z_][\w\s]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "attribute.name",
            },
          },
        ],
        [/:/, "operator"],
        [/,/, "delimiter"],
        [/#[0-9a-fA-F]+/, "string"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(DBML_LANGUAGE_ID, {
    comments: { lineComment: "//" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
  });
};
