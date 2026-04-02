import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { useTables } from '@/entities/database/api/database-api'
import { Copy, Check, Terminal, Loader2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { toast } from 'sonner'
import { cn } from '@/shared/lib/utils/cn'
import { useAuthStore } from '@/entities/session'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

interface ApiIntegrationsPageProps {
  projectId: string
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' }
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
      // Find 'users' or 'orders' or just take the first one
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
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const APIKey = '${API_KEY}'
const BaseURL = "https://admin-api.ucode.run/v2/items/${currentSlug}"

func setHeaders(req *http.Request) {
	req.Header.Set("authorization", "API-KEY")
	req.Header.Set("x-api-key", APIKey)
	req.Header.Set("Content-Type", "application/json")
}

// 1. Get all records
func GetRecords() ([]byte, error) {
	req, _ := http.NewRequest(http.MethodGet, BaseURL, nil)
	setHeaders(req)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// 2. Get a single record by ID
func GetRecord(id string) ([]byte, error) {
	req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/%s", BaseURL, id), nil)
	setHeaders(req)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// 3. Create a new record
func CreateRecord(data map[string]any) ([]byte, error) {
	payload, _ := json.Marshal(map[string]any{"data": data})
	req, _ := http.NewRequest(http.MethodPost, BaseURL, bytes.NewBuffer(payload))
	setHeaders(req)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// 4. Update an existing record
func UpdateRecord(id string, data map[string]any) ([]byte, error) {
	data["guid"] = id
	payload, _ := json.Marshal(map[string]any{"data": data})
	req, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("%s/%s", BaseURL, id), bytes.NewBuffer(payload))
	setHeaders(req)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// 5. Delete a record
func DeleteRecord(id string) ([]byte, error) {
	payload, _ := json.Marshal(map[string]any{"data": map[string]any{}})
	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/%s", BaseURL, id), bytes.NewBuffer(payload))
	setHeaders(req)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
`

  const codeMap: Record<string, string> = {
    javascript: jsCode,
    python: pythonCode,
    go: goCode
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 h-full max-h-screen">

      {/* Header Area */}
      {/* <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-6 justify-between md:items-center">
        <div>
          <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
            <Terminal className="text-primary" size={24} />
            API Integrations
          </h2>
          <p className="text-text-muted text-sm mt-1 max-w-2xl">
            A quick-start guide to using our REST API. Select your table to automatically generate the appropriate integration codebase in your preferred language.
          </p>
        </div>


      </div> */}

      {/* Editor Area */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl shadow-sm flex-1 flex flex-col min-h-[600px] overflow-hidden">
        {/* Tabs & Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-bg-sidebar/30 flex-wrap gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setActiveTab(lang.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-xl transition-all",
                    activeTab === lang.id
                      ? "bg-bg-main text-text-main shadow-sm border border-border-subtle"
                      : "text-text-muted hover:text-text-main hover:bg-bg-main/50 border border-transparent"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-border-subtle hidden md:block"></div>

            <div className="w-full md:w-56">
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="bg-bg-main border-border-subtle h-9 rounded-xl text-sm w-full">
                  <SelectValue placeholder={isLoadingTables ? 'Loading tables...' : 'Choose a table...'} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {isLoadingTables ? (
                    <div className="p-4 text-center text-sm text-text-muted">Loading...</div>
                  ) : tables.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-muted">No tables found</div>
                  ) : (
                    tables.map(t => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {(t as any).title || (t as any).name || t.slug}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="rounded-xl h-9 px-4 border-border-subtle gap-2 bg-bg-main"
          >
            {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {isCopied ? 'Copied' : 'Copy Code'}
          </Button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 bg-bg-main relative p-1 pb-0">
          {isLoadingTables && (
            <div className="absolute inset-0 z-10 bg-bg-main flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="text-text-muted text-sm">Preparing editor...</span>
            </div>
          )}
          <Editor
            height="100%"
            language={getMonacoLanguage()}
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
            value={activeCode}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
              lineHeight: 1.6,
              renderLineHighlight: 'all',
              readOnly: true
            }}
          />
        </div>
      </div>
    </div>
  )
}
