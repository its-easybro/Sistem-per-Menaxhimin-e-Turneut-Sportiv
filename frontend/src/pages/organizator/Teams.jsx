import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

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

  const handleDelete = async (registrationId) => {
    try {
      // Removes a team from the tournament by deleting the registration record.
      await api.delete(`/tournament-registrations/${registrationId}`);
      setRegistrations((prev) => prev.filter((item) => item.id !== registrationId));
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
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white"
                                >
                                  Remove
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
                    {teams.map((item) => (
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
    </div>
  );
}
