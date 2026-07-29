import { createFileRoute } from "@tanstack/react-router";
// The homepage is served exactly as authored (HTML/CSS/JS untouched).
// Only an extra script is appended for auth + database wiring.
import homepageHtml from "../html/homepage.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";

const page = homepageHtml.replace("</body>", `${integrationHtml}\n</body>`);

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () =>
        new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
