import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

const initialFormData = {
  emertimi: "",
  adresa: "",
  qyteti: "",
  kapaciteti: "",
  lloji_siperfaqes: "",
  ndricimi: false,
  statusi: "Aktiv",
};

export default function Venues() {
  const { user } = useContext(AuthContext);

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const loadVenues = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/venues`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch venues");
        }

        const data = await response.json();
        setVenues(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadVenues();
  }, [user]);

  const resetForm = () => {
    setFormData(initialFormData);
  };

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
    setSelectedVenue(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedVenue(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedVenue(null);
    setShowDeleteModal(false);
  };

  const handleView = (id) => {
    const venue = venues.find((item) => item.id === id);
    setSelectedVenue(venue);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const venue = venues.find((item) => item.id === id);
    if (!venue) return;

    setSelectedVenue(venue);
    setFormData({
      emertimi: venue.emertimi || "",
      adresa: venue.adresa || "",
      qyteti: venue.qyteti || "",
      kapaciteti: venue.kapaciteti ?? "",
      lloji_siperfaqes: venue.lloji_siperfaqes || "",
      ndricimi: Boolean(venue.ndricimi),
      statusi: venue.statusi || "Aktiv",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const venue = venues.find((item) => item.id === id);
    setSelectedVenue(venue);
    setShowDeleteModal(true);
  };

  const buildPayload = () => ({
    ...formData,
    kapaciteti: formData.kapaciteti === "" ? null : Number(formData.kapaciteti),
    ndricimi: Boolean(formData.ndricimi),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/venues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create venue");
      }

      setVenues((prev) => [...prev, data]);
      handleCloseModal();
    } catch (err) {
      alert("Error creating venue: " + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVenue) return;

    try {
      const response = await fetch(`${API_BASE_URL}/venues/${selectedVenue.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update venue");
      }

      setVenues((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      handleCloseEditModal();
    } catch (err) {
      alert("Error updating venue: " + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVenue) return;

    try {
      const response = await fetch(`${API_BASE_URL}/venues/${selectedVenue.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete venue");
      }

      setVenues((prev) => prev.filter((item) => item.id !== selectedVenue.id));
      handleCloseDeleteModal();
    } catch (err) {
      alert("Error deleting venue: " + err.message);
    }
  };

  const filteredVenues = venues.filter((venue) => {
    const query = searchQuery.toLowerCase();

    return (
      venue.emertimi?.toLowerCase().includes(query) ||
      venue.adresa?.toLowerCase().includes(query) ||
      venue.qyteti?.toLowerCase().includes(query) ||
      venue.lloji_siperfaqes?.toLowerCase().includes(query) ||
      venue.statusi?.toLowerCase().includes(query)
    );
  });

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Venue Management</h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add New Venue
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search venue"
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
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Address</th>
                <th className="px-6 py-4 text-left font-semibold">City</th>
                <th className="px-6 py-4 text-left font-semibold">Capacity</th>
                <th className="px-6 py-4 text-left font-semibold">Surface</th>
                <th className="px-6 py-4 text-left font-semibold">Lighting</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVenues.length > 0 ? (
                filteredVenues.map((venue) => (
                  <tr key={venue.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.id}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.emertimi}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.adresa || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.qyteti}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.kapaciteti ?? "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {venue.lloji_siperfaqes || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {venue.ndricimi ? "Yes" : "No"}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{venue.statusi}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(venue.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(venue.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(venue.id)}
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
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-600">
                    {searchQuery
                      ? `No venue matches "${searchQuery}". Try a different search.`
                      : 'No venues found. Click "Add New Venue" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Venue</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <VenueForm formData={formData} onChange={handleInputChange} />
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showViewModal && selectedVenue && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Venue Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VenueDetail label="Venue Name" value={selectedVenue.emertimi} />
                <VenueDetail label="Address" value={selectedVenue.adresa || "-"} />
                <VenueDetail label="City" value={selectedVenue.qyteti} />
                <VenueDetail label="Capacity" value={selectedVenue.kapaciteti ?? "-"} />
                <VenueDetail
                  label="Surface Type"
                  value={selectedVenue.lloji_siperfaqes || "-"}
                />
                <VenueDetail
                  label="Lighting"
                  value={selectedVenue.ndricimi ? "Yes" : "No"}
                />
                <VenueDetail label="Status" value={selectedVenue.statusi} />
                <VenueDetail
                  label="Created At"
                  value={
                    selectedVenue.created_at
                      ? new Date(selectedVenue.created_at).toLocaleString()
                      : "-"
                  }
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedVenue && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Venue</h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <VenueForm formData={formData} onChange={handleInputChange} />
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

        {showDeleteModal && selectedVenue && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Venue?</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{selectedVenue.emertimi}</strong>? This
                action cannot be undone.
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

function VenueForm({ formData, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
        <input
          type="text"
          name="emertimi"
          value={formData.emertimi}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Venue name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
        <input
          type="text"
          name="qyteti"
          value={formData.qyteti}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="City"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        <input
          type="text"
          name="adresa"
          value={formData.adresa}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Street address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
        <input
          type="number"
          name="kapaciteti"
          value={formData.kapaciteti}
          onChange={onChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Surface Type</label>
        <select
          name="lloji_siperfaqes"
          value={formData.lloji_siperfaqes}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select surface</option>
          <option value="Bari Natyror">Bari Natyror</option>
          <option value="Bari Artificial">Bari Artificial</option>
          <option value="Parket">Parket</option>
          <option value="Beton">Beton</option>
          <option value="PVC">PVC</option>
          <option value="Tartan">Tartan</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
        <select
          name="statusi"
          value={formData.statusi}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        >
          <option value="Aktiv">Aktiv</option>
          <option value="Nën Rinovim">Nën Rinovim</option>
          <option value="Joaktiv">Joaktiv</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-8">
        <input
          id="ndricimi"
          type="checkbox"
          name="ndricimi"
          checked={Boolean(formData.ndricimi)}
          onChange={onChange}
          className="h-4 w-4"
        />
        <label htmlFor="ndricimi" className="text-sm font-medium text-gray-700">
          Lighting available
        </label>
      </div>
    </div>
  );
}

function VenueDetail({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{value}</p>
    </div>
  );
}
