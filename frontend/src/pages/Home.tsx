import { Clock, MapPinned, ShieldAlert, TriangleAlert, Users } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GuestShell } from "../components/Layout";
import { HeroArt } from "../components/HeroArt";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    icon: MapPinned,
    title: "Live Journey Tracking",
    text: "Share your live location, planned route, and destination on one map for the whole trip.",
  },
  {
    icon: Users,
    title: "Trusted Contacts",
    text: "Choose who gets an in-app alert when a journey starts, goes off-route, or needs SOS.",
  },
  {
    icon: Clock,
    title: "Real-Time ETA",
    text: "People watching your trip see an arrival time that updates as you move.",
  },
  {
    icon: TriangleAlert,
    title: "Route Deviation Alerts",
    text: "If you go far off the planned path, selected contacts get an alert so they can check in.",
  },
  {
    icon: ShieldAlert,
    title: "One-Tap SOS",
    text: "Alerts your trusted contacts in SafeTrip with your live location, driver name, and vehicle number. Cancel anytime if it was a mistake.",
  },
];

const steps = [
  {
    n: "1",
    title: "Add trusted contacts",
    text: "Save the people you trust with the mobile number they used to register.",
  },
  {
    n: "2",
    title: "Start a journey",
    text: "Enter pickup, destination, driver name, and vehicle number, then choose who to notify.",
  },
  {
    n: "3",
    title: "Stay connected",
    text: "They get the alert in SafeTrip and can open the live map from their dashboard.",
  },
  {
    n: "4",
    title: "Use SOS if you need help",
    text: "One tap alerts your contacts with your location, driver, and vehicle. Cancel anytime if it was accidental.",
  },
];

export function HomePage() {
  const { user } = useAuth();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const startTo = user ? "/app/journey/new" : "/register";

  return (
    <GuestShell>
      <main>
        <section className="border-b border-line bg-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:gap-12 md:py-16">
            <div className="hero-fade min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Live trip safety
              </p>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl md:text-[2.75rem]">
                Your Journey. Your Safety. Always Connected.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                Share a live journey with trusted contacts and keep emergency assistance one tap away. Before you get in
                a cab, auto, or bike taxi, start a trip so someone you trust can follow your location, ETA, and ride
                details.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={startTo} className="btn-primary px-6 py-3 text-sm">
                  Start a Safe Journey
                </Link>
                <a href="#features" className="btn-secondary px-6 py-3 text-sm">
                  Learn More
                </a>
              </div>
            </div>

            <div className="hero-fade-delay min-w-0">
              <HeroArt />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Safety that travels with you</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Live location, ride details, and SOS — so the people who care about you always know you are okay.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="card p-5">
                  <span className="icon-badge">
                    <f.icon size={18} strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="card p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-ink">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="safety" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="card overflow-hidden md:grid md:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6 md:p-10">
                <p className="text-xs font-bold uppercase tracking-wider text-sos">Emergency</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">One-tap SOS when it matters</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  If something feels wrong, tap SOS. Your selected contacts get your live location, driver name, vehicle
                  number, and a map link immediately. You can cancel if it was sent by mistake.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-ink">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sos" />
                    Contacts are notified immediately
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sos" />
                    Location updates more frequently while SOS is active
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sos" />
                    Ride details go with the alert, not just a pin on a map
                  </li>
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center bg-ink px-6 py-10 text-center">
                <p className="text-sm font-medium text-white/70">On an active journey</p>
                <div className="mt-4 w-full max-w-xs rounded-xl bg-sos px-6 py-5 text-lg font-bold tracking-wide text-white">
                  SOS
                </div>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                  Help is one tap away. Your contacts get your location and ride details right away.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </GuestShell>
  );
}
