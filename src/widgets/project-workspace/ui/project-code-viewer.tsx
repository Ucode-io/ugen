export const ProjectCodeViewer = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-bg-main h-full">
      <div className="flex h-full flex-col rounded-xl bg-bg-card border border-border-subtle shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-bg-main px-4 py-2 text-sm font-medium text-text-muted flex items-center">
          Code Editor
        </div>
        <div className="flex-1 p-4">
          <p className="text-text-muted">
            Here will be the code editor content.
          </p>
        </div>
      </div>
    </div>
  )
}
