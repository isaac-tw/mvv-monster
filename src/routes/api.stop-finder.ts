import { createFileRoute } from "@tanstack/react-router";

const MVV_BASE_URL = "https://www.mvv-muenchen.de";
const MAX_QUERY_LENGTH = 20;

export const Route = createFileRoute("/api/stop-finder")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const query = requestUrl.searchParams.get("query")?.trim();

        if (!query) {
          return Response.json(
            { success: false, message: "Missing query", results: [] },
            { status: 400 },
          );
        }

        if (query.length > MAX_QUERY_LENGTH) {
          return Response.json(
            { success: false, message: "Query is too long", results: [] },
            { status: 400 },
          );
        }

        const searchParams = new URLSearchParams({ name_origin: query });
        const upstreamUrl = `${MVV_BASE_URL}/stopFinder?${searchParams.toString()}`;

        try {
          const upstreamResponse = await fetch(upstreamUrl, {
            headers: {
              Accept: "application/json",
            },
          });

          return new Response(await upstreamResponse.text(), {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: {
              "content-type":
                upstreamResponse.headers.get("content-type") ??
                "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        } catch {
          return Response.json(
            {
              success: false,
              message: "Failed to fetch MVV stop finder",
              results: [],
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
