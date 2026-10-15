import React, { useCallback, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import { useFieldDelineationContext } from "../context/FieldDelineationContext";
import MaharashtraMap from "../components/map/MaharashtraMap";
import FieldDelineationPanel from "../components/delineation/FieldDelineationPanel";
import { DetectedFieldsTable } from "../components/delineation/DetectionTables";
import CropClassificationMapControl from "../components/survey/CropClassificationMapControl";
import CropClassificationInsights from "../components/survey/CropClassificationInsights";
import SelectedFieldDetails from "../components/survey/SelectedFieldDetails";
import { detectionsInDistrict } from "../utils/delineationStats";
import { fieldPredictionForId } from "../utils/cropClassificationColors";

function downloadGeoJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/geo+json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Crop monitoring workspace: satellite map with field detection, and the detected field list. */
export default function SurveyPage() {
  const { district } = useAgriPlatform();
  const { saved, village, fields } = useFieldDelineationContext();
  const [fieldClassifications, setFieldClassifications] = useState(null);
  const [classificationInsights, setClassificationInsights] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [classificationTask, setClassificationTask] = useState(null);
  const detections = useMemo(() => detectionsInDistrict(saved, district), [saved, district]);
  const setMapClassifications = useCallback(
    (classifications, insights) => {
      setFieldClassifications(classifications);
      setClassificationInsights(insights);
    },
    [],
  );
  // The latest detection run lives only in memory; after a reload (or re-picking the
  // village) classify the village's most recent saved detection. One detection only:
  // field_ids restart per run, and predictions are matched to fields by field_id.
  const classificationFields = useMemo(() => {
    if (fields?.features?.length) return fields;
    const v = village?.properties;
    if (!v) return null;
    const latest = saved.findLast(
      (r) => r.village?.name === v.name && r.village?.taluka === v.taluka && r.village?.district === v.district,
    );
    return latest?.fields?.features?.length ? latest.fields : null;
  }, [fields, saved, village]);
  const classificationDetectionId = classificationFields?.features?.[0]?.properties?.detectionId || "";
  const visibleSelectedField = selectedField && detections.some((detection) =>
    String(detection.id) === String(selectedField.detectionId) &&
    detection.fields.features.some((feature) =>
      String(feature.properties?.field_id) ===
        String(selectedField.feature?.properties?.field_id),
    ),
  )
    ? selectedField
    : null;
  const selectedFieldPrediction =
    visibleSelectedField &&
    String(visibleSelectedField.detectionId ?? "") === String(classificationDetectionId)
      ? fieldPredictionForId(fieldClassifications, visibleSelectedField.feature?.properties?.field_id)
      : null;

  const selectMapField = useCallback(({ key, feature }) => {
    const detectionId = feature.properties?.detectionId;
    const detection = saved.find((row) => String(row.id) === String(detectionId));
    setSelectedField({
      key,
      feature,
      detectionId,
      village: detection?.village,
    });
  }, [saved]);

  const exportFields = () =>
    downloadGeoJson(
      { type: "FeatureCollection", features: detections.flatMap((r) => r.fields.features) },
      `fields-${district || "maharashtra"}.geojson`,
    );

  return (
    <div className="space-y-4 p-3 sm:p-5 md:p-6">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <MaharashtraMap
          heightClass="h-[min(70vh,680px)]"
          fieldClassifications={fieldClassifications || {}}
          classificationDetectionId={classificationDetectionId}
          selectedFieldKey={visibleSelectedField?.key || ""}
          onFieldSelect={selectMapField}
          showFieldDelineationPanel={false}
          loadingTask={classificationTask}
        />
        <aside className="space-y-4">
          <FieldDelineationPanel placement="inline" />
          <CropClassificationMapControl
            village={village}
            fields={classificationFields}
            onClassifications={setMapClassifications}
            onTaskChange={setClassificationTask}
          />
        </aside>
      </div>
      <CropClassificationInsights
        insights={classificationInsights}
        predictions={fieldClassifications}
        villageName={village?.properties?.name}
      />
      <DetectedFieldsTable
        detections={detections}
        selectedFieldKey={visibleSelectedField?.key || ""}
        onSelectField={setSelectedField}
        fieldClassifications={fieldClassifications || {}}
        classificationDetectionId={classificationDetectionId}
        actions={
          detections.length > 0 && (
            <button
              type="button"
              onClick={exportFields}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5" /> GeoJSON
            </button>
          )
        }
      />
      <SelectedFieldDetails
        selected={visibleSelectedField}
        prediction={selectedFieldPrediction}
      />
    </div>
  );
}
