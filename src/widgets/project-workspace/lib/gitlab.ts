import { api } from '@/shared/api';

const BASE = process.env.NEXT_PUBLIC_GITLAB_BASE;
const MICROFRONTEND_GROUP = process.env.NEXT_PUBLIC_GITLAB_MICROFRONTEND_GROUP;
const KNATIVE_GROUP = process.env.NEXT_PUBLIC_GITLAB_KNATIVE_GROUP;

const getHeaders = (type?: string) => {
  const token = type === "KNATIVE" || type === "WORKFLOW"
    ? process.env.NEXT_PUBLIC_GITLAB_KNATIVE_TOKEN
    : process.env.NEXT_PUBLIC_GITLAB_MICROFRONTEND_TOKEN;
  return { "PRIVATE-TOKEN": token || "" };
};

// Полный путь проекта: "ucode/ucode_micro_frontend/my-fidani_warehouse"
function projectApiPath(repoPath: string, type?: string) {
  const fullPath = type === "KNATIVE" || type === "WORKFLOW"
    ? `${KNATIVE_GROUP}/${repoPath}`
    : `${MICROFRONTEND_GROUP}/${repoPath}`;
  return encodeURIComponent(fullPath); // GitLab API требует URL-encoded path
}

// Дерево файлов
export async function getFileTree(repoPath: string, branch: string, type?: string, repoId?: string) {
  if (repoId) {
    const res = await api.get('/v1/gitlab/tree', {
      baseURL: 'https://admin-api.ucode.run',
      params: { project_id: repoId, branch: branch }
    });
    return res.data?.data || res.data;
  }

  const project = projectApiPath(repoPath, type);
  const res = await fetch(
    `${BASE}/api/v4/projects/${project}/repository/tree?recursive=true&ref=${branch}&per_page=100`,
    { headers: getHeaders(type) }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

// Содержимое файла
export async function getFileContent(repoPath: string, filePath: string, branch: string, type?: string, repoId?: string) {
  if (repoId) {
    const res = await api.get('/v1/gitlab/file', {
      baseURL: 'https://admin-api.ucode.run',
      params: { project_id: repoId, branch: branch, file_path: filePath }
    });
    const fileContent = res.data?.data || res.data;
    let rawBase64 = '';
    
    if (typeof fileContent === 'object' && fileContent?.content) {
      rawBase64 = fileContent.content;
    } else if (typeof fileContent === 'string') {
      rawBase64 = fileContent;
    }

    if (rawBase64) {
      try {
        // Safely decode base64 to UTF-8
        const binString = atob(rawBase64);
        return new TextDecoder().decode(Uint8Array.from(binString, (m) => m.charCodeAt(0)));
      } catch (e) {
        // In case it wasn't actually base64 or decoding fails, return as-is
        return rawBase64;
      }
    }
    
    return typeof fileContent === 'object' ? JSON.stringify(fileContent, null, 2) : String(fileContent);
  }

  const project = projectApiPath(repoPath, type);
  const encodedFile = encodeURIComponent(filePath);
  const res = await fetch(
    `${BASE}/api/v4/projects/${project}/repository/files/${encodedFile}/raw?ref=${branch}`,
    { headers: getHeaders(type) }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.text();
}

// Publish modifications
export async function publishChanges(repoId: string, branch: string, files: { file_path: string; content: string }[]) {
  if (!repoId) throw new Error("Repository ID is required to publish changes");
  const res = await api.put('/v1/gitlab/file', {
    branch,
    commit_message: "Update code via ucode admin panel",
    files
  }, {
    baseURL: 'https://admin-api.ucode.run',
    params: { project_id: repoId }
  });
  return res.data;
}
