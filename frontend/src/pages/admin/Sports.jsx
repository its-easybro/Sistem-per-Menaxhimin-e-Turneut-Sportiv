import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import api from '../../config/axiosInstance';
import { Alert } from '../../components/Alert';

const initialFormData = {
  emertimi: '',
  pershkrimi: '',
  numri_lojtareve: '',
  lloji: '',
};

const sportTypeOptions = ['Ekipor', 'Individual', 'I dyfishtë'];

export default function SportsManagment() {
  // Uses auth context for access control and initial auth-loading state.
  const { user, loading: authLoading } = useContext(AuthContext);

  // State variables
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  // Fetch sports data from backend
  useEffect(() => {
    const loadSports = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/sports`)

        const data = response.data;
        setSports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSports();
  }, [user]);

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
  };

  const buildSportPayload = () => ({
    // Trims text fields and normalizes numeric player count.
    emertimi: formData.emertimi.trim(),
    pershkrimi: formData.pershkrimi.trim(),
    numri_lojtareve:
      formData.numri_lojtareve === '' ? '' : Number(formData.numri_lojtareve),
    lloji: formData.lloji,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/sports`, buildSportPayload())

      const newSport = response.data;
      setSports((prev) => [...prev, newSport]);
      setFormData(initialFormData);
      setShowModal(false);
      setAlert({ type: 'success', message: 'Sport created successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error creating sport: ' + err.message });
    }
  };

  const handleCloseModal = () => {
    setFormData(initialFormData);
    setShowModal(false);
  };

  // Modal close handlers
  const handleCloseEditModal = () => {
    setFormData(initialFormData);
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
    setSelectedSport(sport);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const sport = sports.find(s => s.id === id);
    setSelectedSport(sport);
    setFormData({
      emertimi: sport.emertimi,
      pershkrimi: sport.pershkrimi,
      numri_lojtareve: sport.numri_lojtareve,
      lloji: sport.lloji
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const sport = sports.find(s => s.id === id);
    setSelectedSport(sport);
    setShowDeleteModal(true);
  };

  // API handlers
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSport) return;

    try {
      const response = await api.put(`/sports/${selectedSport.id}`, buildSportPayload())

      const updatedSport = response.data;
      setSports((prev) => prev.map((s) => (s.id === updatedSport.id ? updatedSport : s)));
      setFormData(initialFormData);
      setSelectedSport(null);
      setShowEditModal(false);
      setAlert({ type: 'success', message: 'Sport updated successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error updating sport: ' + err.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSport) return;

    try {
      await api.delete(`/sports/${selectedSport.id}`)

      setSports((prev) => prev.filter((s) => s.id !== selectedSport.id));
      setSelectedSport(null);
      setShowDeleteModal(false);
      setAlert({ type: 'success', message: 'Sport deleted successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting sport: ' + err.message });
    }
  };

  // Conditional loading / skeleton loading

  if (authLoading) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-gray-600">Checking access...</p>
    </div>
  );

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
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
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-8"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-24"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-12"></div></th>
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
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
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

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-red-600">Error: {error}</p>
    </div>
  );

  // Filters sports by name, description, or competition type.
  const filteredSports = sports.filter((sport) =>
    sport.emertimi?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
            <h2 className="text-3xl font-bold text-gray-800">Sports Management</h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Create New Sport
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by sport name..."
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

        {/* Sports table section */}
        <div className="flex-1 bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Sport Name</th>
                <th className="px-6 py-4 text-left font-semibold">Description</th>
                <th className="px-6 py-4 text-left font-semibold">Players</th>
                <th className="px-6 py-4 text-left font-semibold">Type</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSports.length > 0 ? (
                filteredSports.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 text-center">{s.id}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{s.emertimi}</td>
                    <td className="px-6 py-4 text-gray-600">{s.pershkrimi}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{s.numri_lojtareve}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{s.lloji}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(s.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(s.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
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
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-600">
                    {searchQuery ? `No sports match "${searchQuery}". Try a different search.` : 'No sports found. Click "Create New Sport" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        {/* Create sport modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Sport</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Football"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Pershkrimi)
                  </label>
                  <textarea
                    name="pershkrimi"
                    value={formData.pershkrimi}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter description"
                    rows="3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <input
                    type="number"
                    name="numri_lojtareve"
                    value={formData.numri_lojtareve}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 11"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type (Lloji)
                  </label>
                  <select
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select type</option>
                    {sportTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
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

        {/* View sport modal */}
        {showViewModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseViewModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Sport Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sport Name (Emertimi)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.emertimi}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Pershkrimi)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.pershkrimi}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.numri_lojtareve}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type (Lloji)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.lloji}</p>
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
          </div>
        )}

        {/* Edit sport modal */}
        {showEditModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Sport</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., Football"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Pershkrimi)
                  </label>
                  <textarea
                    name="pershkrimi"
                    value={formData.pershkrimi}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter description"
                    rows="3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <input
                    type="number"
                    name="numri_lojtareve"
                    value={formData.numri_lojtareve}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., 11"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type (Lloji)
                  </label>
                  <select
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="">Select type</option>
                    {sportTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
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

        {/* Delete confirmation modal */}
        {showDeleteModal && selectedSport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Sport?</h3>
              <p className="text-gray-700 mb-6">
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
