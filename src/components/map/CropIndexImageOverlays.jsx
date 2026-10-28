import React from "react";
import { Pane, SVGOverlay } from "react-leaflet";
import L from "leaflet";
import {
  cropIndexFeatureBounds,
  cropIndexGeometryPathInBounds,
  cropIndexImageSource,
  cropIndexResultFeatureId,
  cropIndexResultsMappedToFeatures,
} from "../../utils/cropIndexImages";

function FieldImage({ result, feature, index, opacity, idPrefix }) {
  const source = cropIndexImageSource(result?.image_base64, result?.image_format);
  const bounds = cropIndexFeatureBounds(feature);
  const clipPath = cropIndexGeometryPathInBounds(feature, bounds);
  if (!source || !bounds || !clipPath) return null;

  // Clip ids are document-wide, so each map gets its own prefix.
  const clipId = `${idPrefix}-clip-${index}`;
  const viewBoxSize = 1000;

  return (
    <SVGOverlay
      bounds={L.latLngBounds(bounds)}
      attributes={{
        viewBox: `0 0 ${viewBoxSize} ${viewBoxSize}`,
        preserveAspectRatio: "none",
      }}
      pane="cropIndexImagePane"
      interactive={false}
      className="crop-index-field-image"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={clipPath} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </defs>
      <image
        href={source}
        x="0"
        y="0"
        width={viewBoxSize}
        height={viewBoxSize}
        preserveAspectRatio="none"
        opacity={opacity}
        clipPath={`url(#${clipId})`}
      />
      <path
        d={clipPath}
        fill="none"
        stroke="rgba(226,232,240,.95)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </SVGOverlay>
  );
}

export default function CropIndexImageOverlays({
  results = [],
  features = [],
  visible = true,
  opacity = 0.86,
  idPrefix = "crop-index-field",
}) {
  if (!visible || !Array.isArray(results) || !Array.isArray(features)) return null;

  const overlays = cropIndexResultsMappedToFeatures(results, features);

  if (!overlays.length) return null;

  return (
    <Pane name="cropIndexImagePane" style={{ zIndex: 350, pointerEvents: "none" }}>
      {overlays.map(({ result, feature, resultIndex }) => (
        <FieldImage
          key={`${cropIndexResultFeatureId(result)}-${resultIndex}`}
          result={result}
          feature={feature}
          index={resultIndex}
          opacity={opacity}
          idPrefix={idPrefix}
        />
      ))}
    </Pane>
  );
}
