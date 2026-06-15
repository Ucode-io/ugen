# Agents — Frontend Integration Guide

Everything the frontend needs to manage agents (CRUD) and execute them from the generated
end-user app: data schemas, all endpoints, request/response shapes, and complete ready-to-use
TypeScript files that are auto-injected into every project.

---

## Table of Contents

1. [What is an Agent](#what-is-an-agent)
2. [Data Schemas](#data-schemas)
   - [Agent](#agent-object)
   - [AgentPermission](#agentpermission-object)
   - [AgentRun](#agentrun-object)
   - [AgentRunStep](#agentrunstep-object)
3. [Admin Agent CRUD](#admin-agent-crud)
   - [Create Agent](#create-agent)
   - [List Agents](#list-agents)
   - [Get Agent](#get-agent)
   - [Update Agent](#update-agent)
   - [Delete Agent](#delete-agent)
4. [Admin — Run Agent & Audit Logs](#admin--run-agent--audit-logs)
   - [Run Agent (admin test)](#run-agent-admin-test)
   - [Get Agent Runs](#get-agent-runs)
   - [Get Agent Run Detail](#get-agent-run-detail)
5. [End-User — Run Agent (Frontend)](#end-user--run-agent-frontend)
6. [Injected Template Files](#injected-template-files)
   - [src/lib/agentClient.ts](#srclibagentclientts)
   - [src/hooks/useAgent.ts](#srchooksuseagentts)
7. [Usage Patterns](#usage-patterns)
   - [Chat Widget (floating button)](#chat-widget-floating-button)
   - [Action-Triggered Agent (form onSubmit)](#action-triggered-agent-form-onsubmit)
8. [Permissions Reference](#permissions-reference)

---

## What is an Agent

An agent is a server-side AI assistant that end-users of a generated application talk to.
The builder creates the agent (through the AI chat or via API), and the agent is embedded
into the generated frontend app. At runtime the agent:

- Reads and writes the project's own database tables through a typed CRUD API (only the
  tables it was granted in `permissions`).
- Fetches public web URLs (`web_fetch`) to research external information that is not in the
  database — live exchange rates, company websites, public APIs, etc.

Two modes:

| Mode | Trigger | How to implement |
|---|---|---|
| **Chat** | User types a message | Use `useAgent()` hook, render a chat UI |
| **Action-triggered** | App event (form save, record created, …) | Call `runAgent()` in `onSubmit`, pass the record as `context` |

---

## Data Schemas

### Agent Object

```ts
interface Agent {
  id: string;
  project_id: string;
  name: string;           // Short display name, e.g. "Company Assistant"
  description: string;   // One sentence for the builder's reference
  instruction: string;  // Full system prompt the agent runs with at runtime
  model: string;         // AI model id, e.g. "claude-sonnet-4-6"
  max_steps: number;     // Max tool-call iterations per run (default 8, max ~20)
  enabled: boolean;      // Disabled agents reject all run requests
  permissions: AgentPermission[];
  created_at: string;    // ISO-8601
  updated_at: string;
}
```

### AgentPermission Object

Each permission entry grants the agent access to **one table**.

```ts
interface AgentPermission {
  id: string;          // Set by the server on read; omit on create/update
  agent_id: string;    // Set by the server; omit on create/update
  table_slug: string;  // Exact slug from the project schema (e.g. "company")
  can_create: boolean;
  can_read: boolean;   // Read one record by id
  can_update: boolean;
  can_delete: boolean;
  can_list: boolean;   // List / filter records
}
```

> `web_fetch` (external URL fetching) is **always available** and requires no permission entry.

### AgentRun Object

Each call to `/run` produces an `AgentRun` audit record with a step-by-step trace.

```ts
interface AgentRun {
  id: string;
  agent_id: string;
  project_id: string;
  status: 'running' | 'succeeded' | 'failed';
  input: {
    message: string;
    context?: Record<string, unknown>;
  };
  output: string;          // The agent's final natural-language answer
  steps: AgentRunStep[];   // Tool calls made during the run
  tokens_used: number;     // Total input + output tokens across all steps
  error: string;           // Non-empty only when status === 'failed'
  created_at: string;
  updated_at: string;
}
```

### AgentRunStep Object

```ts
interface AgentRunStep {
  index: number;
  tool_name: string;              // "item_create" | "item_get" | "item_list" | "item_update" | "item_delete" | "web_fetch"
  tool_input: Record<string, unknown>;   // Arguments the model passed to the tool
  tool_result: string;            // JSON string returned by the tool
  is_error: boolean;              // true if this tool call failed
}
```

---

## Admin Agent CRUD

All admin endpoints require:
```http
Authorization: Bearer <admin-jwt>
```

Base path: `/v1/agents` (under `AdminAuthMiddleware` — same token you use for `/v1/ai-chat`).

---

### Create Agent

```http
POST /v1/agents
```

**Request body:**

```ts
interface CreateAgentBody {
  name: string;
  description?: string;
  instruction: string;     // System prompt for the agent
  model?: string;          // Defaults to project's configured model
  max_steps?: number;      // Default: 8
  enabled?: boolean;       // Default: true
  permissions: Array<{
    table_slug: string;
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    can_list?: boolean;
  }>;
}
```

**Example:**

```json
{
  "name": "Company Assistant",
  "description": "Fills company descriptions from their website when a record is created.",
  "instruction": "You are a Company Assistant. When a company is created with a link field, fetch the website and write a concise summary into the description. Act immediately — do not ask for confirmation.",
  "model": "claude-sonnet-4-6",
  "max_steps": 10,
  "enabled": true,
  "permissions": [
    {
      "table_slug": "company",
      "can_read": true,
      "can_list": true,
      "can_update": true
    }
  ]
}
```

**Response:** `201 Created` → `Agent` object

---

### List Agents

```http
GET /v1/agents
```

**Query params:**

| Param | Type | Description |
|---|---|---|
| `project_id` | string | Filter by project |
| `name` | string | Filter by name (partial match) |
| `model` | string | Filter by model id |
| `order_by` | string | Column to sort by (e.g. `created_at`) |
| `order_direction` | `asc` \| `desc` | Sort direction |
| `limit` | number | Page size (default 20) |
| `offset` | number | Pagination offset (default 0) |

**Response:**

```ts
interface GetAllAgentsResponse {
  agents: Agent[];
  count: number;
}
```

---

### Get Agent

```http
GET /v1/agents/:agent-id
```

**Response:** `200 OK` → `Agent` object

---

### Update Agent

Full replace — every field including `permissions` is overwritten.

```http
PUT /v1/agents/:agent-id
```

**Request body:** same shape as Create (all fields, full `permissions` array).

**Response:** `200 OK` → updated `Agent` object

#### Enable / Disable an agent

Send the full agent body with `"enabled": false` to disable, `"enabled": true` to re-enable.
Disabled agents reject all `/run` requests with `400 Bad Request: agent is disabled`.

#### Update permissions

Send the full agent with a new `permissions` array. The server performs a full replace — any
permission entry not included in the request is deleted.

```json
{
  "name": "Company Assistant",
  "instruction": "...",
  "enabled": true,
  "permissions": [
    { "table_slug": "company", "can_read": true, "can_list": true, "can_update": true },
    { "table_slug": "contact", "can_list": true, "can_read": true }
  ]
}
```

---

### Delete Agent

```http
DELETE /v1/agents/:agent-id
```

**Response:** `200 OK` → `{ "message": "deleted" }` (or the empty agent object)

---

## Admin — Run Agent & Audit Logs

### Run Agent (admin test)

Runs the agent as the admin — useful for testing before deploying to end-users.
Uses the same execution engine as the end-user endpoint.

```http
POST /v1/agents/:agent-id/run
```

**Request body:**

```ts
interface RunAgentBody {
  message: string;                       // The user's message / task description
  context?: Record<string, unknown>;    // Optional structured context (e.g. a record)
}
```

**Example — test the company-link scenario:**

```json
{
  "message": "Fill the description for the company I just created.",
  "context": {
    "company": {
      "id": "company-uuid",
      "guid": "company-uuid",
      "name": "Acme Corp",
      "link": "https://acmecorp.com"
    }
  }
}
```

**Response:** `200 OK` → `AgentRun` object (full, including all steps)

---

### Get Agent Runs

Paginated audit log of all runs for an agent.

```http
GET /v1/agents/:agent-id/runs
```

**Query params:**

| Param | Type | Description |
|---|---|---|
| `status` | `succeeded` \| `failed` \| `running` | Filter by status |
| `order_by` | string | e.g. `created_at` |
| `order_direction` | `asc` \| `desc` | Default desc |
| `limit` | number | Default 20 |
| `offset` | number | Default 0 |

**Response:**

```ts
interface GetAllAgentRunsResponse {
  agent_runs: AgentRun[];
  count: number;
}
```

---

### Get Agent Run Detail

```http
GET /v1/agent-runs/:run-id
```

**Response:** `200 OK` → `AgentRun` object with full `steps` array

Use this to build a "run details" panel showing the agent's reasoning trace — which tools
it called, with what arguments, and what each tool returned.

**Rendering a step trace:**

| `tool_name` | What it means | Useful fields in `tool_input` |
|---|---|---|
| `item_create` | Created a record | `table_slug`, `data` |
| `item_get` | Read one record by id | `table_slug`, `guid` |
| `item_list` | Listed/searched records | `table_slug`, `filters`, `limit` |
| `item_update` | Updated a record | `table_slug`, `guid`, `data` |
| `item_delete` | Deleted a record | `table_slug`, `guid` |
| `web_fetch` | Fetched external URL | `url` |

---

## End-User — Run Agent (Frontend)

End-users of the generated application call this endpoint. Authentication is by **project API key**
(the `X-API-KEY` header that the generated frontend already uses for `/v2/items/*`).

```http
POST /v2/agents/:agent-id/run
X-API-KEY: <project-api-key>
Content-Type: application/json
```

**Request body:**

```ts
interface RunAgentBody {
  message: string;
  context?: Record<string, unknown>;
}
```

**Response:** `200 OK` → `AgentRun` object

> The frontend template files (below) abstract this endpoint — you should use them instead
> of calling it directly.

---

## Injected Template Files

When the builder creates an agent through the AI chat, two files are **automatically injected**
into the generated project. They are the authoritative networking layer — never modify them
manually; let the agent-creation flow own them.

### src/lib/agentClient.ts

```typescript
import apiClient from '@/config/axios';

export interface AgentRunStep {
  index: number;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_result: string;
  is_error: boolean;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  status: 'running' | 'succeeded' | 'failed';
  output: string;
  steps: AgentRunStep[];
  tokens_used: number;
  error: string;
}

export interface RunAgentResult {
  reply: string;
  run: AgentRun;
}

/**
 * runAgent sends a single message to a server-side AI agent and resolves with its
 * reply. Pass optional structured context (e.g. the record the user is viewing) so
 * the agent can ground its answer.
 */
export async function runAgent(
  agentId: string,
  message: string,
  context?: Record<string, unknown>,
): Promise<RunAgentResult> {
  const res = await apiClient.post('/v2/agents/' + agentId + '/run', { message, context });
  const run: AgentRun = res?.data?.data ?? ({} as AgentRun);
  if (run.status === 'failed') {
    throw new Error(run.error || 'Agent run failed');
  }
  return { reply: run.output ?? '', run };
}

export default runAgent;
```

### src/hooks/useAgent.ts

```typescript
import { useCallback, useRef, useState } from 'react';
import { runAgent } from '@/lib/agentClient';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UseAgentOptions {
  /** Optional structured context sent with every message (e.g. the current record). */
  context?: Record<string, unknown>;
}

export interface UseAgentResult {
  messages: AgentMessage[];
  isLoading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

let counter = 0;
const nextId = (): string => 'm' + Date.now().toString() + '_' + (counter++).toString();

/**
 * useAgent manages a chat session with a server-side AI agent identified by agentId.
 * It keeps the running transcript, exposes a send() action, and surfaces loading and
 * error state for the UI.
 */
export function useAgent(agentId: string, options: UseAgentOptions = {}): UseAgentResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextRef = useRef(options.context);
  contextRef.current = options.context;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setIsLoading(true);
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }]);

      try {
        const { reply } = await runAgent(agentId, trimmed, contextRef.current);
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: reply }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, isLoading],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, reset };
}

export default useAgent;
```

---

## Usage Patterns

### Chat Widget (floating button)

For a conversational agent the AI integrator builds a floating chat button. Here is the
pattern to understand / replicate it:

```tsx
import { useState, useRef, useEffect } from 'react';
import { useAgent } from '@/hooks/useAgent';

// The agent ID is hardcoded — the AI integrator sets this const automatically.
const AGENT_ID = 'your-agent-uuid-here';

export function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, send, reset } = useAgent(AGENT_ID);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await send(text);
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-primary p-4 text-white shadow-lg"
        aria-label="Open AI Assistant"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[480px] w-96 flex-col rounded-2xl border bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">AI Assistant</span>
            <button onClick={reset} className="text-xs text-muted-foreground">Clear</button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                How can I help you today?
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground animate-pulse">
                  Thinking…
                </div>
              </div>
            )}
            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Type a message…"
                value={input}
                disabled={isLoading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

Mount it in your app shell (layout/root component) so it appears on every page:

```tsx
// App.tsx or Layout.tsx
import { AgentChatWidget } from '@/components/AgentChatWidget';

export function App() {
  return (
    <>
      <Router />
      <AgentChatWidget />   {/* always visible, floating bottom-right */}
    </>
  );
}
```

---

### Action-Triggered Agent (form onSubmit)

For an agent that runs **automatically** when the user saves a form (e.g. "on company create,
fetch the website, write a summary into description"), use `runAgent()` directly in the submit
handler. Pass the newly-created record as `context` so the agent knows which record to update.

The agent runs silently in the background — the user does not type anything. Show a loading
indicator and display the agent's reply as a toast/notification.

```tsx
import { useState } from 'react';
import { runAgent } from '@/lib/agentClient';
import { useForm } from 'react-hook-form';

// Hardcoded agent ID set by the AI integrator.
const COMPANY_AGENT_ID = 'your-agent-uuid-here';

interface CompanyFormValues {
  name: string;
  link: string;
  // … other fields
}

export function CreateCompanyForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CompanyFormValues>();
  const [agentStatus, setAgentStatus] = useState<string | null>(null);

  const onSubmit = async (values: CompanyFormValues) => {
    // 1. Create the company record via your normal items API.
    const res = await apiClient.post('/v2/items/company', values);
    const createdCompany = res.data?.data;

    if (!createdCompany?.guid) return;

    // 2. If the company has a link, trigger the agent to fetch the site and fill description.
    if (values.link) {
      setAgentStatus('AI is researching the company website…');
      try {
        const { reply } = await runAgent(
          COMPANY_AGENT_ID,
          'A new company was just created. Fetch its website, write a summary, and save it to the description.',
          {
            company: {
              guid: createdCompany.guid,
              name: createdCompany.name,
              link: createdCompany.link ?? values.link,
            },
          },
        );
        setAgentStatus(reply);                // e.g. "Description updated successfully."
      } catch (err) {
        setAgentStatus('Could not enrich company automatically.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="Company name" />
      <input {...register('link')} placeholder="Website URL (optional)" />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Create Company'}
      </button>

      {agentStatus && (
        <p className="mt-2 text-sm text-muted-foreground">{agentStatus}</p>
      )}
    </form>
  );
}
```

**Key rules for action-triggered agents:**

1. Always pass the created/updated record as `context.{table_slug}` with `guid` included.
2. The agent does NOT ask for confirmation — it acts immediately by design.
3. Call `runAgent()` **after** the primary API call succeeds, not before.
4. Show a non-blocking status (spinner, toast) — do not block the UI waiting for the agent.
5. Agent errors are soft failures — the record is already saved; log the error but let the user continue.

---

## Permissions Reference

When creating or updating an agent, set only the operations the agent genuinely needs:

| Permission | When to grant |
|---|---|
| `can_list` | Agent needs to search or filter records (always needed with `can_read`) |
| `can_read` | Agent needs to fetch one record by id |
| `can_create` | Agent needs to insert new records |
| `can_update` | Agent needs to modify existing records |
| `can_delete` | Only when the task explicitly requires deleting records |

**Web research (`web_fetch`)** — no permission entry needed. It is always available to every agent.

### Minimal permission sets by use case

| Use case | Permissions needed |
|---|---|
| Read-only assistant (answers questions about data) | `can_list`, `can_read` |
| Booking / scheduling agent | `can_list`, `can_read`, `can_create` |
| Data enrichment agent (fills description from website) | `can_list`, `can_read`, `can_update` |
| Full data management agent | `can_list`, `can_read`, `can_create`, `can_update` |
| Cleanup / archival agent | `can_list`, `can_read`, `can_delete` |
