import { createFileRoute } from "@tanstack/react-router";
import GrandLaunch from "@/components/GrandLaunch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Logo — Grand Launch" },
      {
        name: "description",
        content:
          "Witness the grand inauguration of Siva Kameswari Steels — a legacy of strength, trust, and premium craftsmanship.",
      },
      { property: "og:title", content: "Logo — Grand Launch" },
      {
        property: "og:description",
        content:
          "A cinematic unveiling of Siva Kameswari Steels — forging the future of premium steel in India.",
      },
    ],
  }),
  component: GrandLaunch,
});
