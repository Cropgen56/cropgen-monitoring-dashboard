function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayMonth(date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function getDateRangePresets(now = new Date()) {
  const year = now.getFullYear();
  const today = dateInputValue(now);
  const currentKharifYear = now.getMonth() >= 5 ? year : year - 1;
  const currentRabiYear = now.getMonth() >= 9 ? year : year - 1;
  const completedRabiYear = now.getMonth() >= 3 ? year - 1 : year - 2;
  const previousKharifYear = now.getMonth() >= 5 ? year - 1 : year - 2;
  const trailingStart = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());

  return [
    {
      id: "current-kharif",
      label: `✓ Current Kharif ${currentKharifYear} (Jun 01 – Today) ⚡ Live`,
      startDate: `${currentKharifYear}-06-01`,
      endDate: today,
    },
    {
      id: "current-rabi",
      label: `Current Rabi ${currentRabiYear}–${String(currentRabiYear + 1).slice(-2)} (Oct 01 – Today${now.getMonth() < 10 ? " [Early]" : ""})`,
      startDate: `${currentRabiYear}-10-01`,
      endDate: today,
    },
    {
      id: "latest-complete-rabi",
      label: `Latest Complete Rabi (Oct ${completedRabiYear} – Mar ${completedRabiYear + 1})`,
      startDate: `${completedRabiYear}-10-01`,
      endDate: `${completedRabiYear + 1}-03-31`,
    },
    {
      id: "previous-complete-kharif",
      label: `Previous Complete Kharif (Jun – Nov ${previousKharifYear})`,
      startDate: `${previousKharifYear}-06-01`,
      endDate: `${previousKharifYear}-11-30`,
    },
    {
      id: "trailing-12-months",
      label: `Trailing 12 Months (${displayMonth(trailingStart)} – Today)`,
      startDate: dateInputValue(trailingStart),
      endDate: today,
    },
    {
      id: "year-to-date",
      label: `Year-to-Date ${year} (Jan 01 – Today)`,
      startDate: `${year}-01-01`,
      endDate: today,
    },
    { id: "custom", label: "Custom Date Range…", startDate: "", endDate: "" },
  ];
}

export function todayInputValue(now = new Date()) {
  return dateInputValue(now);
}
