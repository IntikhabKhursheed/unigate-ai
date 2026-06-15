import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatApplicationFee, formatDeadline } from "../components/UniversityCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function DetailItem({ label, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm text-slate-100">{children}</div>
    </div>
  );
}

function UniversityDetailPage() {
  const { id } = useParams();
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUniversity() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/universities/${id}`);
        if (response.status === 404) {
          throw new Error("University not found");
        }
        if (!response.ok) {
          throw new Error(`Failed to load university (${response.status})`);
        }

        const data = await response.json();
        if (isMounted) {
          setUniversity(data);
        }
      } catch (fetchError) {
        if (isMounted) {
          setUniversity(null);
          setError(fetchError.message || "Failed to load university");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUniversity();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-sm font-medium text-sky-300 transition hover:text-sky-200">
            Back to Search
          </Link>
          <h1 className="mt-3 text-3xl font-semibold">University Detail</h1>
        </div>
        {university?.extraction_confidence ? (
          <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
            Confidence: {university.extraction_confidence}
          </span>
        ) : null}
      </div>

      {university?.extraction_confidence === "manual_seed" && university?.source_url ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <span className="font-medium">Demo seed data:</span> This is demo/seed data - verify details on the official university website.{" "}
          <a
            href={university.source_url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-amber-200 underline underline-offset-2 transition hover:text-amber-100"
          >
            Open source
          </a>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
          Loading university details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          {error}
        </div>
      ) : university ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">{university.university_name}</h2>
            <p className="mt-1 text-slate-400">
              {university.country} {" • "} {university.degree_level}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Program">{university.program_name}</DetailItem>
            <DetailItem label="Deadline">
              {formatDeadline(university.application_deadline_start, university.application_deadline_end)}
            </DetailItem>
            <DetailItem label="Application fee">{formatApplicationFee(university)}</DetailItem>
            <DetailItem label="Scholarship">
              {university.scholarship_available ? (
                <span>{university.scholarship_details || "Available"}</span>
              ) : (
                <span className="text-slate-400">Not available or not listed</span>
              )}
            </DetailItem>
            <DetailItem label="Program URL">
              {university.program_url ? (
                <a
                  href={university.program_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-300 transition hover:text-sky-200"
                >
                  Open program page
                </a>
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </DetailItem>
            <DetailItem label="Source">
              {university.source_url ? (
                <a
                  href={university.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-300 transition hover:text-sky-200"
                >
                  View source
                </a>
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </DetailItem>
            <DetailItem label="Extracted at">{university.extracted_at || "Not specified"}</DetailItem>
          </div>

          <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-100">
              Additional notes
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {university.notes || "No additional notes available."}
            </p>
          </details>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">
          No university data found.
        </div>
      )}
    </section>
  );
}

export default UniversityDetailPage;
