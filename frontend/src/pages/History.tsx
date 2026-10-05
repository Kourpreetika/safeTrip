import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Journey } from "../types";

export function HistoryPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);

  useEffect(() => {
    void api<{ journeys: Journey[] }>("/api/journeys").then((d) => setJourneys(d.journeys));
  }, []);

  const completed = journeys.filter((j) => j.status === "completed");
  const off = completed.filter((j) => j.hadRouteDeviation || j.offRoute).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Journey History</h1>
      <p className="page-lead">
        {completed.length} completed · {off} had a route deviation
      </p>
      {journeys.length === 0 && (
        <div className="empty-state mt-6">
          <p>No journeys yet.</p>
          <Link className="link mt-2 inline-block" to="/app/journey/new">
            Create a journey
          </Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {journeys.map((j) => (
          <li key={j.id}>
            <Link
              to={
                j.status === "active"
                  ? `/app/journey/${j.id}`
                  : j.status === "draft"
                    ? `/app/journey/new?draft=${j.id}`
                    : `/track/${j.shareToken}`
              }
              className="card block p-4 transition hover:bg-surface"
            >
              <div className="flex items-center justify-between text-sm text-muted">
                <span
                  className={`status-pill capitalize ${
                    j.sosActive || (j.sosEvents && j.sosEvents.length > 0)
                      ? "bg-red-50 text-sos"
                      : j.status === "active"
                        ? "bg-primary text-ink"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {j.status}
                </span>
                <span>{new Date(j.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-2 font-medium text-ink">
                {j.startAddress} → {j.destAddress}
              </div>
              <div className="mt-0.5 text-sm text-muted">
                {j.driverName} · {j.vehicleNumber}
                {j.sosEvents && j.sosEvents.length > 0 ? " · SOS was used" : ""}
                {j.hadRouteDeviation || j.offRoute ? " · left planned route" : ""}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
