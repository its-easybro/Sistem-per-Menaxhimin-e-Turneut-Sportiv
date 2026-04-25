import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

export default function Users() {
  // Uses auth context to enforce admin-only access and guard UI render timing.
  const { user, loading: authLoading } = useContext(AuthContext);
  // Manages user records, modal visibility, selected row, and form state.
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [alert, setAlert ] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    roli: "user",
  });

  // Loads all users after confirming the current user is an admin.
  useEffect(() => {
    const loadUsers = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/users`);

        const data = response.data;
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      email: "",
      username: "",
      full_name: "",
      password: "",
      roli: "user",
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (selected) => {
    setSelectedUser(selected);
    setFormData({
      email: selected.email || "",
      username: selected.username || "",
      full_name: selected.full_name || "",
      password: "",
      roli: selected.roli || "user",
    });
    setShowEditModal(true);
  };

  const handleDelete = (selected) => {
    setSelectedUser(selected);
    setShowDeleteModal(true);
  };

  const handleCloseCreateModal = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedUser(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedUser(null);
    setShowDeleteModal(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(`/users`, formData);

      const data = response.data;

      setUsers((prev) => [...prev, data]);
      setAlert({ type: 'success', message: 'User created successfully!' });
      handleCloseCreateModal();
    } catch (err) {
      setAlert({ type: 'error', message: `Error creating user: ${err.message}` });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      const response = await api.put(`/users/${selectedUser.id}`, formData)

      const data = response.data;

      setUsers((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setAlert({ type: 'success', message: 'User updated successfully!' });
      handleCloseEditModal();
    } catch (err) {
      setAlert({ type: 'error', message: `Error updating user: ${err.message}` });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await api.delete(`users/${selectedUser.id}`)

      setUsers((prev) => prev.filter((item) => item.id !== selectedUser.id));
      setAlert({ type: 'success', message: 'User deleted successfully!' });
      handleCloseDeleteModal();
    } catch (err) {
      setAlert({ type: 'error', message: `Error deleting user: ${err.message}` });
    }
  };

  // Filters users by email, username, or full name from search input.
  const filteredUsers = users.filter((item) => {
    const query = searchQuery.toLowerCase();

    return (
      item.email?.toLowerCase().includes(query) ||
      item.username?.toLowerCase().includes(query) ||
      item.full_name?.toLowerCase().includes(query)
    );
  });

  // Waits for auth bootstrap so route protection decisions are accurate.
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  // Redirects non-admin users to login for protected admin pages.
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }
  {/* Render skeleton loader while fetching data */}
  function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          {/* Header and Add Button Placeholder */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            {/* Search Bar Placeholder */}
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          {/* Table Placeholder */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-8"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-24"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-20"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-20 mx-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Users Management</h2>

            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add User
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by email, username..."
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

        <div className="flex-1 bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Username</th>
                <th className="px-6 py-4 text-left font-semibold">Full Name</th>
                <th className="px-6 py-4 text-center font-semibold">Role</th>
                <th className="px-6 py-4 text-left font-semibold">Created At</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 text-center">{item.id}</td>
                    <td className="px-6 py-4 text-gray-700">{item.email}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{item.username}</td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{item.full_name || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        item.roli === 'admin' ? 'bg-red-100 text-red-800' :
                        item.roli === 'organizator' ? 'bg-blue-100 text-blue-800' :
                        item.roli === 'gjyqtar' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.roli === 'admin' ? 'Admin' :
                         item.roli === 'organizator' ? 'Organizer' :
                         item.roli === 'gjyqtar' ? 'Referee' :
                         'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-600">
                    {searchQuery
                      ? `No users match "${searchQuery}". Try a different search.`
                      : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseCreateModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New User</h3>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    name="roli"
                    value={formData.roli}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="organizator">Organizer</option>
                    <option value="gjyqtar">Referee</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Create
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Update User</h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    name="roli"
                    value={formData.roli}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="organizator">Organizer</option>
                    <option value="gjyqtar">Referee</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Delete User</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedUser.username}</span>?
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>

                <button
                  onClick={handleCloseDeleteModal}
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
