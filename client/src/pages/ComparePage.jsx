import { useEffect, useMemo, useState } from "react";
import { formatApplicationFee, formatDeadline } from "../components/UniversityCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function ComparePage() {
  const [universities, setUniversities] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
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

  function handleSelectionChange(event) {
    const values = Array.from(event.target.selectedOptions, (option) => option.value).slice(0, 3);
    setSelectedIds(values);
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Compare</h1>
          <p className="mt-2 text-slate-400">
            Select 2 to 3 universities and compare the most important admissions fields side by side.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedIds([])}
          className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Clear comparison
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Select universities to compare</span>
            <select
              multiple
              value={selectedIds}
              onChange={handleSelectionChange}
              className="min-h-56 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              {universities.map((university) => (
                <option key={university.university_id} value={university.university_id}>
                  {university.university_name} ({university.country})
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs text-slate-500">Hold Ctrl or Cmd to pick multiple universities, up to 3.</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
              Loading universities...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
              {error}
            </div>
          ) : selectedUniversities.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
              Choose 2 to 3 universities to see a comparison table.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/60">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="border-b border-slate-800 px-4 py-3">Field</th>
                    {selectedUniversities.map((university) => (
                      <th key={university.university_id} className="border-b border-slate-800 px-4 py-3">
                        {university.university_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["University", (u) => u.university_name],
                    ["Country", (u) => u.country],
                    ["Program", (u) => u.program_name],
                    ["Degree Level", (u) => u.degree_level],
                    ["Deadline", (u) => formatDeadline(u.application_deadline_start, u.application_deadline_end)],
                    ["Application Fee", (u) => formatApplicationFee(u)],
                    ["Scholarship", (u) => (u.scholarship_available ? u.scholarship_details || "Available" : "Not available")],
                    ["Confidence", (u) => u.extraction_confidence || "unknown"],
                  ].map(([label, getter]) => (
                    <tr key={label} className="odd:bg-slate-900/30">
                      <td className="border-b border-slate-800 px-4 py-3 font-medium text-slate-300">{label}</td>
                      {selectedUniversities.map((university) => (
                        <td key={university.university_id + label} className="border-b border-slate-800 px-4 py-3 text-slate-100">
                          {getter(university)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ComparePage;
