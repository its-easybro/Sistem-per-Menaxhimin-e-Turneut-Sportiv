import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import {
  Bug,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MailOpen,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

// Format date from ISO string to readable format (DD/MM/YYYY)
const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Invalid date";
  }
};

const getMessageSubject = (message) => {
  if (!message) return "No subject";
  const firstLine = message
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "No subject";
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
};

const getCategoryValue = (message) => {
  return String(message?.kategoria || message?.category || "other").toLowerCase();
};

const getCategoryBadge = (category) => {
  const styles = {
    dispute: {
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
      icon: ShieldAlert,
      label: "Dispute",
    },
    upgrade: {
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
      icon: UserPlus,
      label: "Role Request",
    },
    bug: {
      color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
      icon: Bug,
      label: "Bug",
    },
    other: {
      color: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400",
      icon: HelpCircle,
      label: "General",
    },
  };

  const key = String(category || "other").toLowerCase();
  const config = styles[key] || styles.other;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${config.color}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
};

export default function AdminContactUs() {
  const { user } = useContext(AuthContext);

  // State Variables
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("unread");
  const [expandedId, setExpandedId] = useState(null);
  const [alert, setAlert] = useState(null);

  // Fetch messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get("/contactUs");
        setMessages(response.data);
      } catch (err) {
        setError(err.message || "Failed to fetch messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Handle mark as read
  const handleMarkAsRead = async (id, event) => {
    if (event) event.stopPropagation();
    try {
      await api.patch(`/contactUs/${id}/read`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, lexuar: true, lexuar_at: new Date() } : msg
        )
      );
      setAlert({ type: 'success', message: 'Message marked as read!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error marking as read: ' + err.message });
    }
  };

  // Handle delete
  const handleDelete = (id) => {
    const message = messages.find((msg) => msg.id === id);
    if (!message) return;
    setSelectedMessage(message);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!selectedMessage) return;

    try {
      await api.delete(`/contactUs/${selectedMessage.id}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
      if (expandedId === selectedMessage.id) {
        setExpandedId(null);
      }
      setShowDeleteModal(false);
      setSelectedMessage(null);
      setAlert({ type: 'success', message: 'Message deleted successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting message: ' + err.message });
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((msg) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      msg.emri?.toLowerCase().includes(query) ||
      msg.email?.toLowerCase().includes(query) ||
      msg.subjekti?.toLowerCase().includes(query) ||
      msg.kategoria?.toLowerCase().includes(query) ||
      msg.mesazhi?.toLowerCase().includes(query);
    const isRead = Boolean(msg.lexuar);
    const matchesTab = activeTab === "unread" ? !isRead : isRead;
    return matchesQuery && matchesTab;
  });

  const unreadCount = messages.filter((msg) => !msg.lexuar).length;

  // Loading state
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
            Support Inbox
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-sm font-bold px-2.5 py-0.5 rounded-full relative top-[-2px]">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Manage and resolve user inquiries and system reports.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-colors relative ${
              activeTab === "unread"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Mail size={18} />
            Needs Action
            {activeTab === "unread" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-colors relative ${
              activeTab === "read"
                ? "text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800/50"
                : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <MailOpen size={18} />
            Resolved
            {activeTab === "read" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-slate-500"></span>
            )}
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-slate-400">
              <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Inbox Zero!</p>
              <p className="text-sm mt-1">No {activeTab} messages found.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              const isUnread = !msg.lexuar;
              const subject = msg.subjekti || getMessageSubject(msg.mesazhi);
              const category = getCategoryValue(msg);

              return (
                <div
                  key={msg.id}
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                  className={`p-4 sm:p-6 transition-colors cursor-pointer ${
                    isExpanded
                      ? "bg-gray-50/50 dark:bg-slate-800/30"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white truncate">
                          {msg.emri}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 truncate">
                          &lt;{msg.email}&gt;
                        </span>
                        <div className="hidden sm:block">
                          {getCategoryBadge(category)}
                        </div>
                      </div>
                      <h4
                        className={`text-sm ${
                          isUnread
                            ? "font-bold text-gray-900 dark:text-slate-100"
                            : "font-medium text-gray-600 dark:text-slate-400"
                        }`}
                      >
                        {subject}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-slate-500">
                        <Clock size={14} />
                        {formatDate(msg.created_at)}
                      </div>

                      {isUnread && (
                        <button
                          onClick={(event) => handleMarkAsRead(msg.id, event)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={16} />
                          <span className="hidden sm:inline">Resolve</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="sm:hidden mb-4">
                        {getCategoryBadge(category)}
                      </div>
                      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {msg.mesazhi}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1"></div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(msg.id);
                          }}
                          className="inline-flex items-center gap-1.5 self-end text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showDeleteModal && selectedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6 dark:text-slate-100">Delete Message</h3>
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-slate-300">
                Are you sure you want to delete this message from{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedMessage.emri}
                </span>
                ?
              </p>
            </div>
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-200 dark:bg-red-700 dark:hover:bg-red-600"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}