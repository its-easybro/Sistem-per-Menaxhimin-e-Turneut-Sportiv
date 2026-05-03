import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Trash2, Eye, Check } from "lucide-react";

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

export default function AdminContactUs() {
  const { user } = useContext(AuthContext);

  // State Variables
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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
  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/contactUs/${id}/read`);
      setMessages(
        messages.map((msg) =>
          msg.id === id ? { ...msg, lexuar: true, lexuar_at: new Date() } : msg
        )
      );
      setAlert({ type: 'success', message: 'Message marked as read!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error marking as read: ' + err.message });
    }
  };

  // Handle view
  const handleView = (id) => {
    const message = messages.find((msg) => msg.id === id);
    if (!message) return;
    setSelectedMessage(message);
    setShowViewModal(true);
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
      setMessages(messages.filter((msg) => msg.id !== selectedMessage.id));
      setShowDeleteModal(false);
      setSelectedMessage(null);
      setAlert({ type: 'success', message: 'Message deleted successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting message: ' + err.message });
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowViewModal(false);
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    return (
      msg.emri?.toLowerCase().includes(query) ||
      msg.email?.toLowerCase().includes(query) ||
      msg.mesazhi?.toLowerCase().includes(query)
    );
  });

  // Loading state
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm">
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Contact Messages
            </h2>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search by name, email, or message"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400"
            />
            <svg
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Messages table section */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          {filteredMessages.length === 0 ? (
            <div className="w-full px-6 py-12 text-center text-gray-600">
              {searchQuery
                ? `No messages match "${searchQuery}". Try a different search.`
                : 'No contact messages found.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Message Preview</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Date</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {msg.emri}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {msg.email}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                      {msg.mesazhi}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          msg.lexuar
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {msg.lexuar ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-center">
                      {formatDate(msg.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {!msg.lexuar && (
                          <button
                            onClick={() => handleMarkAsRead(msg.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                            title="Mark Read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(msg.id)}
                          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* View Message Modal */}
        {showViewModal && selectedMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Message Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMessage.emri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMessage.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <div className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                    {selectedMessage.mesazhi}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMessage.lexuar ? 'Read' : 'Unread'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Received
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {formatDate(selectedMessage.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Message Modal */}
        {showDeleteModal && selectedMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Delete Message</h3>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to delete this message from{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedMessage.emri}
                  </span>
                  ?
                </p>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}