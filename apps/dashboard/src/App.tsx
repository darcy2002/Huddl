import { Navigate, Outlet, Route, Routes } from "react-router";
import { AuthGate } from "@/components/auth-gate";
import { Nav } from "@/components/nav";
import { Login } from "@/routes/login";
import { Summaries } from "@/routes/summaries";
import { SummaryForm } from "@/routes/summary-form";
import { ContextView } from "@/routes/context";
import { ApiKeys } from "@/routes/api-keys";

function Layout() {
  return (
    <div className="min-h-svh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGate />}>
        <Route element={<Layout />}>
          <Route index element={<Summaries />} />
          <Route path="summaries/new" element={<SummaryForm />} />
          <Route path="summaries/:id/edit" element={<SummaryForm />} />
          <Route path="context" element={<ContextView />} />
          <Route path="api-keys" element={<ApiKeys />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
