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
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
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
  { id: 'curl', label: 'cURL' },
  { id: 'dart', label: 'Dart' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'swift', label: 'Swift' },
]

export const ApiIntegrationsPage = ({ projectId }: ApiIntegrationsPageProps) => {
  const { data: tables = [], isLoading: isLoadingTables } = useTables()
  const { data: endpoints = [], isLoading: isLoadingEndpoints } = useQuery({
    queryKey: ['custom-endpoints-list'],
    queryFn: async () => {
      const { data } = await api.get('/v1/custom-endpoints')
      console.log({ data })
      return data?.data?.endpoints || []
    },
    staleTime: 0,
  })

  // Value format: "table:slug" or "endpoint:id"
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [activeTab, setActiveTab] = useState('javascript')
  const [isCopied, setIsCopied] = useState(false)
  const { theme } = useUIStore()

  const API_KEY = useAuthStore((state) => state.apiKey)

  // Auto-select first item if none selected
  useMemo(() => {
    if (!selectedItem) {
      if (tables.length > 0) {
        const defaultTable = tables.find(t => t.slug === 'users') || tables[0]
        if (defaultTable) setSelectedItem(`table:${defaultTable.slug}`)
      } else if (endpoints.length > 0) {
        setSelectedItem(`endpoint:${endpoints[0].id}`)
      }
    }
  }, [tables, endpoints, selectedItem])

  const isEndpoint = selectedItem.startsWith('endpoint:')
  const currentId = selectedItem.split(':')[1] || 'current_id'

  const currentEndpoint = useMemo(() => {
    if (!isEndpoint) return null
    return endpoints.find((e: any) => e.id === currentId)
  }, [endpoints, currentId, isEndpoint])

  const toCamelCase = (str: string) => {
    return str.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
  }

  const toPascalCase = (str: string) => {
    const camel = toCamelCase(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }

  const fnNameJS = currentEndpoint?.name ? toCamelCase(currentEndpoint.name).replace(/\s+/g, '') : 'runEndpoint'
  const fnNameGo = currentEndpoint?.name ? toPascalCase(currentEndpoint.name).replace(/\s+/g, '') : 'RunEndpoint'
  const fnNamePy = currentEndpoint?.name ? currentEndpoint.name.toLowerCase().replace(/\s+/g, '_') : 'run_endpoint'
  const description = currentEndpoint?.description || 'Executes the custom endpoint'

  // Code Templates
  const jsCode = isEndpoint
    ? `const API_KEY = '${API_KEY}';
const id = '${currentId}';
const BASE_URL = \`https://admin-api.ucode.run/v1/custom-endpoints/\${id}/run\`;

const headers = {
  'authorization': 'API-KEY',
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

/**
 * ${currentEndpoint?.name || 'Custom Endpoint'}
 * ${description}
 */
async function ${fnNameJS}(params) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ params })
  });
  return response.json();
}

// Example usage:
// ${fnNameJS}({ key: 'value' }).then(console.log);
`
    : `const API_KEY = '${API_KEY}';
const BASE_URL = 'https://admin-api.ucode.run/v2/items/${currentId}';

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

  const pythonCode = isEndpoint
    ? `import requests

API_KEY = '${API_KEY}'
ENDPOINT_ID = '${currentId}'
URL = f"https://admin-api.ucode.run/v1/custom-endpoints/{ENDPOINT_ID}/run"

headers = {
    "authorization": "API-KEY",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def ${fnNamePy}(params):
    """
    ${currentEndpoint?.name || 'Custom Endpoint'}
    ${description}
    """
    response = requests.post(URL, headers=headers, json={"params": params})
    return response.json()

# Example usage:
# print(${fnNamePy}({"key": "value"}))
`
    : `import requests

API_KEY = '${API_KEY}'
BASE_URL = "https://admin-api.ucode.run/v2/items/${currentId}"
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

  const goCode = isEndpoint
    ? `package main

import (
\t"bytes"
\t"encoding/json"
\t"net/http"
)

const API_KEY = "${API_KEY}"
const ENDPOINT_ID = "${currentId}"
const URL = "https://admin-api.ucode.run/v1/custom-endpoints/" + ENDPOINT_ID + "/run"

// ${currentEndpoint?.name || 'Custom Endpoint'}
// ${description}
func ${fnNameGo}(params map[string]string) (interface{}, error) {
\tpayload := map[string]interface{}{
\t\t"params": params,
\t}
\tbody, _ := json.Marshal(payload)

\treq, _ := http.NewRequest("POST", URL, bytes.NewBuffer(body))
\treq.Header.Set("authorization", "API-KEY")
\treq.Header.Set("x-api-key", API_KEY)
\treq.Header.Set("Content-Type", "application/json")

\tresp, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer resp.Body.Close()

\tvar result interface{}
\tjson.NewDecoder(resp.Body).Decode(&result)
\treturn result, nil
}
`
    : `package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"io"
\t"net/http"
)

const APIKey = "${API_KEY}"
const BaseURL = "https://admin-api.ucode.run/v2/items/${currentId}"

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

  const curlCode = isEndpoint
    ? `curl -X POST "https://admin-api.ucode.run/v1/custom-endpoints/${currentId}/run" \\
     -H "authorization: API-KEY" \\
     -H "x-api-key: ${API_KEY}" \\
     -H "Content-Type: application/json" \\
     -d '{
           "params": {
             "key": "value"
           }
         }'`
    : `# 1. Get all records
curl -X GET "https://admin-api.ucode.run/v2/items/${currentId}" \\
     -H "authorization: API-KEY" \\
     -H "x-api-key: ${API_KEY}"

# 2. Get a single record
curl -X GET "https://admin-api.ucode.run/v2/items/${currentId}/RECORD_ID" \\
     -H "authorization: API-KEY" \\
     -H "x-api-key: ${API_KEY}"

# 3. Create a new record
curl -X POST "https://admin-api.ucode.run/v2/items/${currentId}" \\
     -H "authorization: API-KEY" \\
     -H "x-api-key: ${API_KEY}" \\
     -H "Content-Type: application/json" \\
     -d '{"data": {"title": "New Item"}}'
`

  const dartCode = isEndpoint
    ? `import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> runEndpoint() async {
  final url = Uri.parse('https://admin-api.ucode.run/v1/custom-endpoints/${currentId}/run');
  final headers = {
    'authorization': 'API-KEY',
    'x-api-key': '${API_KEY}',
    'Content-Type': 'application/json',
  };

  final response = await http.post(
    url,
    headers: headers,
    body: jsonEncode({
      'params': {'key': 'value'},
    }),
  );

  print('Response: \${response.body}');
}
`
    : `import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String baseUrl = 'https://admin-api.ucode.run/v2/items/${currentId}';
  static const Map<String, String> headers = {
    'authorization': 'API-KEY',
    'x-api-key': '${API_KEY}',
    'Content-Type': 'application/json',
  };

  // Get all records
  static Future<List<dynamic>> getItems() async {
    final response = await http.get(Uri.parse(baseUrl), headers: headers);
    return jsonDecode(response.body);
  }

  // Create record
  static Future<dynamic> createItem(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse(baseUrl),
      headers: headers,
      body: jsonEncode({'data': data}),
    );
    return jsonDecode(response.body);
  }
}
`

  const kotlinCode = isEndpoint
    ? `import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

val API_KEY = "${API_KEY}"
val URL = "https://admin-api.ucode.run/v1/custom-endpoints/${currentId}/run"

fun runEndpoint(params: Map<String, Any>) {
    val client = OkHttpClient()
    val json = JSONObject().apply {
        put("params", JSONObject(params))
    }
    
    val body = json.toString().toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url(URL)
        .post(body)
        .addHeader("authorization", "API-KEY")
        .addHeader("x-api-key", API_KEY)
        .build()

    client.newCall(request).execute().use { response ->
        println(response.body?.string())
    }
}
`
    : `import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class ApiClient {
    private val client = OkHttpClient()
    private val baseUrl = "https://admin-api.ucode.run/v2/items/${currentId}"
    private val apiKey = "${API_KEY}"

    fun getItems(): String? {
        val request = Request.Builder()
            .url(baseUrl)
            .addHeader("authorization", "API-KEY")
            .addHeader("x-api-key", apiKey)
            .build()

        return client.newCall(request).execute().body?.string()
    }

    fun createItem(data: Map<String, Any>): String? {
        val json = JSONObject().apply {
            put("data", JSONObject(data))
        }
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(baseUrl)
            .post(body)
            .addHeader("authorization", "API-KEY")
            .addHeader("x-api-key", apiKey)
            .build()

        return client.newCall(request).execute().body?.string()
    }
}
`

  const swiftCode = isEndpoint
    ? `import Foundation

let apiKey = "${API_KEY}"
let url = URL(string: "https://admin-api.ucode.run/v1/custom-endpoints/${currentId}/run")!

var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("API-KEY", forHTTPHeaderField: "authorization")
request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let params = ["key": "value"]
let body = ["params": params]
request.httpBody = try? JSONSerialization.data(withJSONObject: body)

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let data = data {
        print(String(data: data, encoding: .utf8)!)
    }
}
task.resume()
`
    : `import Foundation

struct ApiClient {
    static let baseUrl = "https://admin-api.ucode.run/v2/items/${currentId}"
    static let apiKey = "${API_KEY}"
    
    static func getItems() {
        var request = URLRequest(url: URL(string: baseUrl)!)
        request.setValue("API-KEY", forHTTPHeaderField: "authorization")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data {
                print(String(data: data, encoding: .utf8)!)
            }
        }.resume()
    }
}
`

  const codeMap: Record<string, string> = {
    javascript: jsCode,
    python: pythonCode,
    go: goCode,
    curl: curlCode,
    dart: dartCode,
    kotlin: kotlinCode,
    swift: swiftCode,
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
      case 'curl': return 'shell'
      case 'dart': return 'dart'
      case 'kotlin': return 'kotlin'
      case 'swift': return 'swift'
      default: return 'javascript'
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Two dropdowns above the editor ── */}
      <div className="flex flex-row gap-4 items-end">
        <div className="flex flex-col gap-1.5 w-[200px]">
          <Label className="text-[10px] font-bold text-text-muted/80 uppercase tracking-widest ml-1">
            Integration Target
          </Label>
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="h-8 bg-bg-card border-border-subtle rounded-lg text-xs">
              <SelectValue placeholder={(isLoadingTables || isLoadingEndpoints) ? 'Loading…' : 'Choose target'} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] rounded-lg border-border-subtle shadow-xl w-[200px]">
              {(isLoadingTables || isLoadingEndpoints) ? (
                <SelectItem value="__loading__" disabled className="text-xs">Loading...</SelectItem>
              ) : (
                <>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">Tables</SelectLabel>
                    {tables.length === 0 ? (
                      <SelectItem value="__empty_tables__" disabled className="text-xs">No tables found</SelectItem>
                    ) : (
                      tables.map((t: any) => (
                        <SelectItem key={`table:${t.slug}`} value={`table:${t.slug}`} className="text-xs px-2">
                          {t.title || t.name || t.slug}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px]">Custom Queries</SelectLabel>
                    {endpoints.length === 0 ? (
                      <SelectItem value="__empty_endpoints__" disabled className="text-xs">No endpoints</SelectItem>
                    ) : (
                      endpoints.map((e: any) => (
                        <SelectItem key={`endpoint:${e.id}`} value={`endpoint:${e.id}`} className="text-xs px-2">
                          {e.name || e.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 w-[160px]">
          <Label className="text-[10px] font-bold text-text-muted/80 uppercase tracking-widest ml-1">
            Language
          </Label>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="h-8 bg-bg-card border-border-subtle rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border-subtle shadow-xl w-[160px]">
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.id} value={lang.id} className="text-xs px-2">
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
