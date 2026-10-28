import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import {
  classifyVillageStream,
  fieldPredictionsById,
  villageClassificationInsights,
} from "../../api/cropClassificationApi";
import { getDateRangePresets, todayInputValue } from "../../utils/dateRangePresets";

function progressLabel(progress) {
  if (progress?.message) return progress.message;
  const stage = String(progress?.stage || "Classifying crops").replaceAll("_", " ");
  if (progress?.completed != null && progress?.total != null) {
    return `${stage} (${progress.completed}/${progress.total})`;
  }
  return stage;
}

export default function CropClassificationMapControl({
  village,
  fields,
  onClassifications,
  /** Optional: receives the map-loader task ({ kind, message, pct, startedAt }) while classifying, else null. */
  onTaskChange,
}) {
  const periods = useMemo(() => getDateRangePresets(), []);
  const [periodId, setPeriodId] = useState("current-kharif");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [classifiedCount, setClassifiedCount] = useState(null);
  const controllerRef = useRef(null);
  const [startedAt, setStartedAt] = useState(null);

  useEffect(() => {
    if (!onTaskChange) return;
    const total = Number(progress?.total);
    const done = Number(progress?.completed);
    onTaskChange(
      running
        ? {
            kind: "classification",
            message: progress ? progressLabel(progress) : undefined,
            pct: Number.isFinite(progress?.pct)
              ? progress.pct
              : total > 0 && Number.isFinite(done) ? (done / total) * 100 : undefined,
            startedAt,
          }
        : null,
    );
  }, [running, progress, startedAt, onTaskChange]);

  useEffect(() => () => onTaskChange?.(null), [onTaskChange]);

  const selectedPeriod = periods.find((period) => period.id === periodId);
  const startDate = periodId === "custom" ? customStart : selectedPeriod?.startDate;
  const endDate = periodId === "custom" ? customEnd : selectedPeriod?.endDate;
  const datesValid = Boolean(startDate && endDate) && startDate <= endDate;
  const features = fields?.features || [];
  const canClassify = Boolean(village && features.length && datesValid);
  const clearClassification = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setProgress(null);
    setError("");
    setClassifiedCount(null);
    onClassifications(null, null);
  };

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setProgress(null);
    setError("");
    setClassifiedCount(null);
    onClassifications(null, null);
    return () => controllerRef.current?.abort();
  }, [village, fields, onClassifications]);

  const classify = async () => {
    if (!canClassify || running) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStartedAt(Date.now());
    setRunning(true);
    setProgress(null);
    setError("");
    setClassifiedCount(null);
    onClassifications(null, null);

    try {
      const result = await classifyVillageStream({
        village,
        fields,
        startDate,
        endDate,
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;
      const nextPredictions = fieldPredictionsById(result);
      const nextInsights = villageClassificationInsights(result);
      setClassifiedCount(Object.keys(nextPredictions).length);
      onClassifications(nextPredictions, nextInsights);
    } catch (classificationError) {
      if (!controller.signal.aborted) {
        setError(
          classificationError?.name === "TimeoutError"
            ? "Classification timed out. Please try again."
            : classificationError.message || "Crop classification failed.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        controllerRef.current = null;
        setRunning(false);
      }
    }
  };

  const changePeriod = (value) => {
    clearClassification();
    setPeriodId(value);
  };

  const changeCustomDate = (setter) => (event) => {
    clearClassification();
    setter(event.target.value);
  };

  return (
    <section className="h-fit w-full rounded-xl border border-lime-300/20 bg-[#0b120d] text-gray-200 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-white">Crop classification</p>
          <p className="truncate text-[10px] text-gray-500">
            {village?.properties?.name || "Select a village and detect its farms"}
          </p>
        </div>
        {classifiedCount != null && (
          <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-[9px] font-semibold text-lime-200">
            {classifiedCount} mapped
          </span>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <label className="block space-y-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 text-lime-300" />
            Satellite observation period
          </span>
          <select
            value={periodId}
            disabled={running}
            onChange={(event) => changePeriod(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2.5 py-2 text-[10px] text-white disabled:opacity-50"
            aria-label="Crop classification date range"
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label}
              </option>
            ))}
          </select>
        </label>

        {periodId === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[9px] text-gray-500">
              <span>Start date</span>
              <input
                type="date"
                value={customStart}
                max={customEnd || todayInputValue()}
                disabled={running}
                onChange={changeCustomDate(setCustomStart)}
                className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white [color-scheme:dark]"
              />
            </label>
            <label className="space-y-1 text-[9px] text-gray-500">
              <span>End date</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                max={todayInputValue()}
                disabled={running}
                onChange={changeCustomDate(setCustomEnd)}
                className="w-full rounded-lg border border-white/10 bg-[#111a13] px-2 py-1.5 text-[10px] text-white [color-scheme:dark]"
              />
            </label>
          </div>
        )}

        {periodId === "custom" && !datesValid && (
          <p className="text-[10px] text-amber-200">Choose a valid date range.</p>
        )}

        <button
          type="button"
          onClick={() => {
            if (running) {
              controllerRef.current?.abort();
              controllerRef.current = null;
              setRunning(false);
              setProgress(null);
            } else {
              classify();
            }
          }}
          disabled={!running && !canClassify}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lime-300/20 bg-gradient-to-r from-lime-300/90 to-yellow-200/90 px-3 py-2 text-[11px] font-bold text-[#14200e] shadow-lg shadow-lime-950/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {running ? "Cancel classification" : "Classify crops"}
        </button>

        {!features.length && (
          <p className="text-[10px] leading-relaxed text-gray-500">
            Select a village and detect its fields, or click a saved village (or any detected field on the
            map) to open it.
          </p>
        )}

        {running && (
          <p className="flex items-center gap-1.5 text-[10px] text-lime-100">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            <span className="truncate">{progressLabel(progress)}</span>
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-100">
            {error}
          </p>
        )}

      </div>
    </section>
  );
}
