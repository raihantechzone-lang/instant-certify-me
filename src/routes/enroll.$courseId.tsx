import { createFileRoute } from "@tanstack/react-router";
import enrollHtml from "../html/course-enrollment.html?raw";
import integrationHtml from "../html/homepage-integration.html?raw";

export const Route = createFileRoute("/enroll/$courseId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { courseId } = params;
        const page = enrollHtml
          .replace("</body>", `${integrationHtml}\n<script>window.currentCourseId = "${courseId}"; window.loadEnrollmentPage("${courseId}");</script>\n</body>`);
        return new Response(page, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
