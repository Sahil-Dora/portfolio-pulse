import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/pulse/workspace-page";
export const Route = createFileRoute("/portfolios")({
  head: () => ({
    meta: [
      { title: "Portfolios | Portfolio Pulse" },
      { name: "description", content: "Your stocks and cryptocurrency portfolios in one place." },
      { property: "og:title", content: "Portfolios | Portfolio Pulse" },
      {
        property: "og:description",
        content: "Your stocks and cryptocurrency portfolios in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
function Page() {
  return <WorkspacePage section="portfolios" />;
}
