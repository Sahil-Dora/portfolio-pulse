import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/components/pulse/overview";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview | Portfolio Pulse" },
      {
        name: "description",
        content: "Your stock and cryptocurrency portfolio at a glance with Portfolio Pulse.",
      },
      { property: "og:title", content: "Overview | Portfolio Pulse" },
      {
        property: "og:description",
        content: "A clear view of your stocks, cryptocurrency, and portfolio performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});
