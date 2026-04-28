import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

const initialFormData = {
  emri: "",
  mbiemri: "",
  email: "",
  telefoni: "",
  nr_licences: "",
  kategoria: "",
  pervoja_vitesh: "",
};

export default function Referees() {
  const { user } = useContext(AuthContext);

  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [users, setUsers] = useState([]);
  const [promoteData, setPromoteData] = useState({
    user_id: "",
    telefoni: "",
    nr_licences: "",
    kategoria: "",
    pervoja_vitesh: "",
  });

  useEffect(() => {
    const loadReferees = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/referees`);
        const normalizedReferees = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];
        setReferees(normalizedReferees);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadReferees();
  }, [user]);

  const resetForm = () => setFormData(initialFormData);

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedReferee(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedReferee(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedReferee(null);
    setShowDeleteModal(false);
  };

  const handleView = (id) => {
    const referee = referees.find((item) => item.id === id);
    setSelectedReferee(referee);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const referee = referees.find((item) => item.id === id);
    if (!referee) return;
    setSelectedReferee(referee);
    setFormData({
      emri: referee.emri || "",
      mbiemri: referee.mbiemri || "",
      email: referee.email || "",
      telefoni: referee.telefoni || "",
      nr_licences: referee.nr_licences || "",
      kategoria: referee.kategoria || "",
      pervoja_vitesh: referee.pervoja_vitesh ?? "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const referee = referees.find((item) => item.id === id);
    setSelectedReferee(referee);
    setShowDeleteModal(true);
  };

  const buildPayload = () => ({
    ...formData,
    pervoja_vitesh: formData.pervoja_vitesh === "" ? null : Number(formData.pervoja_vitesh),
    telefoni: formData.telefoni?.trim() === "" ? null : formData.telefoni.trim(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/referees`, buildPayload());
      setReferees((prev) => [...prev, response.data]);
      handleCloseModal();
      setAlert({ type: "success", message: "Referee created successfully" });
    } catch (err) {
      setAlert({ type: "error", message: "Failed to create referee: " + err.message });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReferee) return;
    try {
      const response = await api.put(`/referees/${selectedReferee.id}`, buildPayload());
      setReferees((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
      handleCloseEditModal();
      setAlert({ type: "success", message: "Referee updated successfully" });
    } catch (err) {
      setAlert({ type: "error", message: "Failed to update referee: " + err.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReferee) return;
    try {
      await api.delete(`/referees/${selectedReferee.id}`);
      setReferees((prev) => prev.filter((item) => item.id !== selectedReferee.id));
      handleCloseDeleteModal();
      setAlert({ type: "success", message: "Referee deleted successfully" });
    } catch (err) {
      setAlert({ type: "error", message: "Failed to delete referee: " + err.message });
    }
  };

  const handleOpenPromote = async () => {
  try {
    const res = await api.get("/users");
    const allUsers = Array.isArray(res.data) ? res.data : res.data?.data ?? [];

    // Merre referee ekzistues për të hequr ata që janë promovuar tashmë
    const refRes = await api.get("/referees");
    const existingUserIds = new Set(
      (Array.isArray(refRes.data) ? refRes.data : [])
        .map(r => r.user_id)
        .filter(Boolean)
    );

    // Shfaq të gjithë userat që nuk janë promovuar ende
    const available = allUsers.filter(
  (u) => u.roli === "user" && !existingUserIds.has(u.id)
);


    setUsers(available);
    setShowPromoteModal(true);
  } catch (err) {
    setAlert({ type: "error", message: "Failed to load users" });
  }
};
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/referees/promote", {
        ...promoteData,
        user_id: Number(promoteData.user_id),
        pervoja_vitesh: promoteData.pervoja_vitesh === "" ? null : Number(promoteData.pervoja_vitesh),
      });
      setReferees((prev) => [...prev, response.data]);
      setShowPromoteModal(false);
      setPromoteData({ user_id: "", telefoni: "", nr_licences: "", kategoria: "", pervoja_vitesh: "" });
      setAlert({ type: "success", message: "User promoted to referee successfully" });
    } catch (err) {
      setAlert({ type: "error", message: err.response?.data?.error || "Failed to promote user" });
    }
  };

  const filteredReferees = (Array.isArray(referees) ? referees : []).filter((referee) => {
    const query = searchQuery.toLowerCase();
    return (
      referee.emri?.toLowerCase().includes(query) ||
      referee.mbiemri?.toLowerCase().includes(query) ||
      referee.email?.toLowerCase().includes(query) ||
      referee.kategoria?.toLowerCase().includes(query)
    );
  });

  if (!user || !user.is_admin) {
    return <Navigate to="/login" />;
  }

  function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  {Array.from({ length: 9 }).map((_, index) => (
                    <th key={index} className="px-6 py-4">
                      <div className="h-4 bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full max-w-[100px]"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return renderSkeleton();

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
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Referees Management</h2>
            <div className="flex gap-3">
              <button
                onClick={handleOpenPromote}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200"
              >
                + Promote User to Referee
              </button>
              <button
                onClick={handleCreate}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200"
              >
                + Add New Referee
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search referee"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400"
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Surname</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Phone Number</th>
                <th className="px-6 py-4 text-left font-semibold">Nr of License</th>
                <th className="px-6 py-4 text-left font-semibold">Category</th>
                <th className="px-6 py-4 text-center font-semibold">Years of experience</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReferees.length > 0 ? (
                filteredReferees.map((referee) => (
                  <tr key={referee.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 text-center">{referee.id}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.emri}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.mbiemri || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">{referee.email || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.telefoni || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.nr_licences || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">{referee.kategoria || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 text-center">{referee.pervoja_vitesh || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleView(referee.id)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200">View</button>
                        <button onClick={() => handleEdit(referee.id)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200">Edit</button>
                        <button onClick={() => handleDelete(referee.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-600">
                    {searchQuery
                      ? `No referee matches "${searchQuery}". Try a different search.`
                      : 'No referees found. Click "Add New Referee" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add New Referee Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseModal}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Referee</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <RefereeForm formData={formData} onChange={handleInputChange} />
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200">Add</button>
                  <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedReferee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseViewModal}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Referee Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RefereeDetail label="Full Name" value={`${selectedReferee.emri} ${selectedReferee.mbiemri}`} />
                <RefereeDetail label="Email" value={selectedReferee.email || "-"} />
                <RefereeDetail label="Phone Number" value={selectedReferee.telefoni || "-"} />
                <RefereeDetail label="License Number" value={selectedReferee.nr_licences || "-"} />
                <RefereeDetail label="Category" value={selectedReferee.kategoria || "-"} />
                <RefereeDetail label="Created At" value={selectedReferee.created_at ? new Date(selectedReferee.created_at).toLocaleString() : "-"} />
              </div>
              <div className="flex gap-4 pt-5">
                <button type="button" onClick={handleCloseViewModal} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedReferee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseEditModal}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Referee</h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <RefereeForm formData={formData} onChange={handleInputChange} />
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200">Save Changes</button>
                  <button type="button" onClick={handleCloseEditModal} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedReferee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseDeleteModal}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Referee?</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{selectedReferee.emri}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button onClick={handleDeleteConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200">Delete</button>
                <button onClick={handleCloseDeleteModal} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Promote User to Referee Modal */}
        {showPromoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPromoteModal(false)}>
            <div className="w-full max-w-lg bg-white rounded-lg p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Promote User to Referee</h3>
              <form onSubmit={handlePromoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select User *</label>
                  <select
                    value={promoteData.user_id}
                    onChange={(e) => setPromoteData((p) => ({ ...p, user_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Select a user --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.emri} {u.mbiemri} ({u.email})
                      </option>
                    ))}
                  </select>
                  {users.length === 0 && (
                    <p className="text-sm text-gray-400 mt-1">No users with role "gjyqtar" found.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    placeholder="+383 12 345 678"
                    value={promoteData.telefoni}
                    onChange={(e) => setPromoteData((p) => ({ ...p, telefoni: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Nr</label>
                  <input
                    type="text"
                    value={promoteData.nr_licences}
                    onChange={(e) => setPromoteData((p) => ({ ...p, nr_licences: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={promoteData.kategoria}
                    onChange={(e) => setPromoteData((p) => ({ ...p, kategoria: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="FIFA">FIFA</option>
                    <option value="UEFA">UEFA</option>
                    <option value="Kombëtar">Kombëtar</option>
                    <option value="Rajonal">Rajonal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={promoteData.pervoja_vitesh}
                    onChange={(e) => setPromoteData((p) => ({ ...p, pervoja_vitesh: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition duration-200">Promote</button>
                  <button type="button" onClick={() => setShowPromoteModal(false)} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RefereeForm({ formData, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Referee Name *</label>
        <input type="text" name="emri" value={formData.emri} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Referee name" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Surname *</label>
        <input type="text" name="mbiemri" value={formData.mbiemri} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Surname" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
        <input type="text" name="email" value={formData.email} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Email" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <input type="tel" name="telefoni" value={formData.telefoni} onChange={onChange}
          pattern="^\+383 \d{2} \d{3} \d{3}$"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="+383 12 345 678" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
        <select name="kategoria" value={formData.kategoria} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Select category</option>
          <option value="FIFA">FIFA</option>
          <option value="UEFA">UEFA</option>
          <option value="Kombëtar">Kombëtar</option>
          <option value="Rajonal">Rajonal</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nr of License *</label>
        <input type="text" name="nr_licences" value={formData.nr_licences} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
        <input type="number" name="pervoja_vitesh" value={formData.pervoja_vitesh} onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required />
      </div>
    </div>
  );
}

function RefereeDetail({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{value}</p>
    </div>
  );
}
