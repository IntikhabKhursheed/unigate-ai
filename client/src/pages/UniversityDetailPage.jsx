import { useParams } from "react-router-dom";

function UniversityDetailPage() {
  const { id } = useParams();

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
      <h1 className="text-3xl font-semibold">University Detail</h1>
      <p className="mt-2 text-slate-300">University ID: {id}</p>
      <p className="mt-4 text-slate-400">
        TODO: fetch and render full university data, program details, and deadline information.
      </p>
    </section>
  );
}

export default UniversityDetailPage;
