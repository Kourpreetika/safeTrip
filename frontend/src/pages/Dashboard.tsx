import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Journey, Stats } from "../types";

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incoming, setIncoming] = useState<Journey[]>([]);

  useEffect(() => {
    void api<Stats>("/api/journeys/stats").then(setStats);
    void api<{ journeys: Journey[] }>("/api/journeys/incoming").then((d) => setIncoming(d.journeys));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-lead">Start a new journey or follow someone who added you as a trusted contact.</p>

      {stats?.active && (
        <Link
          to={`/app/journey/${stats.active.id}`}
          className="mt-5 block rounded-xl bg-header p-4 text-white transition hover:brightness-110"
        >
          <div className="flex items-center gap-2 text-sm text-primary">Journey in progress</div>
          <div className="mt-1 text-lg font-semibold">
            {stats.active.startAddress} → {stats.active.destAddress}
          </div>
          <div className="mt-1 text-sm text-white/80">
            {stats.active.driverName} · {stats.active.vehicleNumber}
            {stats.active.sosActive ? " · SOS is active" : ""}
          </div>
        </Link>
      )}

      {!stats?.active && (stats?.drafts?.length ?? 0) > 0 && (
        <section className="mt-5">
          <h2 className="text-lg font-semibold text-ink">Saved drafts</h2>
          <p className="mt-1 text-sm text-muted">Open a draft to start it. Tick or untick trusted contacts — you do not add them again.</p>
          <div className="mt-3 space-y-3">
            {stats!.drafts!.map((j) => (
              <Link
                key={j.id}
                to={`/app/journey/new?draft=${j.id}`}
                className="card block p-4 transition hover:bg-surface"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-muted">Draft</div>
                <div className="mt-1 font-medium text-ink">
                  {j.startAddress} → {j.destAddress}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {j.driverName} · {j.vehicleNumber} · tap to start
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total trips", value: stats?.total ?? "—" },
          { label: "Completed", value: stats?.completed ?? "—" },
          { label: "Km travelled", value: stats?.kmTravelled ?? "—" },
          { label: "SOS events", value: stats?.sosCount ?? "—" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-2xl font-semibold text-ink">{c.value}</div>
            <div className="mt-1 text-sm text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      {stats && stats.total === 0 && !stats.active && (
        <div className="empty-state mt-5">
          <p>No journeys yet.</p>
          <p className="mt-1">Add trusted contacts, then start a journey with your pickup and destination.</p>
          <Link to="/app/contacts" className="link mt-3 inline-block">
            Add contacts
          </Link>
        </div>
      )}

      <Link to="/app/journey/new" className="btn-primary mt-5 w-full py-3">
        Start a Safe Journey
      </Link>

      {incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Journeys you are watching</h2>
          <p className="mt-1 text-sm text-muted">These arrived automatically because your phone matches a trusted contact.</p>
          <div className="mt-3 space-y-3">
            {incoming.map((j) => (
              <Link key={j.id} to={`/track/${j.shareToken}`} className="card block p-4 transition hover:bg-surface">
                <div className="font-medium text-ink">{j.user?.name ?? "Traveller"} is travelling</div>
                <div className="mt-0.5 text-sm text-muted">
                  {j.startAddress} → {j.destAddress}
                </div>
                {j.sosActive && <div className="mt-1 text-sm font-medium text-sos">SOS is active</div>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
