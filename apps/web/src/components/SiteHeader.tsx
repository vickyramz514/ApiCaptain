export function SiteHeader() {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-sm font-bold text-slate-950">
            AC
          </div>
          <div>
            <p className="text-base font-semibold text-white">ApiCaptain</p>
            <p className="text-xs text-slate-400">Generate production-ready API code</p>
          </div>
        </a>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <a href="/" className="hover:text-teal-300">
            JSON / API
          </a>
          <a href="/openapi-generator" className="hover:text-teal-300">
            OpenAPI
          </a>
        </nav>
      </div>
    </header>
  );
}
