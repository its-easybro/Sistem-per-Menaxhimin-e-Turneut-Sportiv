import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  Eye,
  Fingerprint,
  LockKeyhole,
  LogOut,
  Mail,
  PenLine,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Ticket,
  Trophy,
  User,
  Users,
  Wifi,
} from "lucide-react";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import api from "../../config/axiosInstance";

const roleMeta = {
  admin: { label: "Admin", badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  organizator: { label: "Organizer", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  gjyqtar: { label: "Referee", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  user: { label: "Spectator", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300" },
};

const baseTabs = [
  { key: "account", label: "Account", icon: User },
  { key: "security", label: "Security", icon: Shield },
  { key: "tickets", label: "Tickets", icon: Ticket },
];

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function initialsFromName(firstName = "", lastName = "") {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join("");
  return initials || "U";
}

function statusPillClass(active) {
  return active
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

function sectionCardClass(extra = "") {
  return `rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${extra}`;
}

function ProfileField({ label, value, readOnly = false, onChange, name, type = "text" }) {
  return (
    <div className="grid w-full items-center gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={onChange}
        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
      />
    </div>
  );
}

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const tabs = useMemo(() => {
    const items = [...baseTabs];
    if (user?.is_organizer) {
      items.push({ key: "organizer", label: "Organizer", icon: Trophy });
    }
    if (user?.is_referee) {
      items.push({ key: "referee", label: "Referee", icon: Fingerprint });
    }
    return items;
  }, [user]);

  const [activeTab, setActiveTab] = useState("account");
  const loadedUserIdRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [accountForm, setAccountForm] = useState({ emri: "", mbiemri: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [organizerData, setOrganizerData] = useState({ stats: null, tournaments: [] });
  const [refereeData, setRefereeData] = useState({ referee: null, upcomingMatches: [], pendingReports: [] });
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    if (!user?.id) return;
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const request = async (path, options = {}) => {
          const response = await api.request({
            url: path,
            method: options.method || "GET",
            data: options.body ? JSON.parse(options.body) : undefined,
          });

          return response.data;
        };

        const [summary, ticketsResponse, sessionsResponse, organizerResponse, refereeResponse] = await Promise.all([
          request("/profile"),
          request("/profile/tickets"),
          request("/profile/sessions"),
          user?.is_organizer ? request("/profile/organizer") : Promise.resolve(null),
          user?.is_referee ? request("/profile/referee") : Promise.resolve(null),
        ]);

        setProfile(summary);
        setAccountForm({
          emri: summary.emri || "",
          mbiemri: summary.mbiemri || "",
          email: summary.email || "",
        });
        setSessions(sessionsResponse?.sessions || []);
        setTickets(ticketsResponse?.tickets || []);
        setOrganizerData(organizerResponse || { stats: null, tournaments: [] });
        setRefereeData(refereeResponse || { referee: null, upcomingMatches: [], pendingReports: [] });
      } catch (requestError) {
        setError(requestError.message || "Failed to load profile data");
        loadedUserIdRef.current = null;
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id, user?.is_organizer, user?.is_referee]);

  const heroName = profile?.fullName || user?.full_name || [user?.emri, user?.mbiemri].filter(Boolean).join(" ") || "Your profile";
  const heroEmail = profile?.email || user?.email || "Not available";
  const memberSince = profile?.createdAt || user?.createdAt || user?.created_at;
  const roleKey = profile?.roli || user?.roli || "user";
  const roleLabel = roleMeta[roleKey]?.label || "Member";
  const initials = profile?.initials || initialsFromName(profile?.emri || user?.emri, profile?.mbiemri || user?.mbiemri);

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const request = async (path, options = {}) => {
    const response = await api.request({
      url: path,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
    });

    return response.data;
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    setSavingAccount(true);
    setMessage("");
    setError("");

    try {
      const updated = await request("/profile/account", {
        method: "PUT",
        body: JSON.stringify({
          emri: accountForm.emri,
          mbiemri: accountForm.mbiemri,
        }),
      });

      setProfile((current) => current ? { ...current, ...updated, fullName: updated.fullName } : current);
      setAccountForm((current) => ({ ...current, emri: updated.emri, mbiemri: updated.mbiemri, email: updated.email }));
      if (typeof updateUser === "function") {
        updateUser((currentUser) =>
          currentUser
            ? {
                ...currentUser,
                emri: updated.emri,
                mbiemri: updated.mbiemri,
                email: updated.email,
                full_name: updated.fullName,
              }
            : currentUser,
        );
      }
      setMessage("Account details updated successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to update account");
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage("");
    setError("");

    try {
      await request("/profile/password", {
        method: "PUT",
        body: JSON.stringify(passwordForm),
      });

      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password updated successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokeLoadingId(sessionId);
    setMessage("");
    setError("");

    try {
      await request(`/profile/sessions/${sessionId}`, {
        method: "DELETE",
      });

      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setMessage("Session revoked successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke session");
    } finally {
      setRevokeLoadingId(null);
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-white p-6 dark:bg-slate-900">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-white" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile data...</p>
          </div>
        </div>
      );
    }

    if (activeTab === "account") {
      return (
        <form onSubmit={handleAccountSubmit} className={sectionCardClass("p-6")}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Update your personal details. Email is read-only.</p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileField label="First Name" name="emri" value={accountForm.emri} onChange={handleAccountChange} />
              <ProfileField label="Last Name" name="mbiemri" value={accountForm.mbiemri} onChange={handleAccountChange} />
            </div>
            <ProfileField label="Email" name="email" value={accountForm.email} readOnly />
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-200 pt-6 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingAccount}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
            >
              {savingAccount ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === "security") {
      return (
        <div className="space-y-8">
          <form onSubmit={handlePasswordSubmit} className={sectionCardClass("p-6")}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use your current password to set a new one.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfileField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
              <ProfileField
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-6 dark:border-slate-800">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
              >
                {savingPassword ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Update Password
              </button>
            </div>
          </form>

          <div className={sectionCardClass("p-6")}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Sessions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Review and manage devices that are currently signed in.</p>
            </div>

            <div className="space-y-4">
              {sessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No active sessions found.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col items-start gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Wifi className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {session.browserLabel} on {session.deviceLabel}
                          {session.isCurrent && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          IP: {session.ipAddress || "Unknown"} &middot; Last seen: {formatDateTime(session.lastSeenAt || session.createdAt)}
                        </p>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokeLoadingId === session.id}
                        className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-500/50 bg-transparent px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus:ring-red-400 dark:focus:ring-offset-slate-900"
                      >
                        {revokeLoadingId === session.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        Revoke
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "tickets") {
      return (
        <div className={sectionCardClass("p-6")}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Support Tickets</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">A read-only history of your submitted support tickets.</p>
          </div>

          <div className="space-y-4">
            {tickets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No support tickets found.
              </p>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{ticket.subjekti || "No subject"}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {ticket.kategoria}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submitted: {formatDateTime(ticket.created_at)}</p>
                    </div>

                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:mt-0 ${
                        ticket.lexuar
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {ticket.lexuar ? "Resolved" : "Pending"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "organizer" && user?.is_organizer) {
      return (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className={sectionCardClass("p-4")}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tournaments</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{organizerData.stats?.totalTournaments ?? 0}</p>
            </div>
            <div className={sectionCardClass("p-4")}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Tournaments</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-500">{organizerData.stats?.activeTournaments ?? 0}</p>
            </div>
            <div className={sectionCardClass("p-4")}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{organizerData.stats?.completedTournaments ?? 0}</p>
            </div>
          </div>

          <div className={sectionCardClass("p-6")}>
            <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Tournaments</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage the competitions you currently own.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/organizer/tournaments")}
                className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900"
              >
                Go to Organizer Dashboard
              </button>
            </div>

            <div className="space-y-4">
              {organizerData.tournaments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No tournaments are assigned to this organizer yet.
                </p>
              ) : (
                organizerData.tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 md:flex md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{tournament.emertimi}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(tournament.data_fillimit)} - {formatDate(tournament.data_perfundimit)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Location: {tournament.lokacioni || "Not specified"}</p>
                    </div>
                    <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 md:mt-0">
                      {tournament.statusi}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "referee" && user?.is_referee) {
      const referee = refereeData.referee;

      return (
        <div className="space-y-8">
          <div className={sectionCardClass("p-6")}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Referee Details</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your official referee record linked to this account.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">License</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{referee?.nr_licences || "N/A"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{referee?.kategoria || "N/A"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Experience</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{referee?.pervoja_vitesh ?? "N/A"} years</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{referee?.telefoni || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className={sectionCardClass("p-6")}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upcoming Matches</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Matches you are scheduled to officiate.</p>
            </div>

            <div className="space-y-4">
              {refereeData.upcomingMatches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No upcoming assignments found.
                </p>
              ) : (
                refereeData.upcomingMatches.map((match) => (
                  <div key={match.matchId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {match.homeTeam || "Home"} vs {match.awayTeam || "Away"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {match.tournamentName || "Tournament"} &middot; {formatDate(match.matchDate)}{" "}
                          {match.matchTime ? `at ${formatTime(match.matchTime)}` : ""}
                        </p>
                      </div>
                      <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 sm:mt-0">
                        {match.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={sectionCardClass("p-6")}>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Match Reports</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Past matches that require a score report from you.</p>
            </div>

            <div className="space-y-4">
              {refereeData.pendingReports.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No pending reports found.
                </p>
              ) : (
                refereeData.pendingReports.map((match) => (
                  <div key={match.matchId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {match.homeTeam || "Home"} vs {match.awayTeam || "Away"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {match.tournamentName || "Tournament"} &middot; Date: {formatDate(match.matchDate)}
                        </p>
                      </div>
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-300 sm:mt-0">
                        Missing score report
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{heroName}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{heroEmail}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Member since {formatDate(memberSince)}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${roleMeta[roleKey]?.badge || "bg-slate-100 text-slate-800"}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {(message || error) && (
          <div className={`mb-6 rounded-lg border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"}`}>
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${isActive ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="lg:col-span-3">{renderTabContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default Profile;