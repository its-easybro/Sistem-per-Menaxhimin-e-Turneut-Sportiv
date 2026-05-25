import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Trash2, Edit } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

const initialFormData = {
  turneu_id: "",
  ekipi_id: "",
  statusi: "Në Pritje",
  tarifa_paguar: "0",
};

const registrationCreateSchema = yup.object().shape({
  turneu_id: yup.number().typeError("Tournament must be a number").required("Tournament is required"),
  ekipi_id: yup.number().typeError("Team must be a number").required("Team is required"),
  statusi: yup.string().oneOf(["Në Pritje", "Aprovuar", "Refuzuar", "Anuluar"]).required("Status is required"),
  tarifa_paguar: yup.number().min(0, "Fee cannot be negative").typeError("Fee must be a number").required("Fee is required"),
});

const registrationUpdateSchema = yup.object().shape({
  turneu_id: yup.number().typeError("Tournament must be a number").required("Tournament is required"),
  ekipi_id: yup.number().typeError("Team must be a number").required("Team is required"),
  statusi: yup.string().oneOf(["Në Pritje", "Aprovuar", "Refuzuar", "Anuluar"]).required("Status is required"),
  tarifa_paguar: yup.number().min(0, "Fee cannot be negative").typeError("Fee must be a number").required("Fee is required"),
});

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
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };

  useEffect(() => {
    if (!user?.is_organizer) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
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

    try {
      await registrationCreateSchema.validate(formData, { abortEarly: false });

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
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: "error", message: "Error adding team: " + err.message });
      }
    }
  };
  const handleCloseEditModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedRegistration(null);
    setShowEditModal(false);
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
      await registrationUpdateSchema.validate(formData, { abortEarly: false });

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
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({ type: "error", message: "Error updating team: " + err.message });
      }
    }
  };

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
    return <div className="delay-skeleton">
      <TableSkeleton />
    </div>;
  }

  if (error) {
    return <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm dark:bg-slate-900 dark:text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Tournament Teams</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Register teams only to the tournaments assigned to you.</p>
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
              <div key={tournament.id} className="rounded-lg border border-gray-200 dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                  <h2 className="font-semibold text-gray-900 dark:text-slate-100">{tournament.emertimi}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Fee Paid</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                            No teams registered yet.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{getTeamName(item.ekipi_id)}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{item.statusi}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{Number(item.tarifa_paguar || 0).toFixed(2)} EUR</td>
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
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">Add Team To Tournament</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Tournament</span>
                  <select
                    name="turneu_id"
                    value={formData.turneu_id}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        turneu_id: e.target.value,
                        ekipi_id: "",
                      }));
                      if (formErrors.turneu_id) {
                        setFormErrors((prev) => ({ ...prev, turneu_id: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.turneu_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                    required
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                  {formErrors.turneu_id && (
                    <p className="text-red-500 text-xs">{formErrors.turneu_id}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Team</span>
                  <select
                    name="ekipi_id"
                    value={formData.ekipi_id}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, ekipi_id: e.target.value }));
                      if (formErrors.ekipi_id) {
                        setFormErrors((prev) => ({ ...prev, ekipi_id: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.ekipi_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                    required
                  >
                    <option value="">Select team</option>
                    {availableTeams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                  {formErrors.ekipi_id && (
                    <p className="text-red-500 text-xs">{formErrors.ekipi_id}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
                  <select
                    name="statusi"
                    value={formData.statusi}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, statusi: e.target.value }));
                      if (formErrors.statusi) {
                        setFormErrors((prev) => ({ ...prev, statusi: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.statusi ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                  >
                    <option value="Në Pritje">Në Pritje</option>
                    <option value="Aprovuar">Aprovuar</option>
                    <option value="Refuzuar">Refuzuar</option>
                    <option value="Anuluar">Anuluar</option>
                  </select>
                  {formErrors.statusi && (
                    <p className="text-red-500 text-xs">{formErrors.statusi}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Fee Paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tarifa_paguar}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tarifa_paguar: e.target.value }));
                      if (formErrors.tarifa_paguar) {
                        setFormErrors((prev) => ({ ...prev, tarifa_paguar: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.tarifa_paguar ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                  />
                  {formErrors.tarifa_paguar && (
                    <p className="text-red-500 text-xs">{formErrors.tarifa_paguar}</p>
                  )}
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">
                  Add Team
                </button>
                <button type="button" onClick={() => {
                  setShowModal(false);
                  resetForm();
                }} className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={handleCloseEditModal}>
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Team</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Tournament</span>
                  <select
                    name="turneu_id"
                    value={formData.turneu_id}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, turneu_id: e.target.value }));
                      if (formErrors.turneu_id) {
                        setFormErrors((prev) => ({ ...prev, turneu_id: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.turneu_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                    required
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                  {formErrors.turneu_id && (
                    <p className="text-red-500 text-xs">{formErrors.turneu_id}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Team</span>
                  <select
                    name="ekipi_id"
                    value={formData.ekipi_id}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, ekipi_id: e.target.value }));
                      if (formErrors.ekipi_id) {
                        setFormErrors((prev) => ({ ...prev, ekipi_id: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.ekipi_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                    required
                  >
                    <option value="">Select team</option>
                    {availableTeams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.emertimi}
                      </option>
                    ))}
                  </select>
                  {formErrors.ekipi_id && (
                    <p className="text-red-500 text-xs">{formErrors.ekipi_id}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
                  <select
                    name="statusi"
                    value={formData.statusi}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, statusi: e.target.value }));
                      if (formErrors.statusi) {
                        setFormErrors((prev) => ({ ...prev, statusi: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.statusi ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                  >
                    <option value="Në Pritje">Në Pritje</option>
                    <option value="Aprovuar">Aprovuar</option>
                    <option value="Refuzuar">Refuzuar</option>
                    <option value="Anuluar">Anuluar</option>
                  </select>
                  {formErrors.statusi && (
                    <p className="text-red-500 text-xs">{formErrors.statusi}</p>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Fee Paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tarifa_paguar}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tarifa_paguar: e.target.value }));
                      if (formErrors.tarifa_paguar) {
                        setFormErrors((prev) => ({ ...prev, tarifa_paguar: "" }));
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.tarifa_paguar ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
                  />
                  {formErrors.tarifa_paguar && (
                    <p className="text-red-500 text-xs">{formErrors.tarifa_paguar}</p>
                  )}
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">
                  Update Team
                </button>
                <button type="button" onClick={handleCloseEditModal} className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Delete Team</h2>
            <p className="mb-6 text-gray-600 dark:text-slate-300">
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
