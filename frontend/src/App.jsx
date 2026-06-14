import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import UniversityDetailPage from "./pages/UniversityDetailPage";
import ComparePage from "./pages/ComparePage";
import ProfilePage from "./pages/ProfilePage";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            UniGate
          </Link>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link to="/">Search</Link>
            <Link to="/compare">Compare</Link>
            <Link to="/profile">Profile</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/universities/:id" element={<UniversityDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Layout>
  );
}

export default App;
