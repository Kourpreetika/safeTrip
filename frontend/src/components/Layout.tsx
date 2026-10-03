import { Bell, History, Home, LogOut, MapPinned, Menu, User, Users, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api/client";
import { SOCKET_URL } from "../lib/apiBase";
import { useEffect, useState, type ReactNode } from "react";
import type { AppNotification } from "../types";
import { BrandMark } from "./BrandMark";

export const appNavLinks = [
  { to: "/app", label: "Dashboard", icon: Home, end: true },
  { to: "/app/journey/new", label: "Create Journey", icon: MapPinned },
  { to: "/app/contacts", label: "Contacts", icon: Users },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/profile", label: "Profile", icon: User },
];

function navClass(isActive: boolean) {
  return `block whitespace-nowrap rounded-lg px-2.5 py-1.5 ${isActive ? "bg-white/15 font-medium" : "hover:bg-white/10"}`;
}

export function GuestHeader() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function signOut() {
    setOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-header text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <Link to="/" className="shrink-0">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
            Home
          </NavLink>
          {user ? (
            <>
              {appNavLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    l.to === "/app/journey/new"
                      ? "rounded-lg bg-primary px-3 py-1.5 font-semibold text-ink transition hover:brightness-95"
                      : navClass(isActive)
                  }
                >
                  {l.to === "/app/journey/new" ? "Start" : l.label}
                </NavLink>
              ))}
              <button type="button" className={`${navClass(false)} inline-flex items-center gap-1`} onClick={() => void signOut()}>
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => navClass(isActive)}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-ink transition hover:brightness-95"
              >
                Register
              </NavLink>
            </>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
          Menu
        </button>
      </div>

      {open && (
        <nav id="site-mobile-nav" className="border-t border-white/15 px-3 py-2 md:hidden" aria-label="Mobile">
          <Link to="/" className="block rounded-lg px-2 py-2 text-sm hover:bg-white/10" onClick={() => setOpen(false)}>
            Home
          </Link>
          {user ? (
            <>
              {appNavLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/app/journey/new"
                className="mt-1 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-ink"
                onClick={() => setOpen(false)}
              >
                Start a Safe Journey
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
                onClick={() => void signOut()}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block rounded-lg px-2 py-2 text-sm hover:bg-white/10" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link
                to="/register"
                className="mt-1 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-ink"
                onClick={() => setOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <BrandMark tone="dark" />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Share live trips with people you trust. Emergency help is one tap away.
          </p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-2 text-sm text-muted" aria-label="Footer">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <Link to={{ pathname: "/", hash: "features" }} className="hover:text-ink">
            Features
          </Link>
          <Link to={{ pathname: "/", hash: "how-it-works" }} className="hover:text-ink">
            How it works
          </Link>
          <Link to={{ pathname: "/", hash: "safety" }} className="hover:text-ink">
            Safety
          </Link>
          {user ? (
            <>
              <Link to="/app" className="hover:text-ink">
                Dashboard
              </Link>
              <Link to="/app/journey/new" className="hover:text-ink">
                Create Journey
              </Link>
              <Link to="/app/contacts" className="hover:text-ink">
                Contacts
              </Link>
              <Link to="/app/history" className="hover:text-ink">
                History
              </Link>
              <Link to="/app/profile" className="hover:text-ink">
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-ink">
                Login
              </Link>
              <Link to="/register" className="hover:text-ink">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <GuestHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [openNotes, setOpenNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = notes.filter((n) => !n.readAt).length;

  useEffect(() => {
    setMenuOpen(false);
    setOpenNotes(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      void api<{ notifications: AppNotification[] }>("/api/notifications")
        .then((d) => {
          if (!cancelled) setNotes(d.notifications);
        })
        .catch(() => undefined);
    }
    load();
    const socket = io(SOCKET_URL || undefined, { withCredentials: true });
    socket.on("notification", (data: { title?: string; type?: string }) => {
      load();
      if (data?.title) toast(data.title, data.type === "SOS_TRIGGERED" ? "err" : "ok");
    });
    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [toast]);

  async function signOut() {
    setMenuOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-50 bg-header text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="shrink-0">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
              Home
            </NavLink>
            {appNavLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  l.to === "/app/journey/new"
                    ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-ink transition hover:brightness-95"
                    : navClass(isActive)
                }
              >
                {l.to === "/app/journey/new" ? "Start" : l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm sm:inline">{user?.name?.split(" ")[0]}</span>
            <div className="relative">
              <button
                type="button"
                className="relative rounded-lg p-2 hover:bg-white/10"
                onClick={async () => {
                  setOpenNotes((v) => !v);
                  if (!openNotes && unread) await api("/api/notifications/read-all", { method: "POST" });
                }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sos" />}
              </button>
              {openNotes && (
                <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-card">
                  <div className="border-b border-line px-4 py-2 text-sm font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    {notes.length === 0 && <p className="px-4 py-6 text-sm text-muted">No notifications yet.</p>}
                    {notes.map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-surface"
                        onClick={() => {
                          setOpenNotes(false);
                          if (n.payload?.shareToken) navigate(`/track/${n.payload.shareToken}`);
                        }}
                      >
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="hidden items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-white/10 md:flex"
              onClick={() => void signOut()}
            >
              <LogOut size={16} /> Logout
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="app-mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
              Menu
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="app-mobile-nav" className="border-t border-white/15 px-4 py-2 md:hidden" aria-label="Mobile">
            <Link to="/" className="block rounded-lg px-2 py-2 text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            {appNavLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block rounded-lg px-2 py-2 text-sm hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/app/journey/new"
              className="mt-1 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-ink"
              onClick={() => setMenuOpen(false)}
            >
              Start a Safe Journey
            </Link>
            <button
              type="button"
              className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Logout
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white py-1 md:hidden">
        {appNavLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 border-t-2 py-1.5 text-[11px] ${
                isActive ? "border-primary font-semibold text-ink" : "border-transparent text-muted"
              }`
            }
          >
            <l.icon size={18} />
            {l.label === "Create Journey" ? "Journey" : l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
