import { Link } from "react-router-dom";

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

export function formatDeadline(start, end) {
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

export function formatApplicationFee(university) {
  if (university.application_fee_required === false) {
    return "Free";
  }

  if (university.application_fee_required === true) {
    if (
      typeof university.application_fee_amount === "number" &&
      Number.isFinite(university.application_fee_amount) &&
      typeof university.application_fee_currency === "string" &&
      university.application_fee_currency.trim()
    ) {
      const currency = university.application_fee_currency.trim().toUpperCase();

      try {
        const formatter = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        });
        return `${formatter.format(university.application_fee_amount)} ${currency}`;
      } catch {
        return `${university.application_fee_amount} ${currency}`;
      }
    }

    return "Paid";
  }

  return "Unknown";
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

function UniversityCard({ university, score, showDetailsLink = true }) {
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
          <div className="flex flex-col items-end gap-2">
            {typeof score === "number" ? (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
                Match score: {score}/100
              </span>
            ) : null}
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${feeBadge.className}`}>
              {feeBadge.label} application
            </span>
          </div>
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
            <span className="text-slate-400">Application fee:</span> {formatApplicationFee(university)}
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
          {showDetailsLink ? (
            <Link
              to={`/universities/${university.university_id}`}
              className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
            >
              View details
            </Link>
          ) : (
            <span className="text-sm text-slate-500">Details hidden</span>
          )}
          <span className="text-xs text-slate-500">
            Confidence: {university.extraction_confidence || "unknown"}
          </span>
        </div>
      </div>
    </article>
  );
}

export default UniversityCard;
