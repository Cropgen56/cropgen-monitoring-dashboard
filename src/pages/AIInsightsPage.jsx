import React from "react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import AIInsights from "../components/ai/AIInsights";

export default function AIInsightsPage() {
  const { district } = useAgriPlatform();

  return (
    <div className="space-y-4 p-5 md:p-6">
      <AIInsights district={district} />
    </div>
  );
}
