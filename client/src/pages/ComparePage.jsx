import { useEffect, useMemo, useState } from "react";
import { formatApplicationFee, formatDeadline } from "../components/UniversityCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const MAX_COMPARE = 3;

function getFeeState(university) {
  if (university.application_fee_required === false) {
    return "free";
  }

  if (university.application_fee_required === true) {
    return "paid";
  }

  return "unknown";
}

function getDeadlineSortValue(university) {
  const deadline = university.application_deadline_end || university.application_deadline_start;
  if (!deadline) {
    return Number.NEGATIVE_INFINITY;
  }

  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

function UniversityPickerCard({ university, selected, disabled, onToggle }) {
  const feeState = getFeeState(university);

  return (
    <article
      className={[
        "flex h-full flex-col justify-between rounded-3xl border bg-slate-900/85 p-5 shadow-lg shadow-slate-950/25 transition",
        selected
          ? "border-teal-400/50 ring-1 ring-teal-400/30 bg-teal-500/5"
          : "border-slate-800 hover:border-slate-700 hover:bg-slate-900",
        disabled && !selected ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">{university.university_name}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {university.country} {" | "} {university.program_name}
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-200">
            {university.degree_level || "Unknown"}
          </span>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Program:</span> {university.program_name}
          </p>
          <p>
            <span className="text-slate-500">Deadline:</span>{" "}
            {formatDeadline(university.application_deadline_start, university.application_deadline_end)}
          </p>
          <p>
            <span className="text-slate-500">Fee:</span> {formatApplicationFee(university)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggle(university.university_id)}
        disabled={disabled && !selected}
        title={disabled && !selected ? "Remove one to add another" : undefined}
        className={[
          "mt-5 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
          selected
            ? "border border-teal-400/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/20"
            : "bg-sky-500 text-slate-950 hover:bg-sky-400",
          disabled && !selected ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400" : "",
        ].join(" ")}
      >
        {selected ? "Added ✓" : "Add to compare +"}
      </button>
      <p className="mt-3 text-xs text-slate-500">Confidence: {university.extraction_confidence || "unknown"}</p>
      <p className="mt-1 text-xs text-slate-500">{feeState === "free" ? "Free application" : feeState === "paid" ? "Paid application" : "Application fee unknown"}</p>
    </article>
  );
}

function ComparePage() {
  const [universities, setUniversities] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUniversities() {
      try {
        const response = await fetch(`${API_BASE_URL}/universities`);
        if (!response.ok) {
          throw new Error(`Failed to load universities (${response.status})`);
        }

        const data = await response.json();
        if (isMounted) {
          setUniversities(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || "Failed to load universities");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUniversities();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedUniversities = useMemo(
    () => universities.filter((university) => selectedIds.includes(university.university_id)),
    [selectedIds, universities]
  );

  const filteredUniversities = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return universities;
    }

    return universities.filter((university) => {
      const haystack = [
        university.university_name,
        university.country,
        university.program_name,
        university.degree_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchText, universities]);

  const selectedUniversitySet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const compareReady = selectedUniversities.length >= 2;
  const compareTitles = selectedUniversities.map((university) => university.university_name).join(", ");

  function toggleSelection(universityId) {
    setSelectedIds((current) => {
      if (current.includes(universityId)) {
        return current.filter((id) => id !== universityId);
      }

      if (current.length >= MAX_COMPARE) {
        return current;
      }

      return [...current, universityId];
    });
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function latestDeadlineId() {
    if (!selectedUniversities.length) {
      return null;
    }

    return selectedUniversities.reduce((best, current) => {
      if (!best) {
        return current;
      }

      return getDeadlineSortValue(current) > getDeadlineSortValue(best) ? current : best;
    }, null)?.university_id;
  }

  const latestDeadlineUniversityId = latestDeadlineId();

  const compareRows = [
    {
      label: "University Name",
      value: (university) => university.university_name || "Not specified",
      highlight: () => false,
    },
    {
      label: "Country",
      value: (university) => university.country || "Not specified",
      highlight: () => false,
    },
    {
      label: "Program",
      value: (university) => university.program_name || "Not specified",
      highlight: () => false,
    },
    {
      label: "Degree Level",
      value: (university) => university.degree_level || "Not specified",
      highlight: () => false,
    },
    {
      label: "Application Deadline",
      value: (university) => formatDeadline(university.application_deadline_start, university.application_deadline_end),
      highlight: (university) => university.university_id === latestDeadlineUniversityId,
    },
    {
      label: "Application Fee",
      value: (university) => formatApplicationFee(university),
      highlight: (university) => university.application_fee_required === false,
    },
    {
      label: "Scholarship Available",
      value: (university) => (university.scholarship_available ? "Yes" : "No"),
      highlight: (university) => university.scholarship_available === true,
    },
    {
      label: "Scholarship Details",
      value: (university) => university.scholarship_details || "Not specified",
      highlight: () => false,
    },
    {
      label: "Program Link",
      value: (university) =>
        university.program_url ? (
          <a
            href={university.program_url}
            target="_blank"
            rel="noreferrer"
            className="text-teal-300 underline decoration-teal-400/40 underline-offset-4 transition hover:text-teal-200"
          >
            Open program page
          </a>
        ) : (
          "Not specified"
        ),
      highlight: () => false,
    },
    {
      label: "Data Confidence",
      value: (university) => university.extraction_confidence || "unknown",
      highlight: () => false,
    },
  ];

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-blue-950/30">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Compare universities</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Pick up to 3 universities and compare them side by side.</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Search by name or country, add universities to the comparison tray, and review deadlines, fees, scholarships, and confidence at a glance.
        </p>

        {selectedUniversities.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Comparing:</span>
            {selectedUniversities.map((university) => (
                <button
                key={university.university_id}
                type="button"
                onClick={() => toggleSelection(university.university_id)}
                className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1.5 text-sm text-teal-200 transition hover:bg-teal-500/15"
              >
                {university.university_name}
                <span className="text-teal-300">x</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Search universities to compare...</span>
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name, country, or program"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            Showing {filteredUniversities.length} university{filteredUniversities.length === 1 ? "" : "ies"}
          </span>
          <span>{selectedIds.length}/{MAX_COMPARE} selected</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-300">Loading universities...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUniversities.map((university) => {
              const selected = selectedUniversitySet.has(university.university_id);
              const disabled = selectedIds.length >= MAX_COMPARE && !selected;

              return (
                <UniversityPickerCard
                  key={university.university_id}
                  university={university}
                  selected={selected}
                  disabled={disabled}
                  onToggle={toggleSelection}
                />
              );
            })}
          </div>

          {!compareReady ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-10 text-center text-slate-300">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-2xl text-sky-300">
                +
              </div>
              <p className="text-lg font-medium text-slate-100">
                Select 2 or 3 universities above to compare them side by side
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">Comparison table</h2>
                  <p className="text-sm text-slate-400">{compareTitles}</p>
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Clear all
                </button>
              </div>

              <div className="md:hidden space-y-4">
                {selectedUniversities.map((university) => (
                  <article key={university.university_id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                    <h3 className="text-lg font-semibold text-slate-50">{university.university_name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{university.country}</p>
                    <dl className="mt-4 space-y-3 text-sm">
                      {compareRows.map((row) => (
                        <div key={row.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                          <dt className="text-xs uppercase tracking-wide text-slate-500">{row.label}</dt>
                          <dd
                            className={[
                              "mt-1 text-slate-100",
                              row.highlight(university) ? "rounded-xl border border-teal-400/30 bg-teal-500/10 px-3 py-2" : "",
                            ].join(" ")}
                          >
                            {row.value(university)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/60 md:block">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-300">
                    <tr>
                      <th className="border-b border-slate-800 px-4 py-3">Field</th>
                      {selectedUniversities.map((university) => (
                        <th key={university.university_id} className="border-b border-slate-800 px-4 py-3 align-top">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-50">{university.university_name}</div>
                            <div className="text-xs text-slate-400">{university.country}</div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.label} className="odd:bg-slate-900/30">
                        <td className="border-b border-slate-800 px-4 py-4 font-medium text-slate-300">{row.label}</td>
                        {selectedUniversities.map((university) => {
                          const highlighted = row.highlight(university);
                          const rowValue = row.value(university);

                          return (
                            <td
                              key={`${university.university_id}-${row.label}`}
                              className={[
                                "border-b border-slate-800 px-4 py-4 text-slate-100",
                                highlighted ? "bg-teal-500/10" : "",
                              ].join(" ")}
                            >
                              {typeof rowValue === "string" ? (
                                <span
                                  className={
                                    highlighted
                                      ? "rounded-xl border border-teal-400/30 bg-teal-500/10 px-3 py-2 text-teal-100"
                                      : ""
                                  }
                                >
                                  {rowValue}
                                </span>
                              ) : (
                                <div
                                  className={
                                    highlighted
                                      ? "rounded-xl border border-teal-400/30 bg-teal-500/10 px-3 py-2"
                                      : ""
                                  }
                                >
                                  {rowValue}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ComparePage;
