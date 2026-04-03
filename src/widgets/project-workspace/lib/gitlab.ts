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
export async function getFileTree(repoPath: string, branch: string, type?: string) {
  const project = projectApiPath(repoPath, type);
  const res = await fetch(
    `${BASE}/api/v4/projects/${project}/repository/tree?recursive=true&ref=${branch}&per_page=100`,
    { headers: getHeaders(type) }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

// Содержимое файла
export async function getFileContent(repoPath: string, filePath: string, branch: string, type?: string) {
  const project = projectApiPath(repoPath, type);
  const encodedFile = encodeURIComponent(filePath);
  const res = await fetch(
    `${BASE}/api/v4/projects/${project}/repository/files/${encodedFile}/raw?ref=${branch}`,
    { headers: getHeaders(type) }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.text();
}
