# AI Chat — Frontend Integration Guide

Everything the frontend needs to work with the `POST /v1/ai-chat/new-messages/:chat-id` endpoint:
request shape, streaming SSE protocol, all event types with their full data shapes, icon names,
the PendingAction confirmation flow, and the agent-creation progress events.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Chat Management Endpoints](#chat-management-endpoints)
3. [Send Message — Core Endpoint](#send-message--core-endpoint)
4. [Request Body](#request-body)
5. [Non-Streaming JSON Response](#non-streaming-json-response)
6. [Streaming SSE Mode](#streaming-sse-mode)
7. [SSE Wire Format](#sse-wire-format)
8. [All SSE Event Types](#all-sse-event-types)
   - [provider](#event-provider)
   - [progress](#event-progress)
   - [plan](#event-plan)
   - [table_start / table_done](#event-table_start--table_done)
   - [manifest](#event-manifest)
   - [chunk_start / chunk_done](#event-chunk_start--chunk_done)
   - [repair](#event-repair)
   - [publish](#event-publish)
   - [done](#event-done)
   - [error](#event-error)
9. [All Icons Reference](#all-icons-reference)
10. [PendingAction Confirmation Flow](#pendingaction-confirmation-flow)
11. [Agent Creation via Chat — SSE Progress](#agent-creation-via-chat--sse-progress)
12. [Fetch Chat History](#fetch-chat-history)
13. [Minimal Streaming Client (TypeScript)](#minimal-streaming-client-typescript)

---

## Authentication

All `/v1/ai-chat/*` endpoints require the admin JWT in the `Authorization` header:

```http
Authorization: Bearer <admin-jwt>
```

The server resolves `project_id`, `resource_env_id`, and user identity from the token.

---

## Chat Management Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/ai-chat` | Create a new chat session |
| `GET` | `/v1/ai-chat/list` | List all chats for the project |
| `GET` | `/v1/ai-chat/project/:project-id` | Get the active chat for a project |
| `PUT` | `/v1/ai-chat/:chat-id` | Update chat metadata (title, model, …) |
| `DELETE` | `/v1/ai-chat/:chat-id` | Delete a chat and its messages |
| `GET` | `/v1/ai-chat/messages/:chat-id` | Get full message history |
| `DELETE` | `/v1/ai-chat/messages/:message_id` | Delete a single message |

### Create Chat — request body

```json
{
  "project_id": "uuid",
  "model": "claude"
}
```

### Message History — response item shape

```ts
interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;        // raw saved text; may start with "[QUESTIONS_ASKED] " or "[DIAGRAMS_GENERATED] "
  images: string[];       // public image URLs attached to the message
  has_files: boolean;
  tokens_used: number;
  created_at: string;     // ISO-8601
}
```

> When content starts with `[QUESTIONS_ASKED] ` or `[DIAGRAMS_GENERATED] `, strip that prefix
> before displaying — the real text follows it, with a `\n` then JSON payload.

---

## Send Message — Core Endpoint

```http
POST /v1/ai-chat/new-messages/:chat-id
Authorization: Bearer <admin-jwt>
Content-Type: application/json
```

Add `?stream=true` to the URL to receive **Server-Sent Events** instead of a single JSON response.

---

## Request Body

```ts
interface NewMessageReq {
  // Main user text. Required unless pending_action is set.
  content: string;

  // Optional base64-encoded or URL images attached to the message.
  images?: string[];

  // Filled when confirming/cancelling a pending mutation (see PendingAction section).
  pending_action?: PendingAction;

  // Optional visual context for element-specific editing.
  context?: VisualContext[];

  // Required for frontend-editing flows (not needed for plain chat).
  microfrontend_id?: string;
  microfrontend_repo_id?: string;
  resource_env_id?: string;

  // Set true when creating a brand-new project from this chat.
  new_project?: boolean;

  // If the chat is already linked to a ucode project.
  ucode_project_id?: string;
}

interface VisualContext {
  path?: string;          // e.g. "src/components/layout/TopNav.tsx"
  line?: number;          // line number in the file
  element_name?: string;  // data-element-name attribute value
  outer_html?: string;    // element.outerHTML snapshot for visual reference
}
```

---

## Non-Streaming JSON Response

> Used when `?stream=true` is **not** set. Status `201 Created`.

```ts
interface SendMessageResponse {
  message: EnrichedMessage;

  // Updated McpProject if the AI modified frontend files.
  project?: McpProject | null;

  mcp_project_id: string;
  microfrontend_id: string;
  microfrontend_repo_id: string;
  ucode_project_id: string;

  // Present when AI wants to modify data (create/update/delete) and needs confirmation.
  pending_action?: PendingAction | null;

  // Present when AI asked clarifying questions.
  questions?: AiQuestion[] | null;

  // Present when AI generated BPMN/infra diagrams.
  plan?: HaikuPlan | null;
}

interface EnrichedMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;        // cleaned — prefix markers already stripped
  images: string[];
  has_files: boolean;
  tokens_used: number;
  created_at: string;
}
```

---

## Streaming SSE Mode

Add `?stream=true` to the request URL. The server responds with:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

Events arrive as newline-delimited `data:` lines. The stream ends when the channel closes
(no explicit `event: close` or `id:` lines are used).

**Architecture note:** the AI pipeline runs in a background goroutine, so if the browser
disconnects mid-stream the pipeline continues running. You will not get a partial result —
either `done` or `error` is always the last event.

---

## SSE Wire Format

Every event is a single `data:` line containing a JSON object, followed by a blank line:

```
data: {"type":"progress","message":"Начинаю обработку...","icon":"sparkles","percent":1}

data: {"type":"done","icon":"check-circle","percent":100,"message":"...","data":{...}}

```

```ts
interface SSEEvent {
  type: SSEEventType;
  message?: string;   // Human-readable status text shown to the user
  value?: string;     // Highlighted secondary label (file path, table name, etc.)
  icon?: string;      // Lucide icon name — render as <LucideIcon name={icon} />
  percent?: number;   // 0-100 progress percentage
  data?: unknown;     // Type-specific payload — see each event below
}

type SSEEventType =
  | 'provider'
  | 'progress'
  | 'plan'
  | 'table_start'
  | 'table_done'
  | 'manifest'
  | 'chunk_start'
  | 'chunk_done'
  | 'repair'
  | 'publish'
  | 'done'
  | 'error';
```

---

## All SSE Event Types

### Event: `provider`

Fired **immediately** as the very first event. Tells the frontend which AI provider and models
are powering this generation so you can show a "Generated by Gemini 2.5 Pro" badge.

```ts
// data field shape:
interface ProviderEventData {
  provider: 'gemini' | 'claude' | 'openai';
  router_model: string;   // fast classifier model id
  coder_model: string;    // main code-generation model id
}
```

Example:
```json
{
  "type": "provider",
  "icon": "cpu",
  "message": "Powered by Gemini 2.5 Pro",
  "data": {
    "provider": "gemini",
    "router_model": "gemini-2.0-flash",
    "coder_model": "gemini-2.5-pro-preview-06-05"
  }
}
```

---

### Event: `progress`

The workhorse — fired throughout the entire pipeline with human-readable status updates.
Show `message` as the status text, `value` as a highlighted secondary label (e.g. file name
or count), and render `icon` as a Lucide icon. Use `percent` to drive a progress bar (0-100).

```json
{ "type": "progress", "icon": "sparkles", "message": "Начинаю обработку...", "value": "gemini-2.0-flash", "percent": 1 }
{ "type": "progress", "icon": "scan-search", "message": "Анализирую проект и планирую изменения...", "percent": 5 }
{ "type": "progress", "icon": "brain", "message": "Разрабатываю архитектуру...", "percent": 10 }
{ "type": "progress", "icon": "database", "message": "Создаю таблицу users...", "percent": 20 }
{ "type": "progress", "icon": "code-2", "message": "Генерирую исходный код проекта...", "percent": 18 }
{ "type": "progress", "icon": "check-circle", "message": "Foundation готов", "value": "14 файлов", "percent": 38 }
{ "type": "progress", "icon": "shield-check", "message": "Проверяю качество кода", "value": "52 файла", "percent": 80 }
{ "type": "progress", "icon": "alert-triangle", "message": "Unsplash: не удалось подобрать фото", "value": "error text" }
```

**During agent creation** (`create_agent` intent), these specific progress events fire in order:

```json
{ "type": "progress", "icon": "bot",         "message": "Проектирую агента...",             "percent": 5  }
{ "type": "progress", "icon": "sparkles",    "message": "Создаю агента «Company Agent»...", "percent": 15 }
{ "type": "progress", "icon": "scan-search", "message": "Загружаю файлы проекта...",        "percent": 25 }
{ "type": "progress", "icon": "plug",        "message": "Готовлю клиент агента...",          "percent": 35 }
{ "type": "progress", "icon": "code-2",      "message": "Встраиваю агента в интерфейс...",  "percent": 45 }
{ "type": "progress", "icon": "upload-cloud","message": "Публикую изменения", "value": "3 файл(ов)", "percent": 92 }
{ "type": "progress", "icon": "check-circle","message": "Агент «Company Agent» готов и подключён", "percent": 100 }
```

---

### Event: `plan`

Fired after the AI architect phase completes. Contains the list of tables and pages planned
so the frontend can show a "here's what I'll build" preview before code generation starts.

```ts
interface PlanEventData {
  project_name: string;
  project_type: string;
  tables: string[];     // planned table names
  table_count: number;
}
```

```json
{
  "type": "plan",
  "icon": "layout-dashboard",
  "message": "Архитектура готова",
  "data": {
    "project_name": "CRM System",
    "project_type": "web",
    "tables": ["users", "companies", "deals"],
    "table_count": 3
  }
}
```

---

### Event: `table_start` / `table_done`

Fired during backend schema creation, one pair per table.
`value` contains the table name/slug being processed.

```json
{ "type": "table_start", "icon": "database", "message": "Создаю таблицу", "value": "companies" }
{ "type": "table_done",  "icon": "check",    "message": "Таблица создана", "value": "companies" }
```

No `data` field on these events.

---

### Event: `manifest`

Fired after the file manifest is planned but before code generation starts.
Shows total files and feature group breakdown.

```ts
interface ManifestEventData {
  total_files: number;
  group_count: number;
  feature_names: string[];  // e.g. ["Auth", "Dashboard", "Companies", "Deals"]
}
```

```json
{
  "type": "manifest",
  "icon": "list-tree",
  "message": "Структура файлов готова",
  "percent": 23,
  "data": {
    "total_files": 48,
    "group_count": 4,
    "feature_names": ["Auth", "Dashboard", "Companies", "Deals"]
  }
}
```

---

### Event: `chunk_start` / `chunk_done`

Fired for each feature group during parallel code generation.
`chunk_start` signals "generating this feature now".
`chunk_done` carries the completed files so you can show a live code preview.

```ts
interface ChunkStartData {
  feature: string;  // feature group name, e.g. "Companies"
}

interface ChunkDoneData {
  feature: string;
  index: number;    // 0-based index of this chunk
  total: number;    // total number of chunks
  files: ProjectFile[];
}

interface ProjectFile {
  path: string;
  content: string;
  change_summary?: string;
  purpose?: string;
}
```

```json
{ "type": "chunk_start", "icon": "file-text", "message": "Генерирую страницу", "value": "Companies",
  "data": { "feature": "Companies" } }

{ "type": "chunk_done",  "icon": "cpu", "message": "Генерирую фичи параллельно...", "percent": 60,
  "data": { "feature": "Companies", "index": 1, "total": 4, "files": [
    { "path": "src/pages/Companies/index.tsx", "content": "..." },
    { "path": "src/pages/Companies/CompanyForm.tsx", "content": "..." }
  ]}}
```

---

### Event: `repair`

Fired when the AI is auto-fixing a TypeScript/build error in a generated file.
Show this as a "fixing…" status so the user knows the pipeline is self-healing.

```json
{ "type": "repair", "message": "Исправляю: src/pages/Companies/index.tsx", "percent": 86 }
```

No `data` field.

---

### Event: `publish`

Fired when a file is being pushed to the repository. Expect one per modified file, then one
summary event with the total count.

```json
{ "type": "publish", "icon": "file-code",    "message": "Обновляю файл",       "value": "src/pages/Companies/index.tsx" }
{ "type": "publish", "icon": "upload-cloud", "message": "Публикую изменения",  "value": "14 файл(ов)", "percent": 92 }
```

No `data` field.

---

### Event: `done`

The **terminal event**. Always the last event in the stream. Carry the full AI response and
all IDs the frontend needs for navigation. After receiving this, close your SSE reader.

```ts
interface DoneEventData {
  // The saved assistant message — display this as the AI reply.
  message: EnrichedMessage;

  // The updated McpProject (set if the AI touched frontend files).
  project?: McpProject | null;

  // Project/frontend IDs for navigation.
  mcp_project_id: string;
  microfrontend_id: string;
  microfrontend_repo_id: string;
  ucode_project_id: string;

  // Set when the AI wants to perform a data mutation but needs user confirmation.
  pending_action?: PendingAction | null;

  // Set when the AI replied with clarifying questions instead of acting.
  questions?: AiQuestion[] | null;

  // Set when the AI generated BPMN / infra diagrams (answer to questionnaire).
  plan?: HaikuPlan | null;

  // How long the pipeline took.
  duration_sec: number;
}
```

```json
{
  "type": "done",
  "icon": "check-circle",
  "percent": 100,
  "message": "Агент «Company Agent» создан и подключён.",
  "data": {
    "message": {
      "id": "msg-uuid",
      "chat_id": "chat-uuid",
      "role": "assistant",
      "content": "Агент создан. Он будет...",
      "images": [],
      "has_files": false,
      "tokens_used": 1420,
      "created_at": "2026-06-12T10:00:00Z"
    },
    "mcp_project_id": "proj-uuid",
    "microfrontend_id": "mfe-uuid",
    "microfrontend_repo_id": "repo-uuid",
    "ucode_project_id": "ucode-uuid",
    "pending_action": null,
    "questions": null,
    "plan": null,
    "duration_sec": 34
  }
}
```

---

### Event: `error`

Fired when the AI pipeline fails. Display `message` to the user. Possible `icon` values:
`alert-circle` (generic), `ban` (token limit exceeded).

When `icon === "ban"`, the `data` field contains token-limit details:

```ts
interface TokenLimitData {
  limit: number;
  used: number;
  plan: string;
}
```

```json
{ "type": "error", "icon": "alert-circle", "message": "AI processing failed: context length exceeded" }
{ "type": "error", "icon": "ban",          "message": "Достигнут лимит токенов для этого проекта",
  "data": { "limit": 500000, "used": 500000, "plan": "Starter" } }
```

---

## All Icons Reference

Every icon string is a **Lucide** icon name. Map it to `<LucideIcon name={icon} />` or
the equivalent in your icon library.

| Icon string | When it appears |
|---|---|
| `sparkles` | start of processing, agent created |
| `cpu` | heartbeat/waiting, parallel generation |
| `brain` | architect phase, planning |
| `scan-search` | file analysis, loading project files |
| `database` | table creation |
| `link` | relation created |
| `code-2` | code editing / generation, frontend integration |
| `list-tree` | file manifest / structure ready |
| `layers` | parallel layout generation |
| `file-text` | feature chunk being generated |
| `file-code` | individual file publish |
| `upload-cloud` | push to repository |
| `check-circle` | phase complete |
| `check` | table done |
| `shield-check` | quality check, role created |
| `image` | image pool fetch |
| `plug` | agent client template |
| `bot` | agent spec design |
| `alert-triangle` | non-fatal warning (Unsplash failed, relation error) |
| `alert-circle` | fatal pipeline error |
| `ban` | token limit reached |
| `users` | client type created |
| `layout-dashboard` | plan ready |

---

## PendingAction Confirmation Flow

When the database assistant (or any AI flow) wants to modify data, it returns a `pending_action`
instead of executing immediately. The frontend must show a confirmation dialog, then send
a follow-up request.

### Step 1 — AI returns a pending action

In the **non-streaming** response or in `done.data.pending_action`:

```ts
interface PendingAction {
  action: 'create' | 'update' | 'delete';
  table_slug: string;
  filters?: Record<string, unknown>;   // which rows to update/delete
  data?: Record<string, unknown>;      // fields for create/update
  affected_count?: number;             // estimated rows affected
  description?: string;                // human-readable description of the action

  // UI text — display these directly:
  confirmation_prompt: string;  // e.g. "Удалить 3 заказа от Алексея?"
  success_message: string;      // shown after approved execution
  cancel_message: string;       // shown after user declines
}
```

### Step 2 — show a confirmation dialog

Display `confirmation_prompt` in a modal with **Confirm** and **Cancel** buttons.

### Step 3 — send the confirmation

```http
POST /v1/ai-chat/new-messages/:chat-id
Content-Type: application/json

{
  "content": "Да",
  "pending_action": {
    // the entire pending_action object returned in step 1, PLUS:
    "approved": true    // true = user confirmed, false = user cancelled
  }
}
```

`content` is optional — if omitted the server uses "Да" or "Нет" automatically.

### Step 4 — display the result

The server executes the mutation (if approved) and returns a normal assistant message
with `success_message` or `cancel_message` as content.

---

## Agent Creation via Chat — SSE Progress

When the builder types something like "создай агента который при создании company…",
the router detects `create_agent` intent and the pipeline emits a specific sequence of
`progress` and `publish` events instead of the usual code-generation events.

Complete event sequence for agent creation + frontend integration:

```
provider     → { provider, router_model, coder_model }
progress     → icon:sparkles  "Начинаю обработку..."           percent:1
progress     → icon:bot       "Проектирую агента..."            percent:5
progress     → icon:sparkles  "Создаю агента «<name»..."        percent:15
progress     → icon:scan-search "Загружаю файлы проекта..."     percent:25
progress     → icon:plug      "Готовлю клиент агента..."        percent:35
progress     → icon:code-2    "Встраиваю агента в интерфейс..." percent:45

  [heartbeat progress events every ~8 s while the model builds the widget]
  → icon:cpu "Проектирую виджет агента..."
  → icon:cpu "Подключаю чат к интерфейсу..."
  → icon:cpu "Согласую стиль с дизайн-системой..."
  → icon:cpu "Монтирую виджет в оболочку приложения..."
  → icon:cpu "Финализирую интеграцию..."

publish      → icon:file-code "Обновляю файл"  value:"src/lib/agentClient.ts"
publish      → icon:file-code "Обновляю файл"  value:"src/hooks/useAgent.ts"
publish      → icon:file-code "Обновляю файл"  value:"src/components/AgentWidget.tsx"
publish      → icon:upload-cloud "Публикую изменения" value:"3 файл(ов)" percent:92
progress     → icon:check-circle "Агент «<name>» готов и подключён" percent:100

done         → { message: { content: "Агент создан. ..." }, ... }
```

**What `done.data.message.content` contains after agent creation:**

```
Агент создан и готов к работе.

**Company Agent** — автоматически обрабатывает новые компании

Доступ к данным:
- company: create, read, list, update

Виджет агента добавлен в src/components/AgentWidget.tsx и подключён в App.tsx.
```

---

## Fetch Chat History

```http
GET /v1/ai-chat/messages/:chat-id
Authorization: Bearer <admin-jwt>
```

Returns an array of `ChatMessage` objects in chronological order.
Messages with content starting with `[QUESTIONS_ASKED] ` or `[DIAGRAMS_GENERATED] ` have a JSON
payload embedded after the first `\n` — the frontend should strip the prefix and parse the payload
separately for questions/plan rendering.

---

## Minimal Streaming Client (TypeScript)

```typescript
interface SSEEvent {
  type: string;
  message?: string;
  value?: string;
  icon?: string;
  percent?: number;
  data?: unknown;
}

async function streamMessage(
  chatId: string,
  body: object,
  onEvent: (ev: SSEEvent) => void,
): Promise<SSEEvent> {
  const resp = await fetch(`/v1/ai-chat/new-messages/${chatId}?stream=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastDone: SSEEvent | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev: SSEEvent = JSON.parse(line.slice(6));
        onEvent(ev);
        if (ev.type === 'done') lastDone = ev;
        if (ev.type === 'done' || ev.type === 'error') {
          reader.cancel();
          return lastDone ?? ev;
        }
      } catch {
        // malformed line — skip
      }
    }
  }

  if (!lastDone) throw new Error('Stream ended without a done event');
  return lastDone;
}
```

Usage:

```typescript
await streamMessage(
  chatId,
  { content: userMessage, microfrontend_id: mfeId, microfrontend_repo_id: repoId },
  (ev) => {
    if (ev.type === 'progress') setStatus({ message: ev.message!, icon: ev.icon, percent: ev.percent });
    if (ev.type === 'publish') addPublishedFile(ev.value!);
    if (ev.type === 'error') showError(ev.message!);
    if (ev.type === 'done') {
      const d = ev.data as DoneEventData;
      addAssistantMessage(d.message);
      if (d.pending_action) showConfirmationDialog(d.pending_action);
      if (d.questions) showQuestionsModal(d.questions);
    }
  },
);
```