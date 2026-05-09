import React, { createContext, useContext, useState, useMemo } from "react";

const FieldDataContext = createContext(null);

export const useFieldData = () => useContext(FieldDataContext);

const toNum = (v) => (v == null || v === "" ? 0 : Number(v));
const mean = (arr) =>
  !arr || !arr.length ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

function buildFieldData(features, selectedCrop, _selectedSampleFieldId) {
  const count = features.length;

  const areas = features.map((f) => toNum(f.properties?.area_ha));
  const totalArea = areas.reduce((a, b) => a + b, 0);

  const avgNDVI = mean(features.map((f) => toNum(f.properties?.avgNDVI)));
  const evi = mean(features.map((f) => toNum(f.properties?.evi)));
  const savi = mean(features.map((f) => toNum(f.properties?.savi)));
  const vhi = mean(features.map((f) => toNum(f.properties?.vhi)));

  const healthyFarmsCount = features.filter((f) => {
    const health = (f.properties?.cropHealth || "").toLowerCase();
    return health === "very good" || health === "good";
  }).length;

  const lowIndexFarmsCount = features.filter((f) => {
    const health = (f.properties?.cropHealth || "").toLowerCase();
    return health === "poor" || toNum(f.properties?.vhi) < 45;
  }).length;

  // Process 15-day interval time series data with 2024/2025 comparison
  const firstFeature = features[0];
  const firstNdvi = firstFeature.properties?.ndviSeries || [];
  const firstWater = firstFeature.properties?.waterSeries || [];

  // For single field - use data directly
  if (count === 1) {
    var ndviTimeSeries = firstNdvi;
    var waterIndexTimeSeries = firstWater;
  } else {
    // For multiple fields - average the data
    ndviTimeSeries = firstNdvi.map((point, idx) => {
      const values2025 = features.map((f) => {
        const series = f.properties?.ndviSeries || [];
        return series[idx]?.["2025"] || 0;
      });
      const values2024 = features.map((f) => {
        const series = f.properties?.ndviSeries || [];
        return series[idx]?.["2024"] || 0;
      });

      return {
        date: point.date,
        "2025": Number(mean(values2025).toFixed(2)),
        "2024": Number(mean(values2024).toFixed(2)),
      };
    });

    waterIndexTimeSeries = firstWater.map((point, idx) => {
      const values2025 = features.map((f) => {
        const series = f.properties?.waterSeries || [];
        return series[idx]?.["2025"] || 0;
      });
      const values2024 = features.map((f) => {
        const series = f.properties?.waterSeries || [];
        return series[idx]?.["2024"] || 0;
      });

      return {
        date: point.date,
        "2025": Number(mean(values2025).toFixed(3)),
        "2024": Number(mean(values2024).toFixed(3)),
      };
    });
  }

  const firstSoil = features[0].properties?.soilHealth || {};
  const nutrients = (firstSoil.nutrients || []).map((nut, idx) => {
    const thisYearVals = features.map(
      (f) =>
        f.properties?.soilHealth?.nutrients?.[idx]?.thisYear ??
        nut.thisYear ??
        0
    );
    const lastYearVals = features.map(
      (f) =>
        f.properties?.soilHealth?.nutrients?.[idx]?.lastYear ??
        nut.lastYear ??
        0
    );
    return {
      symbol: nut.symbol,
      label: nut.label,
      thisYear: Number(mean(thisYearVals).toFixed(1)),
      lastYear: Number(mean(lastYearVals).toFixed(1)),
    };
  });

  const layerKeys = ["surface", "subsoil", "parentMaterial"];
  const layers = layerKeys.reduce((acc, key) => {
    const template = firstSoil.layers?.[key] || {
      temperature: "0",
      moisture: "0",
    };
    const temps = features.map((f) =>
      toNum(
        f.properties?.soilHealth?.layers?.[key]?.temperature ??
          template.temperature
      )
    );
    const moist = features.map((f) =>
      toNum(
        f.properties?.soilHealth?.layers?.[key]?.moisture ?? template.moisture
      )
    );
    acc[key] = {
      temperature: mean(temps).toFixed(0),
      moisture: mean(moist).toFixed(2),
    };
    return acc;
  }, {});

  const healthPerc = mean(
    features.map((f) => f.properties?.soilHealth?.healthPercentage ?? 0)
  );

  let healthStatus = "Normal";
  if (healthPerc >= 75) healthStatus = "Excellent";
  else if (healthPerc >= 60) healthStatus = "Good";
  else if (healthPerc < 45) healthStatus = "Needs Attention";

  const cropAges = features.map((f) => f.properties?.soilHealth?.cropAge ?? 0);

  // Calculate standard yields (average across all features)
  const standardYields = features.map(
    (f) =>
      f.properties?.standardYield ??
      f.properties?.soilHealth?.standardYield ??
      0
  );

  // Calculate AI yields (average across all features)
  const aiYields = features.map(
    (f) => f.properties?.aiYield ?? f.properties?.soilHealth?.aiYield ?? 0
  );

  const soilHealth = {
    healthPercentage: Number(healthPerc.toFixed(0)),
    healthStatus,
    cropAge: Number(mean(cropAges).toFixed(0)),
    standardYield: Number(mean(standardYields).toFixed(0)),
    aiYield: Number(mean(aiYields).toFixed(0)),
    nutrients,
    layers,
  };

  const ndviChange =
    ndviTimeSeries.length > 1 && ndviTimeSeries[0]["2025"] !== 0
      ? ((ndviTimeSeries[ndviTimeSeries.length - 1]["2025"] -
          ndviTimeSeries[0]["2025"]) /
          ndviTimeSeries[0]["2025"]) *
        100
      : 0;

  const dashboardData = {
    avgNDVI: {
      value: avgNDVI.toFixed(2),
      change: Math.abs(ndviChange).toFixed(1),
      positive: ndviChange >= 0,
    },
    totalArea,
    healthyFarms: { healthy: healthyFarmsCount, total: count },
    lowIndexFarms: lowIndexFarmsCount,
  };

  const sidebarMetrics = {
    evi: {
      value: evi.toFixed(2),
      change: "5.2",
      positive: evi >= 0.5,
    },
    vhi: {
      value: vhi.toFixed(1),
      change: (vhi - 50).toFixed(1),
      positive: vhi >= 50,
    },
    savi: {
      value: savi.toFixed(2),
      change: "5.2",
      positive: savi >= 0.6,
    },
  };

  const majorCrop =
    selectedCrop ||
    (() => {
      const areaByCrop = {};
      features.forEach((f) => {
        const crop = f.properties?.cropType || "Unknown";
        const area = toNum(f.properties?.area_ha);
        areaByCrop[crop] = (areaByCrop[crop] || 0) + area;
      });
      return Object.entries(areaByCrop).sort((a, b) => b[1] - a[1])[0][0];
    })();

  const cropImage = (() => {
    if (count === 1) {
      return features[0].properties?.cropImage || null;
    }
    const majorCropFeature = features.find(
      (f) =>
        (f.properties?.cropType || "").toLowerCase() ===
        majorCrop.toLowerCase()
    );
    return majorCropFeature?.properties?.cropImage || null;
  })();

  let selectionLabel;
  if (count === 1) {
    selectionLabel = features[0].properties?.name || "Selected field";
  } else if (selectedCrop) {
    selectionLabel = `${selectedCrop} Fields (${count})`;
  } else {
    selectionLabel = `${majorCrop} Fields (${count})`;
  }
  const selectionSubtitle = `${totalArea.toFixed(2)} ha • ${count} field${
    count > 1 ? "s" : ""
  }`;

  return {
    totalArea,
    activeFieldCount: count,
    selectionLabel,
    selectionSubtitle,
    majorCrop,
    cropImage,
    dashboardData,
    sidebarMetrics,
    ndviTimeSeries,
    waterIndexTimeSeries,
    soilHealth,
  };
}

export function FieldDataProvider({ children }) {
  const [sampleFields, setSampleFields] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSampleFieldId, setSelectedSampleFieldId] = useState(null);
  const [selectedSnapshotField, setSelectedSnapshotField] = useState(null);
  /** Demo government program snapshot for hackathon UI (merged with plot-specific data in Admin). */
  const governmentPrograms = useMemo(
    () => ({
      insurance: {
        provider: "PMFBY",
        status: "claimed",
        amount: 25000,
      },
      loan: {
        status: "active",
        amount: 50000,
      },
      schemes: [
        { name: "PM-KISAN", status: "received", amount: 6000 },
        { name: "Soil Health Card", status: "active" },
      ],
    }),
    [],
  );

  const fieldData = useMemo(() => {
    if (!sampleFields || !sampleFields.features?.length) return null;

    let features = sampleFields.features;

    // Priority 1: If a specific field is selected, use only that field
    if (selectedSampleFieldId) {
      features = features.filter(
        (f) => f.properties?._id === selectedSampleFieldId
      );
    }
    // Priority 2: If a crop is manually selected, filter by that crop
    else if (selectedCrop) {
      const target = selectedCrop.toLowerCase();
      features = features.filter(
        (f) => (f.properties?.cropType || "").toLowerCase() === target
      );
    }
    // Priority 3: Auto-select major crop
    else {
      // Calculate area by crop type
      const areaByCrop = {};
      features.forEach((f) => {
        const crop = f.properties?.cropType || "Unknown";
        const area = toNum(f.properties?.area_ha);
        areaByCrop[crop] = (areaByCrop[crop] || 0) + area;
      });

      // Find the crop with the largest total area
      const majorCrop = Object.entries(areaByCrop).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      // Filter to show only fields of the major crop
      features = features.filter(
        (f) => (f.properties?.cropType || "Unknown") === majorCrop
      );
    }

    if (!features.length) return null;

    return buildFieldData(features, selectedCrop, selectedSampleFieldId);
  }, [sampleFields, selectedCrop, selectedSampleFieldId]);

  const availableCrops = useMemo(() => {
    if (!sampleFields?.features) return [];
    const set = new Set();
    sampleFields.features.forEach((f) => {
      if (f.properties?.cropType) set.add(f.properties.cropType);
    });
    return Array.from(set);
  }, [sampleFields]);

  const value = {
    sampleFields,
    fieldData,
    availableCrops,
    selectedCrop,
    selectedSampleFieldId,
    selectedField: selectedSnapshotField,
    governmentPrograms,

    loadSampleFields: setSampleFields,
    setSelectedCrop: (crop) => setSelectedCrop(crop || ""),
    selectSampleField: (id) => setSelectedSampleFieldId(id || null),

    selectField: (snapshot) => setSelectedSnapshotField(snapshot || null),
    clearField: () => setSelectedSnapshotField(null),
  };

  return (
    <FieldDataContext.Provider value={value}>
      {children}
    </FieldDataContext.Provider>
  );
}