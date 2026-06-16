import { useEffect, useState } from "react";
import UniversityCard from "../components/UniversityCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const DEGREE_LEVEL_OPTIONS = ["", "Bachelors", "Masters", "PhD", "Other"];

const DEFAULT_FILTERS = {
  country: "",
  degreeLevel: "",
  feeType: "any",
  scholarshipAvailable: "any",
};

function HomePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [universities, setUniversities] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);
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
      if (
        nextFilters === DEFAULT_FILTERS ||
        (nextFilters.country === "" &&
          nextFilters.degreeLevel === "" &&
          nextFilters.feeType === "any" &&
          nextFilters.scholarshipAvailable === "any")
      ) {
        const countries = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .map((university) => university.country)
              .filter(Boolean)
          )
        ).sort();
        setAvailableCountries(countries);
      }
      setViewMode("browse");
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load universities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchBrowseUniversities(DEFAULT_FILTERS);
    // Load the browse list once on page mount.
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
                {availableCountries.map((country) => (
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
