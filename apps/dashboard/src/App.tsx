import { Navigate, Outlet, Route, Routes } from "react-router";
import { AuthGate } from "@/components/auth-gate";
import { Nav } from "@/components/nav";
import { Login } from "@/routes/login";
import { SummaryForm } from "@/routes/summary-form";
import { ContextView } from "@/routes/context";
import { Live } from "@/routes/live";
import { Import } from "@/routes/import";

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
          <Route index element={<ContextView />} />
          <Route path="import" element={<Import />} />
          <Route path="live" element={<Live />} />
          <Route path="summaries/new" element={<SummaryForm />} />
          <Route path="summaries/:id/edit" element={<SummaryForm />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
