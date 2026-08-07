import { createFileRoute } from "@tanstack/react-router";
import courseDetailsHtml from "../html/course-details.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";

export const Route = createFileRoute("/details/$courseId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { courseId } = params;
        const page = courseDetailsHtml
          .replace("</body>", `${integrationHtml}\n<script>window.currentCourseId = "${courseId}";</script>\n</body>`);
        return new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
