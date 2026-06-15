import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const COUNTRY_OPTIONS = ["", "Canada", "Germany", "Pakistan", "Turkey", "UK"];
const DEGREE_LEVEL_OPTIONS = ["", "Bachelors", "Masters", "PhD", "Other"];

const DEFAULT_FILTERS = {
  country: "",
  degreeLevel: "",
  feeType: "any",
  scholarshipAvailable: "any",
};

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDeadline(start, end) {
  const startText = formatDate(start);
  const endText = formatDate(end);

  if (!startText && !endText) {
    return "Not specified";
  }

  if (startText && endText) {
    return `${startText} - ${endText}`;
  }

  return startText || endText || "Not specified";
}

function getFeeBadge(university) {
  if (university.application_fee_required === false) {
    return {
      label: "Free",
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    };
  }

  if (university.application_fee_required === true) {
    return {
      label: "Paid",
      className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    };
  }

  return {
    label: "Unknown",
    className: "border-slate-600 bg-slate-800 text-slate-300",
  };
}

function UniversityCard({ university }) {
  const feeBadge = getFeeBadge(university);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30 transition hover:border-slate-700 hover:bg-slate-900">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">{university.university_name}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {university.country} • {university.degree_level}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${feeBadge.className}`}>
            {feeBadge.label} application
          </span>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">Program:</span> {university.program_name}
          </p>
          <p>
            <span className="text-slate-400">Deadline:</span>{" "}
            {formatDeadline(university.application_deadline_start, university.application_deadline_end)}
          </p>
          <p>
            <span className="text-slate-400">Scholarship:</span>{" "}
            {university.scholarship_available ? (
              <span className="ml-2 rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                Available
              </span>
            ) : (
              <span className="ml-2 text-slate-500">Not available or not listed</span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/universities/${university.university_id}`}
            className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
          >
            View details
          </Link>
          <span className="text-xs text-slate-500">
            Confidence: {university.extraction_confidence || "unknown"}
          </span>
        </div>
      </div>
    </article>
  );
}

function HomePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState("Loading universities...");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("browse");

  async function fetchBrowseUniversities(nextFilters = filters) {
    setLoading(true);
    setLoadingLabel("Loading filtered universities...");
    setError("");

    try {
      const params = new URLSearchParams();

      if (nextFilters.country) params.set("country", nextFilters.country);
      if (nextFilters.degreeLevel) params.set("degree_level", nextFilters.degreeLevel);
      if (nextFilters.feeType === "free") params.set("fee_type", "free");
      if (nextFilters.feeType === "paid") params.set("fee_type", "paid");
      if (nextFilters.scholarshipAvailable === "yes") params.set("scholarship_available", "true");

      const queryString = params.toString();
      const response = await fetch(`${API_BASE_URL}/universities${queryString ? `?${queryString}` : ""}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch universities (${response.status})`);
      }

      const data = await response.json();
      setUniversities(Array.isArray(data) ? data : []);
      setViewMode("browse");
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load universities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchBrowseUniversities(DEFAULT_FILTERS);
    // The initial load should happen once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(field, value) {
    const nextFilters = {
      ...filters,
      [field]: value,
    };

    setFilters(nextFilters);
    void fetchBrowseUniversities(nextFilters);
  }

  async function handleSearchSubmit(event) {
    event.preventDefault();

    const query = searchText.trim();
    if (!query) {
      await fetchBrowseUniversities(filters);
      return;
    }

    setLoading(true);
    setLoadingLabel("Searching universities...");
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setUniversities(results);
      setViewMode("search");
    } catch (searchError) {
      setError(searchError.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function clearSearch() {
    setSearchText("");
    await fetchBrowseUniversities(filters);
  }

  const activeCount = Object.values(filters).filter((value) => value && value !== "any").length;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-blue-950/30">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Admissions intelligence</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Find universities with open admissions faster.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Search by natural language, filter by country or funding needs, and compare deadlines across countries in one place.
        </p>

        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder='Try "Masters in Canada with no application fee"'
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-2xl bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Search
          </button>
          {viewMode === "search" ? (
            <button
              type="button"
              onClick={() => void clearSearch()}
              className="rounded-2xl border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Show filtered list
            </button>
          ) : null}
        </form>

        <p className="mt-4 text-sm text-slate-400">
          {viewMode === "search"
            ? `Showing natural-language search results for "${searchText.trim() || "query"}".`
            : "Browse mode is active. Filter changes update the live university list below."}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Filters</h2>
              <p className="text-sm text-slate-400">Refine the browse list.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {activeCount} active
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Country</span>
              <select
                value={filters.country}
                onChange={(event) => handleFilterChange("country", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                <option value="">Any country</option>
                {COUNTRY_OPTIONS.filter(Boolean).map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Degree level</span>
              <select
                value={filters.degreeLevel}
                onChange={(event) => handleFilterChange("degreeLevel", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                <option value="">Any level</option>
                {DEGREE_LEVEL_OPTIONS.filter(Boolean).map((degreeLevel) => (
                  <option key={degreeLevel} value={degreeLevel}>
                    {degreeLevel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Application fee</span>
              <select
                value={filters.feeType}
                onChange={(event) => handleFilterChange("feeType", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                <option value="any">Any</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Scholarship available</span>
              <select
                value={filters.scholarshipAvailable}
                onChange={(event) => handleFilterChange("scholarshipAvailable", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                <option value="any">Any</option>
                <option value="yes">Yes</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                void fetchBrowseUniversities(DEFAULT_FILTERS);
              }}
              className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Reset filters
            </button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {viewMode === "search" ? "Search results" : "Universities"}
              </h2>
              <p className="text-sm text-slate-400">
                {viewMode === "search"
                  ? "Results returned by the natural-language search endpoint."
                  : "Results returned from MongoDB using the current filter settings."}
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
              {universities.length} result{universities.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-300">
              {loadingLabel}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
              {error}
            </div>
          ) : universities.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-300">
              No results found.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {universities.map((university) => (
                <UniversityCard
                  key={university.university_id || `${university.university_name}-${university.country}`}
                  university={university}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
