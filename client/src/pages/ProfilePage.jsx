import { useEffect, useMemo, useState } from "react";
import UniversityCard from "../components/UniversityCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const FALLBACK_COUNTRIES = ["Canada", "Germany", "Pakistan", "Turkey", "UK"];

function ProfilePage() {
  const [field, setField] = useState("Computer Science");
  const [degreeLevel, setDegreeLevel] = useState("Masters");
  const [preferredCountries, setPreferredCountries] = useState([]);
  const [preferFreeApplications, setPreferFreeApplications] = useState(false);
  const [availableCountries, setAvailableCountries] = useState(FALLBACK_COUNTRIES);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCountries() {
      try {
        const response = await fetch(`${API_BASE_URL}/universities`);
        if (!response.ok) {
          throw new Error("Failed to load countries");
        }

        const data = await response.json();
        const countries = new Set(FALLBACK_COUNTRIES);
        for (const university of Array.isArray(data) ? data : []) {
          if (university.country) {
            countries.add(university.country);
          }
        }

        if (isMounted) {
          setAvailableCountries(Array.from(countries).sort());
        }
      } catch {
        if (isMounted) {
          setAvailableCountries(FALLBACK_COUNTRIES);
        }
      } finally {
        if (isMounted) {
          setLoadingCountries(false);
        }
      }
    }

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCountriesLabel = useMemo(() => {
    if (preferredCountries.length === 0) {
      return "No country preference selected.";
    }

    return preferredCountries.join(", ");
  }, [preferredCountries]);

  function toggleCountry(country) {
    setPreferredCountries((current) =>
      current.includes(country) ? current.filter((item) => item !== country) : [...current, country]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field,
          degree_level: degreeLevel === "Any" ? "" : degreeLevel,
          max_budget: preferFreeApplications ? 0 : null,
          preferred_countries: preferredCountries,
        }),
      });

      if (!response.ok) {
        throw new Error(`Recommendation request failed (${response.status})`);
      }

      const data = await response.json();
      setRecommendations(Array.isArray(data.results) ? data.results : []);
    } catch (submitError) {
      setRecommendations([]);
      setError(submitError.message || "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
      <div>
        <h1 className="text-3xl font-semibold">Profile & Recommendations</h1>
        <p className="mt-2 text-slate-400">
          Tell UniGate what you want to study and it will rank universities by how well they match.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Field of study</span>
            <input
              type="text"
              value={field}
              onChange={(event) => setField(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
              placeholder="Computer Science"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Degree level</span>
            <select
              value={degreeLevel}
              onChange={(event) => setDegreeLevel(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              <option value="Any">Any</option>
              <option value="Bachelors">Bachelors</option>
              <option value="Masters">Masters</option>
              <option value="PhD">PhD</option>
            </select>
          </label>

          <div>
            <p className="mb-2 text-sm text-slate-300">Preferred countries</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {loadingCountries ? (
                <p className="text-sm text-slate-500">Loading countries...</p>
              ) : (
                availableCountries.map((country) => (
                  <label key={country} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={preferredCountries.includes(country)}
                      onChange={() => toggleCountry(country)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-400"
                    />
                    {country}
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">{selectedCountriesLabel}</p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={preferFreeApplications}
              onChange={(event) => setPreferFreeApplications(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-400"
            />
            Prefer free applications
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-400"
          >
            Get recommendations
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Recommended universities</h2>
              <p className="text-sm text-slate-400">
                Ranked by the recommendation algorithm in the backend.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
              {recommendations.length} result{recommendations.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
              Loading recommendations...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
              {error}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
              Submit the form to see ranked university matches.
            </div>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((university) => (
                <UniversityCard
                  key={university.university_id}
                  university={university}
                  score={university.score}
                />
              ))}
            </div>
          )}
        </div>
      </form>
    </section>
  );
}

export default ProfilePage;
