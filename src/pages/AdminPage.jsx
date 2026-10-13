import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Contact2 } from "lucide-react";
import { useAgriPlatform } from "../context/AgriPlatformContext";
import MaharashtraMap from "../components/map/MaharashtraMap";
import { loadManualFarmers } from "../utils/farmerRegistryStorage";

/** Farmer mapping: satellite map with field detection next to the registered farmers in scope. */
export default function AdminPage() {
  const { district } = useAgriPlatform();
  const [farmers] = useState(() => loadManualFarmers());
  const inScope = useMemo(
    () => (district ? farmers.filter((f) => f.district === district) : farmers),
    [farmers, district],
  );

  return (
    <div className="grid gap-4 p-5 md:p-6 lg:grid-cols-3 lg:items-start">
      <section className="lg:col-span-2">
        <MaharashtraMap heightClass="h-[min(70vh,680px)]" />
      </section>

      <aside className="rounded-xl border border-white/[0.08] bg-[#111820] shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Contact2 className="h-4 w-4 text-cg-accent" />
            Registered farmers
          </h3>
          <span className="text-[11px] text-gray-500">{district || "All Maharashtra"}</span>
        </div>
        {inScope.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-gray-500">
            No farmers registered{district ? ` in ${district}` : ""} yet.{" "}
            <Link to="/farmers" className="font-semibold text-cg-accent hover:underline">
              Add farmers in the registry
            </Link>
            .
          </p>
        ) : (
          <ul className="custom-scrollbar max-h-[min(64vh,620px)] divide-y divide-white/[0.05] overflow-y-auto">
            {inScope.map((f) => (
              <li key={f._registryId} className="px-4 py-2.5 text-[11px]">
                <p className="font-semibold text-gray-100">{f.farmerName}</p>
                <p className="text-gray-500">
                  {[f.village, f.taluka, f.district].filter(Boolean).join(" · ") || "No location"}
                  {f.cropType && <> · {f.cropType}</>}
                  {f.area_ha && <> · {f.area_ha} ha</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
