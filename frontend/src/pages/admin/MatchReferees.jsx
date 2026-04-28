import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

const initialFormData = {
  ndeshja_id: "",
  gjyqtari_id: "",
  roli: "Kryegjyqtar",
};

const roles = [
  "Kryegjyqtar",
  "Asistent 1",
  "Asistent 2",
  "Gjyqtar i 4-të",
  "VAR",
];

function formatDate(value) {
  if (!value) return "N/A";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat("en-GB").format(date);
  } catch {
    return "Invalid date";
  }
}

function getRoleBadgeClasses(role) {
  if (role === "Kryegjyqtar") return "bg-blue-100 text-blue-700";
  if (role === "VAR") return "bg-purple-100 text-purple-700";
  if (role === "Gjyqtar i 4-të") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function getStatusBadgeClasses(status) {
  if (status === "Përfunduar") return "bg-green-100 text-green-700";
  if (status === "Live") return "bg-red-100 text-red-700";
  if (status === "Shtyrë") return "bg-yellow-100 text-yellow-700";
  if (status === "Anuluar") return "bg-gray-200 text-gray-700";
  return "bg-blue-100 text-blue-700";
}

function MatchRefereeFormFields({
  formData,
  matches,
  referees,
  getMatchLabel,
  onChange,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Match</span>
        <select
          name="ndeshja_id"
          value={formData.ndeshja_id}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select match</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {getMatchLabel(match.id)} - {formatDate(match.data_ndeshjes)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Referee</span>
        <select
          name="gjyqtari_id"
          value={formData.gjyqtari_id}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select referee</option>
          {referees.map((referee) => (
            <option key={referee.id} value={referee.id}>
              {referee.emri} {referee.mbiemri} ({referee.kategoria || "N/A"})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Role</span>
        <select
          name="roli"
          value={formData.roli}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function MatchReferees() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.is_admin;
  const isReferee = user?.is_referee;
  const canAccessPage = isAdmin || isReferee;

  const [assignments, setAssignments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const loadData = async () => {
      if (!canAccessPage) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          assignmentsResponse,
          matchesResponse,
          refereesResponse,
          teamsResponse,
        ] =
          await Promise.all([
            api.get("/match-referees"),
            api.get("/matches"),
            api.get("/referees"),
            api.get("/teams"),
          ]);

        setAssignments(
          Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : [],
        );
        setMatches(Array.isArray(matchesResponse.data) ? matchesResponse.data : []);
        setReferees(
          Array.isArray(refereesResponse.data) ? refereesResponse.data : [],
        );
        setTeams(Array.isArray(teamsResponse.data) ? teamsResponse.data : []);
      } catch (err) {
        setError(err?.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canAccessPage]);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const getMatchById = (matchId) =>
    matches.find((item) => String(item.id) === String(matchId));

  const getRefereeById = (refereeId) =>
    referees.find((item) => String(item.id) === String(refereeId));

  const getTeamName = (teamId) => {
    const team = teams.find((item) => String(item.id) === String(teamId));
    return team?.emertimi || `Team #${teamId}`;
  };

  const getMatchLabel = (matchId) => {
    const match = getMatchById(matchId);

    if (!match) {
      return `Match #${matchId}`;
    }

    return `${getTeamName(match.ekipi_shtepiak_id)} vs ${getTeamName(match.ekipi_mysafir_id)}`;
  };

  const getRefereeLabel = (refereeId) => {
    const referee = getRefereeById(refereeId);
    return referee ? `${referee.emri} ${referee.mbiemri}` : "N/A";
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleView = (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setFormData({
      ndeshja_id: String(assignment.ndeshja_id),
      gjyqtari_id: String(assignment.gjyqtari_id),
      roli: assignment.roli || "Kryegjyqtar",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedAssignment(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedAssignment(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedAssignment(null);
    setShowDeleteModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    ndeshja_id: Number(formData.ndeshja_id),
    gjyqtari_id: Number(formData.gjyqtari_id),
    roli: formData.roli,
  });

  const validateForm = () => {
    if (!formData.ndeshja_id || !formData.gjyqtari_id || !formData.roli) {
      return "Please fill in all required fields.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const validationError = validateForm();
      if (validationError) {
        setAlert({ type: "error", message: validationError });
        return;
      }

      const response = await api.post("/match-referees", buildPayload());
      const data = response.data || {};

      setAssignments((prev) => [...prev, data]);
      handleCloseModal();
      setAlert({ type: "success", message: "Assignment created successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error creating assignment: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAssignment) return;

    try {
      const validationError = validateForm();
      if (validationError) {
        setAlert({ type: "error", message: validationError });
        return;
      }

      const response = await api.put(
        `/match-referees/${selectedAssignment.id}`,
        buildPayload(),
      );
      const data = response.data || {};

      setAssignments((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );

      handleCloseEditModal();
      setAlert({ type: "success", message: "Assignment updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating assignment: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAssignment) return;

    try {
      await api.delete(`/match-referees/${selectedAssignment.id}`);

      setAssignments((prev) =>
        prev.filter((item) => item.id !== selectedAssignment.id),
      );

      handleCloseDeleteModal();
      setAlert({ type: "success", message: "Assignment deleted successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error deleting assignment: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const filteredAssignments = assignments.filter((item) => {
    const query = searchQuery.toLowerCase();
    const match = getMatchById(item.ndeshja_id);
    const referee = getRefereeById(item.gjyqtari_id);

    return (
      String(item.id).includes(query) ||
      item.roli?.toLowerCase().includes(query) ||
      getMatchLabel(item.ndeshja_id).toLowerCase().includes(query) ||
      referee?.emri?.toLowerCase().includes(query) ||
      referee?.mbiemri?.toLowerCase().includes(query) ||
      referee?.kategoria?.toLowerCase().includes(query) ||
      match?.statusi?.toLowerCase().includes(query) ||
      formatDate(match?.data_ndeshjes).toLowerCase().includes(query)
    );
  });

  if (!user || !canAccessPage) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm">
          Loading match assignments...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-red-600 shadow-sm">
          Error loading match assignments: {error}
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

      <div className="mx-auto w-full space-y-6">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {isAdmin ? "Match Referee Assignments" : "My Matches"}
            </h2>

            {isAdmin && (
              <button
                onClick={handleCreate}
                className="rounded-lg bg-green-500 px-6 py-2 font-semibold text-white shadow-md transition duration-200 ease-in-out hover:bg-green-600"
              >
                + Assign Referee
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAdmin
                  ? "Search by match, referee, role, date, or status"
                  : "Search by match, role, date, or status"
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder:text-transparent outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:placeholder:text-gray-400"
            />
            <svg
              className="absolute right-3 top-3.5 h-5 w-5 text-gray-400"
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

        <div className="flex overflow-x-auto rounded-lg bg-white shadow-md">
          {filteredAssignments.length === 0 ? (
            <div className="w-full px-6 py-12 text-center text-gray-600">
              {searchQuery
                ? `No assignments match "${searchQuery}". Try a different search.`
                : isAdmin
                  ? 'No assignments found. Click "Assign Referee" to add a new one.'
                  : "No matches assigned to you yet."}
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Match</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left font-semibold">Referee</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-center font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => {
                  const match = getMatchById(assignment.ndeshja_id);
                  const referee = getRefereeById(assignment.gjyqtari_id);

                  return (
                    <tr
                      key={assignment.id}
                      className="transition-colors duration-150 hover:bg-gray-100"
                    >
                      <td className="px-4 py-3 text-center text-gray-500">
                        {assignment.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {getMatchLabel(assignment.ndeshja_id)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {match?.ora_fillimit || "No start time"}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {getRefereeLabel(assignment.gjyqtari_id)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClasses(assignment.roli)}`}
                        >
                          {assignment.roli || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {formatDate(match?.data_ndeshjes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(match?.statusi)}`}
                        >
                          {match?.statusi || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {referee?.kategoria || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(assignment.id)}
                            className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white transition duration-200 hover:bg-blue-600"
                          >
                            View
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleEdit(assignment.id)}
                              className="rounded bg-yellow-500 px-3 py-1 text-sm font-medium text-white transition duration-200 hover:bg-yellow-600"
                            >
                              Edit
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(assignment.id)}
                              className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white transition duration-200 hover:bg-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAdmin && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800">
              Assign Referee to Match
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <MatchRefereeFormFields
                formData={formData}
                matches={matches}
                referees={referees}
                getMatchLabel={getMatchLabel}
                onChange={handleInputChange}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-green-500 py-2 font-semibold text-white transition duration-200 hover:bg-green-600"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseViewModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800">
              Match Assignment Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Match
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {getMatchLabel(selectedAssignment.ndeshja_id)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Referee
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {getRefereeLabel(selectedAssignment.gjyqtari_id)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {selectedAssignment.roli || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {formatDate(getMatchById(selectedAssignment.ndeshja_id)?.data_ndeshjes)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {getMatchById(selectedAssignment.ndeshja_id)?.ora_fillimit || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {getMatchById(selectedAssignment.ndeshja_id)?.statusi || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Referee Category
                </label>
                <p className="rounded-lg bg-gray-100 px-4 py-2 text-gray-800">
                  {getRefereeById(selectedAssignment.gjyqtari_id)?.kategoria || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCloseViewModal}
                className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showEditModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800">
              Edit Assignment
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <MatchRefereeFormFields
                formData={formData}
                matches={matches}
                referees={referees}
                getMatchLabel={getMatchLabel}
                onChange={handleInputChange}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-yellow-500 py-2 font-semibold text-white transition duration-200 hover:bg-yellow-600"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800">
              Delete Assignment
            </h3>
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete the referee assignment for{" "}
                <span className="font-semibold text-gray-900">
                  {getMatchLabel(selectedAssignment.ndeshja_id)}
                </span>
                ?
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white transition duration-200 hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
