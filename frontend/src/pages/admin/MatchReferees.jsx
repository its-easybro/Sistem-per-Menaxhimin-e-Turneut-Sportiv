import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

export default function MatchReferees() {
  const { user } = useContext(AuthContext);

  // State Variables
  const [assignments, setAssignments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    ndeshja_id: "",
    gjyqtari_id: "",
    roli: "Kryegjyqtar",
  });

  // Referee roles
  const roles = [
    "Kryegjyqtar",
    "Asistent 1",
    "Asistent 2",
    "Gjyqtar i 4-të",
    "VAR",
  ];

  // Fetch data from backend
  useEffect(() => {
    const loadData = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const [assignmentsResponse, matchesResponse, refereesResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/match-referees`, { credentials: "include" }),
            fetch(`${API_BASE_URL}/matches`, { credentials: "include" }),
            fetch(`${API_BASE_URL}/referees`, { credentials: "include" }),
          ]);

        if (!assignmentsResponse.ok) {
          throw new Error("Failed to fetch referee assignments");
        }
        if (!matchesResponse.ok) {
          throw new Error("Failed to fetch matches");
        }
        if (!refereesResponse.ok) {
          throw new Error("Failed to fetch referees");
        }

        const assignmentsData = await assignmentsResponse.json();
        const matchesData = await matchesResponse.json();
        const refereesData = await refereesResponse.json();

        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        setMatches(Array.isArray(matchesData) ? matchesData : []);
        setReferees(Array.isArray(refereesData) ? refereesData : []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Create handler
  const handleCreate = () => {
    setFormData({
      ndeshja_id: "",
      gjyqtari_id: "",
      roli: "Kryegjyqtar",
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission (Create)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.ndeshja_id || !formData.gjyqtari_id || !formData.roli) {
        alert("Please fill in all required fields");
        return;
      }

      const dataToSend = {
        ndeshja_id: parseInt(formData.ndeshja_id),
        gjyqtari_id: parseInt(formData.gjyqtari_id),
        roli: formData.roli,
      };

      const response = await fetch(`${API_BASE_URL}/match-referees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create assignment");
      }

      const newAssignment = await response.json();
      setAssignments([...assignments, newAssignment]);
      setShowModal(false);
      setFormData({
        ndeshja_id: "",
        gjyqtari_id: "",
        roli: "Kryegjyqtar",
      });
      alert("Referee assignment created successfully!");
    } catch (err) {
      console.error("Error creating assignment:", err);
      alert("Error creating assignment: " + err.message);
    }
  };

  // Modal close handlers
  const handleCloseModal = () => {
    setFormData({
      ndeshja_id: "",
      gjyqtari_id: "",
      roli: "Kryegjyqtar",
    });
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData({
      ndeshja_id: "",
      gjyqtari_id: "",
      roli: "Kryegjyqtar",
    });
    setSelectedAssignment(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedAssignment(null);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedAssignment(null);
    setShowDeleteModal(false);
  };

  // Button handlers
  const handleView = (id) => {
    const assignment = assignments.find((a) => a.id === id);
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const assignment = assignments.find((a) => a.id === id);
    if (!assignment) return;
    setSelectedAssignment(assignment);
    setFormData({
      ndeshja_id: String(assignment.ndeshja_id),
      gjyqtari_id: String(assignment.gjyqtari_id),
      roli: assignment.roli,
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const assignment = assignments.find((a) => a.id === id);
    setSelectedAssignment(assignment);
    setShowDeleteModal(true);
  };

  // Edit handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      if (!formData.ndeshja_id || !formData.gjyqtari_id || !formData.roli) {
        alert("Please fill in all required fields");
        return;
      }

      const dataToSend = {
        ndeshja_id: parseInt(formData.ndeshja_id),
        gjyqtari_id: parseInt(formData.gjyqtari_id),
        roli: formData.roli,
      };

      const response = await fetch(
        `${API_BASE_URL}/match-referees/${selectedAssignment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(dataToSend),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update assignment");
      }

      const updatedAssignment = await response.json();
      setAssignments(
        assignments.map((a) =>
          a.id === updatedAssignment.id ? updatedAssignment : a,
        ),
      );
      setShowEditModal(false);
      setSelectedAssignment(null);
      alert("Assignment updated successfully!");
    } catch (err) {
      console.error("Error updating assignment:", err);
      alert("Error updating assignment: " + err.message);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!selectedAssignment) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/match-referees/${selectedAssignment.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete assignment");
      }

      setAssignments(assignments.filter((a) => a.id !== selectedAssignment.id));
      setSelectedAssignment(null);
      setShowDeleteModal(false);
      alert("Assignment deleted successfully!");
    } catch (err) {
      console.error("Error deleting assignment:", err);
      alert("Error deleting assignment: " + err.message);
    }
  };

  // Helper functions
  const getMatchInfo = (matchId) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return "N/A";
    const homeTeam = match.ekipi_shtepiak_id;
    const awayTeam = match.ekipi_mysafir_id;
    return `Match ${match.id}`;
  };

  const getRefereeInfo = (refereeId) => {
    const referee = referees.find((r) => r.id === refereeId);
    return referee ? `${referee.emri} ${referee.mbiemri}` : "N/A";
  };

  // Skeleton loading
  function renderSkeleton() {
    return (
      <div className="bg-gray-50 p-4">
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
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-4 bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, idx) => (
                  <tr key={idx} className="bg-white">
                    {[...Array(6)].map((_, i) => (
                      <td key={i} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
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

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  // Filter assignments based on search
  const filteredAssignments = assignments.filter(
    (a) =>
      getMatchInfo(a.ndeshja_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      getRefereeInfo(a.gjyqtari_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="bg-gray-50 p-4">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Match Referee Assignments
            </h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Assign Referee
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search by match or referee name"
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

        {/* Assignments table */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Match</th>
                <th className="px-4 py-3 text-left font-semibold">Referee</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-gray-100 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {a.id}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {getMatchInfo(a.ndeshja_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {getRefereeInfo(a.gjyqtari_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {a.roli}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {referees.find((r) => r.id === a.gjyqtari_id)
                        ?.kategoria || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(a.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(a.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
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
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    {searchQuery
                      ? `No assignments match "${searchQuery}". Try a different search.`
                      : 'No assignments found. Click "Assign Referee" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD ASSIGNMENT MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Assign Referee to Match
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match *
                    </label>
                    <select
                      name="ndeshja_id"
                      value={formData.ndeshja_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Match</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          Match {m.id} - {m.data_ndeshjes}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referee *
                    </label>
                    <select
                      name="gjyqtari_id"
                      value={formData.gjyqtari_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Referee</option>
                      {referees.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.emri} {r.mbiemri} ({r.kategoria})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      name="roli"
                      value={formData.roli}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Assign Referee
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

        {/* VIEW ASSIGNMENT MODAL */}
        {showViewModal && selectedAssignment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Assignment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getMatchInfo(selectedAssignment.ndeshja_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referee
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getRefereeInfo(selectedAssignment.gjyqtari_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedAssignment.roli}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {referees.find(
                      (r) => r.id === selectedAssignment.gjyqtari_id,
                    )?.kategoria || "N/A"}
                  </p>
                </div>
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

        {/* EDIT ASSIGNMENT MODAL */}
        {showEditModal && selectedAssignment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Edit Assignment
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match *
                    </label>
                    <select
                      name="ndeshja_id"
                      value={formData.ndeshja_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Match</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          Match {m.id} - {m.data_ndeshjes}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referee *
                    </label>
                    <select
                      name="gjyqtari_id"
                      value={formData.gjyqtari_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Referee</option>
                      {referees.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.emri} {r.mbiemri} ({r.kategoria})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      name="roli"
                      value={formData.roli}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
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

        {/* DELETE ASSIGNMENT MODAL */}
        {showDeleteModal && selectedAssignment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                Delete Assignment?
              </h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this referee assignment for{" "}
                <strong>{getMatchInfo(selectedAssignment.ndeshja_id)}</strong> (
                <strong>
                  {getRefereeInfo(selectedAssignment.gjyqtari_id)} -
                  {selectedAssignment.roli}
                </strong>
                )? This action cannot be undone.
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
