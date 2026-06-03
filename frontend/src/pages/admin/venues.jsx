import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Edit, Trash2, Eye, Plus, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

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
  const [filters, setFilters] = useState({
    search: "",
    qyteti: "",
    statusi: "",
  });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const loadVenues = useCallback(async (pageNum, filtersObj) => {
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: 5,
        ...(filtersObj.search && { search: filtersObj.search }),
        ...(filtersObj.qyteti && { qyteti: filtersObj.qyteti }),
        ...(filtersObj.statusi && { statusi: filtersObj.statusi }),
      };
      const response = await api.get(`/venues`, { params });
      const venuePayload = response.data;
      const venuesData = Array.isArray(venuePayload)
        ? venuePayload
        : venuePayload?.data ?? [];
      const paginationData = Array.isArray(venuePayload)
        ? null
        : venuePayload?.pagination ?? null;

      setVenues(Array.isArray(venuesData) ? venuesData : []);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.is_admin]);

  useEffect(() => {
    loadVenues(page, filters);
  }, [page, filters, loadVenues]);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilters({
      search: "",
      qyteti: "",
      statusi: "",
    });
  };

  const hasActiveFilters = filters.search !== "" || filters.qyteti !== "" || filters.statusi !== "";

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
      await api.post(`/venues`, buildPayload())

      handleCloseModal();
      setPage(1);
      await loadVenues(1, filters);
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
      await api.put(`/venues/${selectedVenue.id}`, buildPayload())

      handleCloseEditModal();
      await loadVenues(page, filters);
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

      handleCloseDeleteModal();
      await loadVenues(page > 1 ? page - 1 : 1, filters);
      if (page > 1) setPage(page - 1);
      setAlert({ type: "success", message: "Venue deleted successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Error deleting venue: " + err.message });
    }
  };

  // Get unique cities from venues
  const uniqueCities = [...new Set(venues.map(v => v.qyteti).filter(Boolean))].sort();

  // Filters venue list by key searchable fields from the search box.
  // Note: Filtering is done on the backend, so venues array is already filtered
  const filteredVenues = venues;

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
      <div className="w-full mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-5">Venue Management</h2>
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Venue, Address, City, Surface or Status"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98] shrink-0"
              >
                <Plus size={18} />
               Add New Venue
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-slate-800/60 pt-3 mt-1">
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="qyteti"
                  value={filters.qyteti}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="statusi"
                  value={filters.statusi}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto"
              >
                <X size={16} />
                Clear Filters
              </button>
              )}
            </div>
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

        {pagination && (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="relative ml-3 inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> from{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalPages}</span>
                  {pagination.total && (
                    <>
                      {" "}(Total <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> venues)
                    </>
                  )}
                </p>
              </div>

              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, index) => {
                    const pageNum = index + 1;
                    const isActive = pageNum === page;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center justify-center min-w-[36px] h-[36px] rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

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
