import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as yup from 'yup';
import AuthContext from '../../context/AuthContext';
import api from '../../config/axiosInstance';
import { Alert } from '../../components/Alert';
import { Trash2, Edit, Eye, Plus, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const initialFormData = {
  emertimi: '',
  pershkrimi: '',
  numri_lojtareve: '',
  lloji: '',
  kohezgjatja_default: '60',
  numri_periodave: '2',
  emri_periodave: 'Half',
};

const sportTypeOptions = ['Ekipor', 'Individual', 'I dyfishtë'];

const periodLabelOptions = ['Half', 'Quarter', 'Period', 'Set'];

const sportCreateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, 'Sport name must be at least 2 characters')
    .required('Sport name is required'),
  pershkrimi: yup
    .string()
    .nullable()
    .notRequired(),
  numri_lojtareve: yup
    .number()
    .positive('Number of players must be positive')
    .required('Number of players is required'),
  lloji: yup
    .string()
    .oneOf(sportTypeOptions, 'Invalid sport type')
    .required('Sport type is required'),
  kohezgjatja_default: yup
    .number()
    .positive('Default duration must be positive')
    .required('Default duration is required'),
  numri_periodave: yup
    .number()
    .positive('Number of periods must be positive')
    .required('Number of periods is required'),
  emri_periodave: yup
    .string()
    .oneOf(periodLabelOptions, 'Invalid period label')
    .required('Period label is required'),
});

const sportUpdateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, 'Sport name must be at least 2 characters'),
  pershkrimi: yup
    .string()
    .nullable()
    .notRequired(),
  numri_lojtareve: yup
    .number()
    .positive('Number of players must be positive')
    .nullable(),
  lloji: yup
    .string()
    .oneOf(sportTypeOptions, 'Invalid sport type'),
  kohezgjatja_default: yup
    .number()
    .positive('Default duration must be positive')
    .nullable(),
  numri_periodave: yup
    .number()
    .positive('Number of periods must be positive')
    .nullable(),
  emri_periodave: yup
    .string()
    .oneOf(periodLabelOptions, 'Invalid period label'),
});

function getSportTypeBadgeClasses(type) {
  if (type === sportTypeOptions[0]) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400";
  }

  if (type === sportTypeOptions[1]) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400";
  }

  return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300";
}

export default function SportsManagment() {
  // Uses auth context for access control and initial auth-loading state.
  const { user, loading: authLoading } = useContext(AuthContext);
  const isAdmin = user?.is_admin;

  // State variables
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    lloji: "",
  });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const loadSports = useCallback(async (pageNum, filtersObj) => {
    if (!isAdmin) {
      setLoading(false);
      setHasLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = { page: pageNum, limit: 10 };
      const search = filtersObj.search.trim();

      if (search) params.search = search;
      if (filtersObj.lloji) params.lloji = filtersObj.lloji;

      const response = await api.get(`/sports`, { params });
      const sportsPayload = response.data;
      const sportsData = Array.isArray(sportsPayload)
        ? sportsPayload
        : (sportsPayload?.data ?? []);
      const paginationData = Array.isArray(sportsPayload)
        ? null
        : (sportsPayload?.pagination ?? null);

      setSports(Array.isArray(sportsData) ? sportsData : []);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading) {
      loadSports(page, filters);
    }
  }, [authLoading, page, filters, loadSports]);

  const handleClearFilters = () => {
    setFilters({ search: "", lloji: "" });
    setPage(1);
  };

  const hasActiveFilters = filters.search.trim() !== "" || filters.lloji !== "";

  // Create sport handlers
  const handleCreate = () => {
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const buildSportPayload = () => ({
    // Trims text fields and normalizes numeric player count.
    emertimi: formData.emertimi.trim(),
    pershkrimi: formData.pershkrimi.trim(),
    numri_lojtareve:
      formData.numri_lojtareve === '' ? '' : Number(formData.numri_lojtareve),
    lloji: formData.lloji,
    kohezgjatja_default:
      formData.kohezgjatja_default === ''
        ? ''
        : Number(formData.kohezgjatja_default),
    numri_periodave:
      formData.numri_periodave === '' ? '' : Number(formData.numri_periodave),
    emri_periodave: formData.emri_periodave,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await sportCreateSchema.validate(formData, { abortEarly: false });
      await api.post(`/sports`, buildSportPayload())

      setFormData(initialFormData);
      setShowModal(false);
      setPage(1);
      await loadSports(1, filters);
      setAlert({ type: 'success', message: 'Sport created successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: 'error', message: 'Error creating sport: ' + err.message });
      }
    }
  };

  const handleCloseModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(false);
  };

  // Modal close handlers
  const handleCloseEditModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedSport(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedSport(null);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedSport(null);
    setShowDeleteModal(false);
  };

  // Button handlers
  const handleView = (id) => {
    const sport = sports.find(s => s.id === id);
    if (!sport) return;

    setSelectedSport(sport);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const sport = sports.find(s => s.id === id);
    if (!sport) return;

    setSelectedSport(sport);
    setFormData({
      emertimi: sport.emertimi || '',
      pershkrimi: sport.pershkrimi || '',
      numri_lojtareve: sport.numri_lojtareve ?? '',
      lloji: sport.lloji || '',
      kohezgjatja_default: sport.kohezgjatja_default ?? '60',
      numri_periodave: sport.numri_periodave ?? '2',
      emri_periodave: sport.emri_periodave || 'Half',
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const sport = sports.find(s => s.id === id);
    if (!sport) return;

    setSelectedSport(sport);
    setShowDeleteModal(true);
  };

  // API handlers
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSport) return;
    setFormErrors({});

    try {
      await sportUpdateSchema.validate(formData, { abortEarly: false });
      await api.put(`/sports/${selectedSport.id}`, buildSportPayload())

      setFormData(initialFormData);
      setSelectedSport(null);
      setShowEditModal(false);
      await loadSports(page, filters);
      setAlert({ type: 'success', message: 'Sport updated successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: 'error', message: 'Error updating sport: ' + err.message });
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSport) return;

    try {
      await api.delete(`/sports/${selectedSport.id}`)

      setSelectedSport(null);
      setShowDeleteModal(false);
      await loadSports(page > 1 ? page - 1 : 1, filters);
      if (page > 1) setPage(page - 1);
      setAlert({ type: 'success', message: 'Sport deleted successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting sport: ' + err.message });
    }
  };
  // Conditional loading / skeleton loading

  if (authLoading) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-gray-600 dark:text-slate-400">Checking access...</p>
    </div>
  );

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  const filteredSports = sports;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {loading && !hasLoaded ? (
        <div className="delay-skeleton mt-4">
          <TableSkeleton />
        </div>
      ) : (
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">
            Sports Management
          </h2>

          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0 max-w-2xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search by sport name..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-gray-400"
                />
              </div>

              <div className="relative min-w-[160px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="lloji"
                  value={filters.lloji}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Types</option>
                  {sportTypeOptions.map((option) => (
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

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Sport
            </button>
          </div>
        </div>

        {/* Sports table section */}
        <div className={`flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-md overflow-x-auto ${loading ? "opacity-60 pointer-events-none" : ""}`}>
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="bg-gray-800 dark:bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Sport Name</th>
                <th className="px-6 py-4 text-left font-semibold">Description</th>
                <th className="px-6 py-4 text-left font-semibold">Players</th>
                <th className="px-6 py-4 text-left font-semibold">Type</th>
                <th className="px-6 py-4 text-left font-semibold">Timing</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredSports.length > 0 ? (
                filteredSports.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-center">{s.id}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-100 font-semibold">{s.emertimi}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{s.pershkrimi || "-"}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300 font-semibold">{s.numri_lojtareve}</td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-semibold">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSportTypeBadgeClasses(s.lloji)}`}>
                        {s.lloji || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      <span className="font-semibold">
                        {s.kohezgjatja_default ?? 60} min
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">
                        {s.numri_periodave ?? 2} x {s.emri_periodave || "Half"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(s.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title='View'
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(s.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title='Edit'
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title='Delete'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-600 dark:text-slate-400">
                    {hasActiveFilters ? 'No sports match these filters.' : 'No sports found. Click "Create New Sport" to add one.'}
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
                      {" "}(Total <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> sports)
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

        {/* Create sport modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 dark:border dark:border-slate-700 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">Create New Sport</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.emertimi ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="e.g., Football"
                  />
                  {formErrors.emertimi && <p className='text-red-500 text-xs mt-1'>{formErrors.emertimi}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Description (Pershkrimi)
                  </label>
                  <textarea
                    name="pershkrimi"
                    value={formData.pershkrimi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.pershkrimi ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="Enter description"
                    rows="3"
                  />
                  {formErrors.pershkrimi && <p className='text-red-500 text-xs mt-1'>{formErrors.pershkrimi}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <input
                    type="number"
                    name="numri_lojtareve"
                    value={formData.numri_lojtareve}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.numri_lojtareve ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="e.g., 11"
                  />
                  {formErrors.numri_lojtareve && <p className='text-red-500 text-xs mt-1'>{formErrors.numri_lojtareve}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Type (Lloji)
                  </label>
                  <select
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.lloji ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                  >
                    <option value="">Select type</option>
                    {sportTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formErrors.lloji && <p className='text-red-500 text-xs mt-1'>{formErrors.lloji}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="kohezgjatja_default"
                      value={formData.kohezgjatja_default}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.kohezgjatja_default ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                      placeholder="90"
                    />
                    {formErrors.kohezgjatja_default && <p className='text-red-500 text-xs mt-1'>{formErrors.kohezgjatja_default}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Periods
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="numri_periodave"
                      value={formData.numri_periodave}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.numri_periodave ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                      placeholder="2"
                    />
                    {formErrors.numri_periodave && <p className='text-red-500 text-xs mt-1'>{formErrors.numri_periodave}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Period Label
                    </label>
                    <select
                      name="emri_periodave"
                      value={formData.emri_periodave}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.emri_periodave ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    >
                      {periodLabelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {formErrors.emri_periodave && <p className='text-red-500 text-xs mt-1'>{formErrors.emri_periodave}</p>}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-green-500 py-2 font-semibold text-white transition duration-200 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View sport modal */}
        {showViewModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleCloseViewModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 dark:border dark:border-slate-700 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">Sport Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Sport Name (Emertimi)
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">{selectedSport.emertimi}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Description (Pershkrimi)
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">{selectedSport.pershkrimi}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">{selectedSport.numri_lojtareve}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Type (Lloji)
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">{selectedSport.lloji}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Match Timing
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedSport.kohezgjatja_default ?? 60} min /{" "}
                    {selectedSport.numri_periodave ?? 2} x{" "}
                    {selectedSport.emri_periodave || "Half"}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseViewModal}
                    className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit sport modal */}
        {showEditModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 dark:border dark:border-slate-700 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">Edit Sport</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.emertimi ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="e.g., Football"
                  />
                  {formErrors.emertimi && <p className='text-red-500 text-xs mt-1'>{formErrors.emertimi}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Description (Pershkrimi)
                  </label>
                  <textarea
                    name="pershkrimi"
                    value={formData.pershkrimi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.pershkrimi ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="Enter description"
                    rows="3"
                  />
                  {formErrors.pershkrimi && <p className='text-red-500 text-xs mt-1'>{formErrors.pershkrimi}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <input
                    type="number"
                    name="numri_lojtareve"
                    value={formData.numri_lojtareve}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.numri_lojtareve ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    placeholder="e.g., 11"
                  />
                  {formErrors.numri_lojtareve && <p className='text-red-500 text-xs mt-1'>{formErrors.numri_lojtareve}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Type (Lloji)
                  </label>
                  <select
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.lloji ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                  >
                    <option value="">Select type</option>
                    {sportTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formErrors.lloji && <p className='text-red-500 text-xs mt-1'>{formErrors.lloji}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="kohezgjatja_default"
                      value={formData.kohezgjatja_default}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.kohezgjatja_default ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                      placeholder="90"
                    />
                    {formErrors.kohezgjatja_default && <p className='text-red-500 text-xs mt-1'>{formErrors.kohezgjatja_default}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Periods
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="numri_periodave"
                      value={formData.numri_periodave}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.numri_periodave ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                      placeholder="2"
                    />
                    {formErrors.numri_periodave && <p className='text-red-500 text-xs mt-1'>{formErrors.numri_periodave}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Period Label
                    </label>
                    <select
                      name="emri_periodave"
                      value={formData.emri_periodave}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-slate-700 dark:text-slate-200 ${formErrors.emri_periodave ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'}`}
                    >
                      {periodLabelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {formErrors.emri_periodave && <p className='text-red-500 text-xs mt-1'>{formErrors.emri_periodave}</p>}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-yellow-500 py-2 font-semibold text-white transition duration-200 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 dark:border dark:border-slate-700 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-4">Delete Sport</h3>
              <p className="text-gray-700 dark:text-slate-300 mb-6">
                Are you sure you want to delete <strong>{selectedSport.emertimi}</strong>? This action cannot be undone.
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
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
