import * as esbuild from "esbuild-wasm"

function normalizePath(path: string) {
  // Разбиваем по слешам и удаляем пустые элементы
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  // Всегда возвращаем абсолютный путь
  return "/" + stack.join("/");
}

function getLoader(path: string): esbuild.Loader {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "js";
}

export function virtualFsPlugin(fs: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {

      build.onResolve({ filter: /^__entry\.jsx$/ }, (args) => ({
        path: "/" + args.path,
        namespace: "virtual",
      }));

      build.onResolve({ filter: /\\.css$/ }, (args) => {
        if (args.path.startsWith(".") || args.path.startsWith("/")) {
          return null; // let virtual namespace handle internal css
        }

        return {
          path: args.path,
          namespace: "cdn-css",
        };
      });

      build.onLoad({ filter: /.*/, namespace: "cdn-css" }, (args) => {
        const cssUrl = `https://esm.sh/${args.path}`;

        const js = `
          (function() {
            const id = 'css-${args.path.replace(/[^a-z0-9]/g, '_')}';
            if (!document.getElementById(id)) {
              const link = document.createElement('link');
              link.id = id;
              link.rel = 'stylesheet';
              link.href = '${cssUrl}';
              document.head.appendChild(link);
            }
          })();
        `;

        return {
          contents: js,
          loader: "js",
        };
      });

      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") {
          return { path: args.path, namespace: "virtual" };
        }

        if (args.path.startsWith(".")) {
          const importerDir = args.importer.substring(0, args.importer.lastIndexOf("/"));

          const resolved = normalizePath(importerDir + "/" + args.path);
          return { path: resolved, namespace: "virtual" };
        }

        if (args.path.startsWith("/")) {
          return { path: normalizePath(args.path), namespace: "virtual" };
        }

        if (args.path.startsWith("http")) {
          return {
            path: args.path,
            external: true,
          };
        }

        return { path: args.path, external: true };
      })

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".css", ".json"];
        const pathsToCheck = [args.path];

        if (!args.path.startsWith("/")) {
          pathsToCheck.push("/" + args.path);
        }

        for (const basePath of pathsToCheck) {
          for (const ext of extensions) {
            const fullPath = basePath + ext;
            if (fs[fullPath] != null) {
              if (fullPath.endsWith(".css")) {
                const js = `
                  (function() {
                    const id = 'virtual-css-${fullPath.replace(/[^a-z0-9]/g, '_')}';
                    if (!document.getElementById(id)) {
                      const style = document.createElement('style');
                      style.id = id;
                      style.textContent = ${JSON.stringify(fs[fullPath])};
                      document.head.appendChild(style);
                    }
                  })();
                `;
                return {
                  contents: js,
                  loader: "js",
                };
              }

              return {
                contents: fs[fullPath],
                loader: getLoader(fullPath),
              };
            }
          }
        }

        console.warn(`[VirtualFS] File not found: ${args.path}. Available files:`, Object.keys(fs));

        return {
          errors: [{ text: `File not found in virtual FS: ${args.path}` }],
        };
      })
    },
  }
}
