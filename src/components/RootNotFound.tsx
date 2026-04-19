import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function RootNotFound() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            404
          </p>
          <h1 className="text-4xl font-bold text-gray-900">Page not found</h1>
          <p className="text-base text-gray-600">
            That route does not exist or may have moved.
          </p>
        </div>

        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    </main>
  );
}
