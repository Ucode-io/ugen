import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { useTables } from '@/entities/database/api/database-api'
import { Copy, Check, Loader2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { toast } from 'sonner'
import { useAuthStore } from '@/entities/session'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

interface ApiIntegrationsPageProps {
  projectId: string
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
]

export const ApiIntegrationsPage = ({ projectId }: ApiIntegrationsPageProps) => {
  const { data: tables = [], isLoading: isLoadingTables } = useTables()
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [activeTab, setActiveTab] = useState('javascript')
  const [isCopied, setIsCopied] = useState(false)
  const { theme } = useUIStore()

  const API_KEY = useAuthStore((state) => state.apiKey)

  // Auto-select first table if none selected
  useMemo(() => {
    if (tables.length > 0 && !selectedTable) {
      const defaultTable = tables.find(t => t.slug === 'users') || tables[0]
      if (defaultTable) {
        setSelectedTable(defaultTable.slug)
      }
    }
  }, [tables, selectedTable])

  const currentSlug = selectedTable || 'table_name'

  const jsCode = `const API_KEY = '${API_KEY}';
const BASE_URL = 'https://admin-api.ucode.run/v2/items/${currentSlug}';

const headers = {
  'authorization': 'API-KEY',
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

// 1. Get all records
async function getRecords() {
  const response = await fetch(BASE_URL, { method: 'GET', headers });
  return response.json();
}

// 2. Get a single record by ID
async function getRecord(id) {
  const response = await fetch(\`\${BASE_URL}/\${id}\`, { method: 'GET', headers });
  return response.json();
}

// 3. Create a new record
async function createRecord(data) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data })
  });
  return response.json();
}

// 4. Update an existing record
async function updateRecord(id, data) {
  const response = await fetch(\`\${BASE_URL}/\${id}\`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ data: { guid: id, ...data } })
  });
  return response.json();
}

// 5. Delete a record
async function deleteRecord(id) {
  const response = await fetch(\`\${BASE_URL}/\${id}\`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ data: {} })
  });
  return response.json();
}

// --- Example Usage ---
// createRecord({ status: 'active', title: 'New Item' })
//   .then(res => console.log('Created:', res));
`

  const pythonCode = `import requests

API_KEY = '${API_KEY}'
BASE_URL = "https://admin-api.ucode.run/v2/items/${currentSlug}"
HEADERS = {
    "authorization": "API-KEY",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# 1. Get all records
def get_records():
    response = requests.get(BASE_URL, headers=HEADERS)
    response.raise_for_status()
    return response.json()

# 2. Get a single record by ID
def get_record(record_id: str):
    response = requests.get(f"{BASE_URL}/{record_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()

# 3. Create a new record
def create_record(data: dict):
    response = requests.post(BASE_URL, headers=HEADERS, json={"data": data})
    response.raise_for_status()
    return response.json()

# 4. Update an existing record
def update_record(record_id: str, data: dict):
    payload = {"data": {"guid": record_id, **data}}
    response = requests.put(f"{BASE_URL}/{record_id}", headers=HEADERS, json=payload)
    response.raise_for_status()
    return response.json()

# 5. Delete a record
def delete_record(record_id: str):
    response = requests.delete(f"{BASE_URL}/{record_id}", headers=HEADERS, json={"data": {}})
    response.raise_for_status()
    return response.json()

# --- Example Usage ---
# new_item = create_record({"status": "active", "title": "New Item"})
# print("Created:", new_item)
`

  const goCode = `package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"io"
\t"net/http"
)

const APIKey = "${API_KEY}"
const BaseURL = "https://admin-api.ucode.run/v2/items/${currentSlug}"

func setHeaders(req *http.Request) {
\treq.Header.Set("authorization", "API-KEY")
\treq.Header.Set("x-api-key", APIKey)
\treq.Header.Set("Content-Type", "application/json")
}

// 1. Get all records
func GetRecords() ([]byte, error) {
\treq, _ := http.NewRequest(http.MethodGet, BaseURL, nil)
\tsetHeaders(req)
\tresp, err := (&http.Client{}).Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()
\treturn io.ReadAll(resp.Body)
}

// 2. Get a single record by ID
func GetRecord(id string) ([]byte, error) {
\treq, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/%s", BaseURL, id), nil)
\tsetHeaders(req)
\tresp, err := (&http.Client{}).Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()
\treturn io.ReadAll(resp.Body)
}

// 3. Create a new record
func CreateRecord(data map[string]any) ([]byte, error) {
\tpayload, _ := json.Marshal(map[string]any{"data": data})
\treq, _ := http.NewRequest(http.MethodPost, BaseURL, bytes.NewBuffer(payload))
\tsetHeaders(req)
\tresp, err := (&http.Client{}).Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()
\treturn io.ReadAll(resp.Body)
}

// 4. Update an existing record
func UpdateRecord(id string, data map[string]any) ([]byte, error) {
\tdata["guid"] = id
\tpayload, _ := json.Marshal(map[string]any{"data": data})
\treq, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("%s/%s", BaseURL, id), bytes.NewBuffer(payload))
\tsetHeaders(req)
\tresp, err := (&http.Client{}).Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()
\treturn io.ReadAll(resp.Body)
}

// 5. Delete a record
func DeleteRecord(id string) ([]byte, error) {
\tpayload, _ := json.Marshal(map[string]any{"data": map[string]any{}})
\treq, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/%s", BaseURL, id), bytes.NewBuffer(payload))
\tsetHeaders(req)
\tresp, err := (&http.Client{}).Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()
\treturn io.ReadAll(resp.Body)
}
`

  const codeMap: Record<string, string> = {
    javascript: jsCode,
    python: pythonCode,
    go: goCode,
  }

  const activeCode = codeMap[activeTab]

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode)
    setIsCopied(true)
    toast.success('Code copied to clipboard')
    setTimeout(() => setIsCopied(false), 2000)
  }

  const getMonacoLanguage = () => {
    switch (activeTab) {
      case 'javascript': return 'javascript'
      case 'python': return 'python'
      case 'go': return 'go'
      default: return 'javascript'
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Two dropdowns above the editor ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Select Table
          </Label>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="h-10 bg-bg-card border-border-subtle rounded-xl text-sm">
              <SelectValue placeholder={isLoadingTables ? 'Loading…' : 'Choose a table…'} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] rounded-xl border-border-subtle shadow-xl">
              <SelectGroup>
                <SelectLabel>Tables</SelectLabel>
                {isLoadingTables ? (
                  <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                ) : tables.length === 0 ? (
                  <SelectItem value="__empty__" disabled>No tables found</SelectItem>
                ) : (
                  tables.map((t: any) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.title || t.name || t.slug}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Programming Language
          </Label>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="h-10 bg-bg-card border-border-subtle rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border-subtle shadow-xl">
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Code card ── */}
      <div className="border border-border-subtle rounded-2xl overflow-hidden bg-bg-card shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-bg-sidebar/40">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Generated SDK Code
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-xs rounded-lg hover:bg-primary/10 hover:text-primary"
            onClick={handleCopy}
          >
            {isCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {isCopied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Monaco Editor – fixed height to prevent 5px collapse */}
        <div className="relative" style={{ height: 500 }}>
          {isLoadingTables && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-card/60 backdrop-blur-sm">
              <Loader2 className="animate-spin text-primary" size={22} />
            </div>
          )}
          <Editor
            height={500}
            language={getMonacoLanguage()}
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
            value={activeCode}
            options={{
              minimap: { enabled: false },
              fontSize: 13.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
              lineHeight: 1.65,
              renderLineHighlight: 'all',
              readOnly: true,
              domReadOnly: true,
            }}
          />
        </div>
      </div>
    </div>
  )
}
