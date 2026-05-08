import React from "react";
import { PLATFORM_TAGLINE } from "../data/agriStateData";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import AIInsights from "../components/ai/AIInsights";
import PageHero from "../components/ui/PageHero";

export default function AIInsightsPage() {
  const { district } = useAgriPlatform();

  return (
    <div className="space-y-4">
      <PageHero
        accent="violet"
        eyebrow="AI layer"
        title="Cluster intelligence — uses district filter from the workspace"
        description={PLATFORM_TAGLINE}
      />
      <AIInsights district={district} />
    </div>
  );
}
