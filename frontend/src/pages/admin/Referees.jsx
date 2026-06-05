import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import {
  Edit,
  Trash2,
  Eye,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

// Initial form data structure for creating/editing referees, ensuring all fields are defined and can be easily reset.
const initialFormData = {
  emri: "",
  mbiemri: "",
  email: "",
  telefoni: "",
  nr_licences: "",
  kategoria: "",
  pervoja_vitesh: "",
};

const categoryOptions = ["FIFA", "UEFA", "Kombëtar", "Rajonal"];

// Validation schema for creating a referee, enforcing required fields and proper formats.
const refereeCreateSchema = yup.object().shape({
  emri: yup
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  mbiemri: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  email: yup
    .string()
    .trim()
    .email("Email must be valid")
    .required("Email is required"),
  telefoni: yup.string().trim(),
  nr_licences: yup.string().trim(),
  kategoria: yup.string().trim(),
  pervoja_vitesh: yup.number().nullable(),
});

const refereeUpdateSchema = yup.object().shape({
  emri: yup.string().trim().min(2, "First name must be at least 2 characters"),
  mbiemri: yup
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters"),
  email: yup.string().trim().email("Email must be valid"),
  telefoni: yup.string().trim(),
  nr_licences: yup.string().trim(),
  kategoria: yup.string().trim(),
  pervoja_vitesh: yup.number().nullable(),
});

function normalizeUserOption(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? user.emri ?? "",
    full_name:
      user.full_name ??
      ([user.emri, user.mbiemri].filter(Boolean).join(" ") || ""),
    roli: user.roli ?? "user",
  };
}

function getUserOptionLabel(user) {
  return user.full_name || user.username || user.email || `User #${user.id}`;
}

// Main component for managing referees, allowing admins to view, create, edit, delete, and promote users to referees, with search and filter capabilities.
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
  const [formErrors, setFormErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [promoteData, setPromoteData] = useState({
    user_id: "",
    telefoni: "",
    nr_licences: "",
    kategoria: "",
    pervoja_vitesh: "",
  });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    kategoria: "",
  });

  // Function to load referees from the backend API, with support for pagination and filtering based on search query and category.
  const loadReferees = useCallback(
    async (pageNum, filtersObj) => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const params = {
          page: pageNum,
          limit: 10,
          ...(filtersObj.search ? { search: filtersObj.search } : {}),
          ...(filtersObj.kategoria ? { kategoria: filtersObj.kategoria } : {}),
        };
        const response = await api.get(`/referees`, { params });
        const refereePayload = response.data;
        const refereesData = Array.isArray(refereePayload)
          ? refereePayload
          : (refereePayload?.data ?? []);
        const paginationData = Array.isArray(refereePayload)
          ? null
          : (refereePayload?.pagination ?? null);

        setReferees(Array.isArray(refereesData) ? refereesData : []);
        setPagination(paginationData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [user?.is_admin],
  );

  useEffect(() => {
    loadReferees(page, filters);
  }, [page, filters, loadReferees]);

  // Handle search query changes with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchQuery ? prev : { ...prev, search: searchQuery },
      );
      if (searchQuery !== filters.search) {
        // Already handled by the dependency on filters in loadVenues
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, filters.search]);

  // Handlers for form input changes, opening/closing modals, and performing CRUD operations on referees, as well as promoting users to referees.
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  // Clears all active filters and resets the search query, returning the referee list to its default unfiltered state.
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilters({
      search: "",
      kategoria: "",
    });
  };

  const hasActiveFilters = filters.search !== "" || filters.kategoria !== "";

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
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handles input changes for the promote user form, updating the promoteData state accordingly.
  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  // Closes the view modal and clears the selected referee state to reset the view.
  const handleCloseViewModal = () => {
    setSelectedReferee(null);
    setShowViewModal(false);
  };

  // Closes the edit modal, resets the form, and clears the selected referee state to prepare for the next edit operation.
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

  // Prepares the form for editing by populating it with the selected referee's data and opening the edit modal.
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

  // Builds the payload for creating or updating a referee by trimming string fields and converting empty strings to null where appropriate, ensuring the backend receives clean and consistent data.
  const buildPayload = () => ({
    ...formData,
    emri: formData.emri?.trim(),
    mbiemri: formData.mbiemri?.trim(),
    email: formData.email?.trim() === "" ? null : formData.email?.trim(),
    pervoja_vitesh:
      formData.pervoja_vitesh === "" ? null : Number(formData.pervoja_vitesh),
    telefoni:
      formData.telefoni?.trim() === "" ? null : formData.telefoni?.trim(),
    nr_licences:
      formData.nr_licences?.trim() === "" ? null : formData.nr_licences?.trim(),
    kategoria:
      formData.kategoria?.trim() === "" ? null : formData.kategoria?.trim(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await refereeCreateSchema.validate(formData, { abortEarly: false });
      await api.post(`/referees`, buildPayload());
      handleCloseModal();
      setPage(1);
      await loadReferees(1, filters);
      setAlert({ type: "success", message: "Referee created successfully" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message: "Failed to create referee: " + err.message,
        });
      }
    }
  };

  // Handles the submission of the edit form by validating the input, sending an update request to the backend, and refreshing the referee list upon success, while also managing form errors and displaying appropriate alerts based on the outcome.
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReferee) return;
    try {
      await refereeUpdateSchema.validate(formData, { abortEarly: false });
      await api.put(`/referees/${selectedReferee.id}`, buildPayload());
      handleCloseEditModal();
      await loadReferees(page, filters);
      setAlert({ type: "success", message: "Referee updated successfully" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message: "Failed to update referee: " + err.message,
        });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReferee) return;
    try {
      await api.delete(`/referees/${selectedReferee.id}`);
      handleCloseDeleteModal();
      await loadReferees(page > 1 ? page - 1 : 1, filters);
      if (page > 1) setPage(page - 1);
      setAlert({ type: "success", message: "Referee deleted successfully" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Failed to delete referee: " + err.message,
      });
    }
  };

  const handleOpenPromote = async () => {
    try {
      const res = await api.get("/referees/promotable-users");
      const allUsers = (
        Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      ).map(normalizeUserOption);

      setUsers(allUsers);
      setShowPromoteModal(true);
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load users" });
    }
  };
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/referees/promote", {
        ...promoteData,
        user_id: Number(promoteData.user_id),
        pervoja_vitesh:
          promoteData.pervoja_vitesh === ""
            ? null
            : Number(promoteData.pervoja_vitesh),
      });
      setShowPromoteModal(false);
      setPromoteData({
        user_id: "",
        telefoni: "",
        nr_licences: "",
        kategoria: "",
        pervoja_vitesh: "",
      });
      setPage(1);
      await loadReferees(1, filters);
      setAlert({
        type: "success",
        message: "User promoted to referee successfully",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.error || "Failed to promote user",
      });
    }
  };

  const filteredReferees = (Array.isArray(referees) ? referees : []).filter(
    (referee) => {
      const query = searchQuery.toLowerCase();
      return (
        referee.emri?.toLowerCase().includes(query) ||
        referee.mbiemri?.toLowerCase().includes(query) ||
        referee.email?.toLowerCase().includes(query) ||
        referee.kategoria?.toLowerCase().includes(query)
      );
    },
  );

  if (!user || !user.is_admin) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {loading ? (
        <div className="delay-skeleton mt-4">
          <TableSkeleton />
        </div>
      ) : (
        <div className="w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">
              Referees Management
            </h2>

            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0 max-w-2xl">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search
                      size={18}
                      className="text-gray-400 dark:text-gray-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Search referee..."
                    name="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-gray-400"
                  />
                </div>

                {/* Filter dropdown */}
                <div className="relative min-w-[160px]">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <SlidersHorizontal size={14} />
                  </div>
                  <select
                    name="kategoria"
                    value={filters.kategoria}
                    onChange={handleFilterChange}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                  >
                    <option value="">All Categories</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto sm:ml-0"
                >
                  Clear Filters
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleOpenPromote}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Promote User
                </button>
                <button
                  onClick={handleCreate}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Add Referee
                </button>
              </div>
            </div>
          </div>

          {/* Referees table section */}
          <div
            className={`flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-md overflow-x-auto ${loading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-800 dark:bg-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-center font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Surname</th>
                  <th className="px-6 py-4 text-left font-semibold">Email</th>
                  <th className="px-6 py-4 text-left font-semibold">Phone</th>
                  <th className="px-6 py-4 text-left font-semibold">License</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Category
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Experience
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {referees.length > 0 ? (
                  referees.map((referee) => (
                    <tr
                      key={referee.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-center font-medium">
                        {referee.id}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-slate-200 font-semibold">
                        {referee.emri}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                        {referee.mbiemri || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                        {referee.email || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                        {referee.telefoni || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                        {referee.nr_licences || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                          {referee.kategoria || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300 text-center">
                        {referee.pervoja_vitesh || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(referee.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition-colors duration-150"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(referee.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition-colors duration-150"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(referee.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition-colors duration-150"
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
                    <td
                      colSpan="9"
                      className="px-6 py-8 text-center text-gray-600 dark:text-slate-400"
                    >
                      {filters.search || filters.kategoria
                        ? "No referees found matching your filters."
                        : 'No referees found. Click "Add Referee" to add one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

              {/* Pagination Controls */}
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Page{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {page}
                    </span>{" "}
                    from{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {pagination.totalPages}
                    </span>
                    {pagination.total && (
                      <>
                        {" "}
                        (Total{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {pagination.total}
                        </span>{" "}
                        referees)
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <nav
                    className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1"
                    aria-label="Pagination"
                  >
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {Array.from(
                      { length: pagination.totalPages },
                      (_, index) => {
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
                      },
                    )}

                    {/* Next Page Button */}
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

          {/* Add New Referee Modal */}
          {showModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={handleCloseModal}
            >
              <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                  Add New Referee
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <RefereeForm
                    formData={formData}
                    onChange={handleInputChange}
                  />
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

          {/* View Modal */}
          {showViewModal && selectedReferee && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={handleCloseViewModal}
            >
              <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                  Referee Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RefereeDetail
                    label="Full Name"
                    value={`${selectedReferee.emri} ${selectedReferee.mbiemri}`}
                  />
                  <RefereeDetail
                    label="Email"
                    value={selectedReferee.email || "-"}
                  />
                  <RefereeDetail
                    label="Phone Number"
                    value={selectedReferee.telefoni || "-"}
                  />
                  <RefereeDetail
                    label="License Number"
                    value={selectedReferee.nr_licences || "-"}
                  />
                  <RefereeDetail
                    label="Category"
                    value={selectedReferee.kategoria || "-"}
                  />
                  <RefereeDetail
                    label="Created At"
                    value={
                      selectedReferee.created_at
                        ? new Date(selectedReferee.created_at).toLocaleString()
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

          {/* Edit Modal */}
          {showEditModal && selectedReferee && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={handleCloseEditModal}
            >
              <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                  Edit Referee
                </h3>
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  <RefereeForm
                    formData={formData}
                    onChange={handleInputChange}
                  />
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

          {/* Delete Modal */}
          {showDeleteModal && selectedReferee && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={handleCloseDeleteModal}
            >
              <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                  Delete Referee?
                </h3>
                <p className="text-gray-700 dark:text-slate-300 mb-6">
                  Are you sure you want to delete{" "}
                  <strong>{selectedReferee.emri}</strong>? This action cannot be
                  undone.
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

          {/* Promote User to Referee Modal */}
          {showPromoteModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowPromoteModal(false)}
            >
              <div
                className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                  Promote User to Referee
                </h3>
                <form onSubmit={handlePromoteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Select User *
                    </label>
                    <select
                      value={promoteData.user_id}
                      onChange={(e) =>
                        setPromoteData((p) => ({
                          ...p,
                          user_id: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-200"
                      required
                    >
                      <option value="">-- Select a user --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {getUserOptionLabel(u)} ({u.email})
                        </option>
                      ))}
                    </select>
                    {users.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                        No users available for promotion.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+383 12 345 678"
                      value={promoteData.telefoni}
                      onChange={(e) =>
                        setPromoteData((p) => ({
                          ...p,
                          telefoni: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      License Nr
                    </label>
                    <input
                      type="text"
                      value={promoteData.nr_licences}
                      onChange={(e) =>
                        setPromoteData((p) => ({
                          ...p,
                          nr_licences: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={promoteData.kategoria}
                      onChange={(e) =>
                        setPromoteData((p) => ({
                          ...p,
                          kategoria: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="">Select category</option>
                      <option value="FIFA">FIFA</option>
                      <option value="UEFA">UEFA</option>
                      <option value="Kombëtar">Kombëtar</option>
                      <option value="Rajonal">Rajonal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={promoteData.pervoja_vitesh}
                      onChange={(e) =>
                        setPromoteData((p) => ({
                          ...p,
                          pervoja_vitesh: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                    >
                      Promote
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPromoteModal(false)}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable form component for both creating and editing referees.
function RefereeForm({ formData, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Referee Name *
        </label>
        <input
          type="text"
          name="emri"
          value={formData.emri}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Referee name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Surname *
        </label>
        <input
          type="text"
          name="mbiemri"
          value={formData.mbiemri}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Surname"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Email *
        </label>
        <input
          type="text"
          name="email"
          value={formData.email}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Email"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          name="telefoni"
          value={formData.telefoni}
          onChange={onChange}
          pattern="^\+383 \d{2} \d{3} \d{3}$"
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          placeholder="+383 12 345 678"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Category *
        </label>
        <select
          name="kategoria"
          value={formData.kategoria}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
        >
          <option value="">Select category</option>
          <option value="FIFA">FIFA</option>
          <option value="UEFA">UEFA</option>
          <option value="Kombëtar">Kombëtar</option>
          <option value="Rajonal">Rajonal</option>
        </select>
      </div>
      <div>
        {/* Number of Licenses */}
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Nr of License *
        </label>
        <input
          type="text"
          name="nr_licences"
          value={formData.nr_licences}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Years of Experience *
        </label>
        <input
          type="number"
          name="pervoja_vitesh"
          value={formData.pervoja_vitesh}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
          required
        />
      </div>
    </div>
  );
}

// Component for displaying a single referee detail in the view modal.
function RefereeDetail({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
        {value}
      </p>
    </div>
  );
}
