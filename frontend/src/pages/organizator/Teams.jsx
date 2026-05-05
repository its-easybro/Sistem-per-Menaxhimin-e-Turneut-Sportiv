import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Trash2, Edit } from "lucide-react";

const initialFormData = {
  turneu_id: "",
  ekipi_id: "",
  statusi: "Në Pritje",
  tarifa_paguar: "0",
};

export default function OrganizerTeams() {
  const { user } = useContext(AuthContext);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.is_organizer) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        // The organizer receives only their tournaments and registrations, while teams stay global.
        const [tournamentsRes, teamsRes, registrationsRes] = await Promise.all([
          api.get("/tournaments"),
          api.get("/teams"),
          api.get("/tournament-registrations"),
        ]);

        setTournaments(Array.isArray(tournamentsRes.data) ? tournamentsRes.data : []);
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        setRegistrations(Array.isArray(registrationsRes.data) ? registrationsRes.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const resetForm = () => setFormData(initialFormData);

  const getTeamName = (id) => teams.find((item) => item.id === id)?.emertimi || "N/A";
  const selectedTournaments = tournaments.find((item) => String(item.id) === String(formData.turneu_id));
  const availableTeams = teams.filter((team) => {
    if (!selectedTournaments) return false;

    const alreadyRegistered = registrations.some(
      (registration) =>
        registration.turneu_id === selectedTournaments.id &&
        registration.ekipi_id === team.id,
    );

    return team.sporti_id === selectedTournaments.sporti_id && !alreadyRegistered;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.turneu_id || !formData.ekipi_id) {
      setAlert({ type: "error", message: "Please select a tournament and a team." });
      return;
    }

    try {
      // Creates a tournament registration so the selected team becomes part of the organizer's tournament.
      const response = await api.post("/tournament-registrations", {
        turneu_id: Number(formData.turneu_id),
        ekipi_id: Number(formData.ekipi_id),
        statusi: formData.statusi,
        tarifa_paguar: Number(formData.tarifa_paguar || 0),
      });

      setRegistrations((prev) => [...prev, response.data]);
      setShowModal(false);
      resetForm();
      setAlert({ type: "success", message: "Team added to tournament successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Error adding team: " + err.message });
    }
  };
  const handleCloseEditModal = () => {
    setFormData(initialFormData);
    setSelectedRegistration(null);
    setShowEditModal(false);
    setSelectedRegistration(null);
  }
  const handleEdit = (id) => {
    const registration = registrations.find((item) => item.id === id);
    if (registration) {
      setFormData({
        turneu_id: String(registration.turneu_id),
        ekipi_id: String(registration.ekipi_id),
        statusi: registration.statusi,
        tarifa_paguar: String(registration.tarifa_paguar),
      });
      setSelectedRegistration(registration);
      setShowEditModal(true);
    }
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRegistration) return;
    try {
      const response = await api.put(`/tournament-registrations/${selectedRegistration.id}`, {
        turneu_id: Number(formData.turneu_id),
        ekipi_id: Number(formData.ekipi_id),
        statusi: formData.statusi,
        tarifa_paguar: Number(formData.tarifa_paguar || 0),
      });
      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === selectedRegistration.id ? response.data : item
        )
      );
      setSelectedRegistration(null);
      setShowEditModal(false);
      resetForm();
      setAlert({ type: "success", message: "Team updated successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Error updating team: " + err.message });
    }
  }

  const handleDelete = (id) => {
    const registration = registrations.find((item) => item.id === id);
    setSelectedRegistration(registration || null);
    setShowDeleteModal(true);
  };
  const handleDeleteConfirm = async () => {
    if (!selectedRegistration?.id) return;
    try {
      // Removes a team from the tournament by deleting the registration record.
      await api.delete(`/tournament-registrations/${selectedRegistration.id}`);
      setRegistrations((prev) => prev.filter((item) => item.id !== selectedRegistration.id));
      setShowDeleteModal(false);
      setSelectedRegistration(null);
      setAlert({ type: "success", message: "Team removed from tournament successfully!" });
    } catch (err) {
      setAlert({ type: "error", message: "Error removing team: " + err.message });
    }
  };

  if (!user || !user.is_organizer) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">Loading teams...</div>;
  }

  if (error) {
    return <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament Teams</h1>
            <p className="mt-1 text-sm text-gray-600">Register teams only to the tournaments assigned to you.</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white"
          >
            Add Team To Tournament
          </button>
        </div>

        <div className="space-y-6">
          {tournaments.map((tournament) => {
            // Groups registrations by tournament so the organizer sees team membership per tournament.
            const items = registrations.filter((item) => item.turneu_id === tournament.id);

            return (
              <div key={tournament.id} className="rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="font-semibold text-gray-900">{tournament.emertimi}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50 text-sm text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Fee Paid</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                            No teams registered yet.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-gray-900">{getTeamName(item.ekipi_id)}</td>
                            <td className="px-4 py-3">{item.statusi}</td>
                            <td className="px-4 py-3">{Number(item.tarifa_paguar || 0).toFixed(2)} EUR</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item.id)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                                  title="edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded bg-red-500 p-2 text-sm font-medium text-white"
                                  title="delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Add Team To Tournament</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Tournament</span>
                  <select
                    name="turneu_id"
                    value={formData.turneu_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        turneu_id: e.target.value,
                        ekipi_id: "",
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Team</span>
                  <select
                    name="ekipi_id"
                    value={formData.ekipi_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ekipi_id: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select team</option>
                    {availableTeams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <select
                    name="statusi"
                    value={formData.statusi}
                    onChange={(e) => setFormData((prev) => ({ ...prev, statusi: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="Në Pritje">Në Pritje</option>
                    <option value="Aprovuar">Aprovuar</option>
                    <option value="Refuzuar">Refuzuar</option>
                    <option value="Anuluar">Anuluar</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Fee Paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tarifa_paguar}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tarifa_paguar: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">
                  Add Team
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseEditModal}>
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Edit Team</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Tournament</span>
                  <select
                    name="turneu_id"
                    value={formData.turneu_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, turneu_id: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Team</span>
                  <select
                    name="ekipi_id"
                    value={formData.ekipi_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ekipi_id: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select team</option>
                    {availableTeams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <select
                    name="statusi"
                    value={formData.statusi}
                    onChange={(e) => setFormData((prev) => ({ ...prev, statusi: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="Në Pritje">Në Pritje</option>
                    <option value="Aprovuar">Aprovuar</option>
                    <option value="Refuzuar">Refuzuar</option>
                    <option value="Anuluar">Anuluar</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Fee Paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tarifa_paguar}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tarifa_paguar: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">
                  Update Team
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Delete Team</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete {getTeamName(selectedRegistration.ekipi_id)} from this tournament?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRegistration(null);
                }}
                className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
