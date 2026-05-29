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
  admin: { label: "Admin", badge: "bg-slate-900 text-white dark:bg-slate-700" },
  organizator: { label: "Organizer", badge: "bg-emerald-600 text-white" },
  gjyqtar: { label: "Referee", badge: "bg-amber-500 text-white" },
  user: { label: "Spectator", badge: "bg-sky-600 text-white" },
};

const baseTabs = [
  { key: "account", label: "Account Management", icon: User },
  { key: "security", label: "Security & Sessions", icon: Shield },
  { key: "tickets", label: "Support Tickets", icon: Ticket },
];

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
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
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

function sectionCardClass(extra = "") {
  return `rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${extra}`;
}

function ProfileField({ label, value, readOnly = false, onChange, name, type = "text" }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-700 dark:disabled:bg-slate-900/60"
      />
    </label>
  );
}

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const tabs = useMemo(() => {
    const items = [...baseTabs];
    if (user?.is_organizer) {
      items.push({ key: "organizer", label: "Organizer Dashboard", icon: Trophy });
    }
    if (user?.is_referee) {
      items.push({ key: "referee", label: "Referee Dashboard", icon: Fingerprint });
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
        <div className={sectionCardClass("flex min-h-[280px] items-center justify-center") }>
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-white" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile data...</p>
          </div>
        </div>
      );
    }

    if (activeTab === "account") {
      return (
        <form onSubmit={handleAccountSubmit} className={`${sectionCardClass()} space-y-5`}>
          <div className="flex items-center gap-3">
            <PenLine className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account Management</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your personal details. Email stays locked for this profile.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProfileField label="First Name" name="emri" value={accountForm.emri} onChange={handleAccountChange} />
            <ProfileField label="Last Name" name="mbiemri" value={accountForm.mbiemri} onChange={handleAccountChange} />
          </div>

          <ProfileField label="Email" name="email" value={accountForm.email} readOnly />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingAccount}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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
        <div className="space-y-6">
          <form onSubmit={handlePasswordSubmit} className={sectionCardClass()}>
            <div className="mb-5 flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use your current password to set a new one.</p>
              </div>
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

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingPassword ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Update Password
              </button>
            </div>
          </form>

          <div className={sectionCardClass()}>
            <div className="mb-5 flex items-center gap-3">
              <Wifi className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Sessions</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review the devices that are currently signed in.</p>
              </div>
            </div>

            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No active sessions were found.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {session.browserLabel} on {session.deviceLabel}
                        </p>
                        {session.isCurrent && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Current session
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">IP: {session.ipAddress || "Unknown"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Last seen: {formatDateTime(session.lastSeenAt || session.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(session.isCurrent)}`}>
                        {session.isCurrent ? "Protected" : "Removable"}
                      </span>
                      {!session.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokeLoadingId === session.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          {revokeLoadingId === session.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                          Revoke
                        </button>
                      )}
                    </div>
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
        <div className={sectionCardClass()}>
          <div className="mb-5 flex items-center gap-3">
            <Ticket className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Support Tickets</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Read-only history of the messages submitted with your email address.</p>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No support tickets found.
              </p>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {ticket.subjekti || "No subject"}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {ticket.kategoria}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Submitted: {formatDateTime(ticket.created_at)}</p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        ticket.lexuar
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className={sectionCardClass()}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Tournaments</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{organizerData.stats?.totalTournaments ?? 0}</p>
            </div>
            <div className={sectionCardClass()}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active Tournaments</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{organizerData.stats?.activeTournaments ?? 0}</p>
            </div>
            <div className={sectionCardClass()}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Completed Tournaments</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{organizerData.stats?.completedTournaments ?? 0}</p>
            </div>
          </div>

          <div className={sectionCardClass()}>
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Tournaments</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage the competition list you currently own.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/organizer/tournaments")}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Draft New Tournament
              </button>
            </div>

            <div className="space-y-3">
              {organizerData.tournaments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No tournaments are assigned to this organizer yet.
                </p>
              ) : (
                organizerData.tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:flex md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{tournament.emertimi}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(tournament.data_fillimit)} - {formatDate(tournament.data_perfundimit)}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Location: {tournament.lokacioni || "Not specified"}</p>
                    </div>
                    <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200 md:mt-0">
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
        <div className="space-y-6">
          <div className={sectionCardClass()}>
            <div className="mb-5 flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Referee Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your official referee record linked to this account.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">License Number</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{referee?.nr_licences || "Not available"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{referee?.kategoria || "Not available"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Years of Experience</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{referee?.pervoja_vitesh ?? "Not available"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{referee?.telefoni || "Not available"}</p>
              </div>
            </div>
          </div>

          <div className={sectionCardClass()}>
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upcoming Assigned Matches</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Matches scheduled from today forward.</p>
              </div>
            </div>

            <div className="space-y-3">
              {refereeData.upcomingMatches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No upcoming assignments.
                </p>
              ) : (
                refereeData.upcomingMatches.map((match) => (
                  <div key={match.matchId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {match.homeTeam || "Home"} vs {match.awayTeam || "Away"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tournament: {match.tournamentName || "Unknown"}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(match.matchDate)} {match.matchTime ? `at ${formatTime(match.matchTime)}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {match.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={sectionCardClass()}>
            <div className="mb-5 flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Match Reports</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Past officiated matches without recorded scores.</p>
              </div>
            </div>

            <div className="space-y-3">
              {refereeData.pendingReports.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No pending reports found.
                </p>
              ) : (
                refereeData.pendingReports.map((match) => (
                  <div key={match.matchId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {match.homeTeam || "Home"} vs {match.awayTeam || "Away"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tournament: {match.tournamentName || "Unknown"}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Date: {formatDate(match.matchDate)}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-900 text-white shadow-2xl dark:border-slate-700">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto,1fr] lg:items-center lg:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-black text-slate-900 shadow-lg ring-8 ring-white/10">
                {initials}
              </div>
              <div>
                <span className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${roleMeta[roleKey]?.badge || "bg-white text-slate-900"}`}>
                  {roleLabel}
                </span>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{heroName}</h1>
                <p className="mt-2 text-sm text-white/75">{heroEmail}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-white/55">Account Status</p>
                <p className="mt-2 text-lg font-semibold">{profile?.statusi || user?.statusi || "Aktiv"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-white/55">Member Since</p>
                <p className="mt-2 text-lg font-semibold">{formatDate(memberSince)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-white/55">Profile Mode</p>
                <p className="mt-2 text-lg font-semibold">{user?.is_admin ? "Personal only" : "Role aware"}</p>
              </div>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[19rem,1fr]">
          <aside className={sectionCardClass("self-start lg:sticky lg:top-6") }>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Profile Tabs</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dynamic sections for your account.</p>
              </div>
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${isActive ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900" : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section>{renderTabContent()}</section>
        </div>
      </div>
    </div>
  );
};

export default Profile;