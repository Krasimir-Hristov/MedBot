import React from 'react'

/**
 * Skeleton за зареждане на админ дашборда (Clinical Light Mode).
 * Използва се като Suspense fallback в src/app/admin/page.tsx.
 */
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-slate-900">
      {/* Header Skeleton */}
      <header className="flex min-h-[60px] items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="hidden h-5 w-44 animate-pulse rounded bg-slate-100 sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      </header>

      {/* Main Skeleton */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
        {/* 4 KPI Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-14 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-md bg-slate-100" />
            </div>
          ))}
        </section>

        {/* 12-col Workspace */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* Left: Upload Dropzone Skeleton */}
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-4">
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-44 animate-pulse rounded-lg border-2 border-dashed border-slate-200 bg-slate-50" />
            <div className="h-28 animate-pulse rounded-md bg-slate-100" />
          </div>

          {/* Right: Registry Skeleton */}
          <div className="flex flex-col rounded-lg border border-slate-200 bg-white lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-28 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="p-4">
              <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
            </div>
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="h-12 w-full animate-pulse rounded bg-slate-50" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
