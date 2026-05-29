import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Edit, Trash2, Eye } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

const initialFormData = {
  emertimi: "",
  adresa: "",
  qyteti: "",
  kapaciteti: "",
  lloji_siperfaqes: "",
  ndricimi: false,
  statusi: "Aktiv",
};

const surfaceTypeOptions = ["Bari Natyror", "Bari Artificial", "Parket", "Beton", "PVC", "Tartan"];
const statusOptions = ["Aktiv", "Nën Rinovim", "Joaktiv"];

const venueCreateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Venue name must be at least 2 characters")
    .required("Venue name is required"),
  qyteti: yup
    .string()
    .min(2, "City must be at least 2 characters")
    .required("City is required"),
  adresa: yup
    .string()
    .min(3, "Address must be at least 3 characters"),
  kapaciteti: yup
    .number()
    .min(0, "Capacity must be zero or higher")
    .nullable(),
  lloji_siperfaqes: yup
    .string()
    .oneOf(surfaceTypeOptions, "Invalid surface type")
    .required("Surface type is required"),
  statusi: yup
    .string()
    .oneOf(statusOptions, "Invalid status")
    .required("Status is required"),
  ndricimi: yup.boolean(),
});

const venueUpdateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Venue name must be at least 2 characters"),
  qyteti: yup
    .string()
    .min(2, "City must be at least 2 characters"),
  adresa: yup
    .string()
    .min(3, "Address must be at least 3 characters"),
  kapaciteti: yup
    .number()
    .min(0, "Capacity must be zero or higher")
    .nullable(),
  lloji_siperfaqes: yup
    .string()
    .oneOf(surfaceTypeOptions, "Invalid surface type"),
  statusi: yup
    .string()
    .oneOf(statusOptions, "Invalid status"),
  ndricimi: yup.boolean(),
});

export default function Venues() {
  // Venue CRUD page protected by admin authentication context.
  const { user } = useContext(AuthContext);

  // Stores venue rows, modal state, selected item, and active form data.
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
  const [alert, setAlert] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  // Loads venues when admin access is confirmed.
  useEffect(() => {
    const loadVenues = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/venues`)

        const data = response.data;
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

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCloseModal = () => {
    resetForm();
    setFormErrors({});
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedVenue(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setFormErrors({});
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
    // Normalizes optional numeric/boolean fields before API submission.
    ...formData,
    kapaciteti: formData.kapaciteti === "" ? null : Number(formData.kapaciteti),
    ndricimi: Boolean(formData.ndricimi),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await venueCreateSchema.validate(formData, { abortEarly: false });
      const response = await api.post(`/venues`, buildPayload())

      const data = response.data;

      setVenues((prev) => [...prev, data]);
      handleCloseModal();
      setAlert({ type: "success", message: "Venue created successfully!" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: "error", message: "Error creating venue: " + err.message });
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVenue) return;
    setFormErrors({});

    try {
      await venueUpdateSchema.validate(formData, { abortEarly: false });
      const response = await api.put(`/venues/${selectedVenue.id}`, buildPayload())

      const data = response.data;

      setVenues((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      handleCloseEditModal();
      setAlert({ type: "success", message: "Venue updated successfully!" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: "error", message: "Error updating venue: " + err.message });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVenue) return;

    try {
      await api.delete(`/venues/${selectedVenue.id}`)

      setVenues((prev) => prev.filter((item) => item.id !== selectedVenue.id));
      handleCloseDeleteModal();
      setAlert({ type: "success", message: "Venue deleted successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Error deleting venue: " + err.message });
    }
  };

  // Filters venue list by key searchable fields from the search box.
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


  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4">
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
            <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Venue Management</h2>
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            <svg
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 dark:text-slate-500"
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

        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-gray-800 dark:bg-slate-700 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
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
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredVenues.length > 0 ? (
                filteredVenues.map((venue) => (
                  <tr key={venue.id} className="hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-center">{venue.id}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">{venue.emertimi}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">{venue.adresa || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">{venue.qyteti }</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">{venue.kapaciteti ?? "-"}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">
                      {venue.lloji_siperfaqes || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-300">
                      {venue.ndricimi ? "Yes" : "No"}
                    </td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">{venue.statusi}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(venue.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(venue.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(venue.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-600 dark:text-slate-400">
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Add New Venue</h3>
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Venue Details</h3>
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
              <div className="flex gap-4 pt-5">
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Edit Venue</h3>
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Delete Venue?</h3>
              <p className="text-gray-700 dark:text-slate-300 mb-6">
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
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Venue Name *</label>
        <input
          type="text"
          name="emertimi"
          value={formData.emertimi}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Venue name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">City *</label>
        <input
          type="text"
          name="qyteti"
          value={formData.qyteti}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="City"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Address *</label>
        <input
          type="text"
          name="adresa"
          value={formData.adresa}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Street address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Capacity *</label>
        <input
          type="number"
          name="kapaciteti"
          value={formData.kapaciteti}
          onChange={onChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Surface Type *</label>
        <select
          name="lloji_siperfaqes"
          value={formData.lloji_siperfaqes}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
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
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Status *</label>
        <select
          name="statusi"
          value={formData.statusi}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          required
        >
          <option value="Aktiv">Aktiv</option>
          <option value="Nën Rinovim">Nën Rinovim</option>
          <option value="Joaktiv">Joaktiv</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-3">
        <input
          id="ndricimi"
          type="checkbox"
          name="ndricimi"
          checked={Boolean(formData.ndricimi)}
          onChange={onChange}
          className="h-4 w-4 dark:bg-slate-700 dark:border-slate-600"
        />
        <label htmlFor="ndricimi" className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Lighting available
        </label>
      </div>
    </div>
  );
}

function VenueDetail({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">{value}</p>
    </div>
  );
}
