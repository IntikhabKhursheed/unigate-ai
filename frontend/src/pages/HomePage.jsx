const sampleUniversities = [
  {
    id: "uet-lahore",
    name: "University of Engineering and Technology Lahore",
    country: "Pakistan",
    deadline: "2026-08-15",
    feeType: "Paid",
  },
  {
    id: "university-of-manchester",
    name: "The University of Manchester",
    country: "UK",
    deadline: "2026-10-01",
    feeType: "Free",
  },
];

function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-blue-950/30">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Admissions intelligence</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Find universities with open admissions faster.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Search by natural language, compare deadlines, and surface programs across countries in one place.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-slate-400">
          TODO: add natural-language search bar and filter sidebar.
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Sample results</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sampleUniversities.map((university) => (
            <article
              key={university.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium">{university.name}</h3>
                  <p className="text-sm text-slate-400">{university.country}</p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs text-sky-300">
                  Deadline: {university.deadline}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">Application fee: {university.feeType}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
