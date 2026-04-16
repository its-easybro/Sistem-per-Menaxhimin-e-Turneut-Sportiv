import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

const initialFormData = {
  emertimi: "",
  sporti_id: "",
  lloji: "",
  data_fillimit: "",
  data_perfundimit: "",
  lokacioni: "",
  cmimi_regjistrimit: "0.00",
  statusi: "Regjistrimi",
  pershkrimi: "",
};

const tournamentTypeOptions = [
  "Grup + Eliminim",
  "Vetëm Grup",
  "Vetëm Eliminim",
  "Liga",
];

const statusOptions = [
  "Regjistrimi",
  "Aktiv",
  "Përfunduar",
  "Anuluar",
];

function validateTournamentForm(formData) {
  if (!formData.emertimi.trim()) {
    return "Tournament name is required.";
  }

  if (!formData.sporti_id) {
    return "Sport is required.";
  }

  if (!tournamentTypeOptions.includes(formData.lloji)) {
    return "Please choose a valid tournament format.";
  }

  if (!statusOptions.includes(formData.statusi)) {
    return "Please choose a valid tournament status.";
  }

  if (!formData.data_fillimit || !formData.data_perfundimit) {
    return "Start date and end date are required.";
  }

  const startDate = new Date(formData.data_fillimit);
  const endDate = new Date(formData.data_perfundimit);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Please provide valid tournament dates.";
  }

  if (endDate <= startDate) {
    return "End date must be after the start date.";
  }

  const registrationPrice = Number(formData.cmimi_regjistrimit);

  if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
    return "Registration price must be a valid non-negative number.";
  }
}

function normalizeTournamentForm(formData) {
  return {
    ...formData,
    emertimi: formData.emertimi.trim(),
    lokacioni: formData.lokacioni.trim(),
    pershkrimi: formData.pershkrimi.trim(),
  };
}

function getStatusBadgeClasses(status) {
  if (status === "Aktiv") return "bg-green-100 text-green-700";
  if (status === "Regjistrimi") return "bg-blue-100 text-blue-700";
  if (status === "Përfunduar") return "bg-gray-200 text-gray-700";
  if (status === "Anuluar") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function getFormatBadgeClasses(format) {
  if (format === "Liga") return "bg-purple-100 text-purple-700";
  if (format === "Grup + Eliminim") return "bg-amber-100 text-amber-700";
  if (format === "Vetëm Grup") return "bg-sky-100 text-sky-700";
  if (format === "Vetëm Eliminim") return "bg-indigo-100 text-indigo-700";
  return "bg-gray-100 text-gray-700";
}

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

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

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Close
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function TournamentFormFields({ formData, sports, onChange }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Tournament Name</span>
        <input
          type="text"
          name="emertimi"
          value={formData.emertimi}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Sport</span>
        <select
          name="sporti_id"
          value={formData.sporti_id}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select sport</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.emertimi}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Format</span>
        <select
          name="lloji"
          value={formData.lloji}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select format</option>
          {tournamentTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <select
          name="statusi"
          value={formData.statusi}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Start Date</span>
        <input
          type="date"
          name="data_fillimit"
          value={formData.data_fillimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">End Date</span>
        <input
          type="date"
          name="data_perfundimit"
          value={formData.data_perfundimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Location</span>
        <input
          type="text"
          name="lokacioni"
          value={formData.lokacioni}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Registration Price</span>
        <input
          type="number"
          min="0"
          step="0.01"
          name="cmimi_regjistrimit"
          value={formData.cmimi_regjistrimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-2 md:col-span-2">
        <span className="text-sm font-medium text-gray-700">Description</span>
        <textarea
          name="pershkrimi"
          value={formData.pershkrimi}
          onChange={onChange}
          rows={4}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>
    </div>
  );
}

export default function Tournaments() {
  const { user } = useContext(AuthContext);
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const loadTournaments = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [tournamentsRes, sportsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/tournaments`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/sports`, {
            credentials: "include",
          }),
        ]);

        if (!tournamentsRes.ok) {
          throw new Error("Failed to fetch tournaments");
        }

        if (!sportsRes.ok) {
          throw new Error("Failed to fetch sports");
        }

        const tournamentsData = await tournamentsRes.json();
        const sportsData = await sportsRes.json();

        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
        setSports(Array.isArray(sportsData) ? sportsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
  }, [user]);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const getSportName = (sportId) => {
    const sport = sports.find((item) => item.id === sportId);
    return sport?.emertimi || "Unknown";
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleView = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setFormData({
      emertimi: tournament.emertimi || "",
      sporti_id: tournament.sporti_id ?? "",
      lloji: tournament.lloji || "",
      data_fillimit: toDateInputValue(tournament.data_fillimit),
      data_perfundimit: toDateInputValue(tournament.data_perfundimit),
      lokacioni: tournament.lokacioni || "",
      cmimi_regjistrimit: String(tournament.cmimi_regjistrimit ?? "0.00"),
      statusi: tournament.statusi || "Regjistrimi",
      pershkrimi: tournament.pershkrimi || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedTournament(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedTournament(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedTournament(null);
    setShowDeleteModal(false);
  };

  const buildPayload = () => ({
    ...normalizeTournamentForm(formData),
    sporti_id: Number(formData.sporti_id),
    cmimi_regjistrimit:
      formData.cmimi_regjistrimit === ""
        ? 0
        : Number(formData.cmimi_regjistrimit),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const validationError = validateTournamentForm(formData);
      if (validationError) {
        alert(validationError);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tournaments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to create tournament");
      }

      setTournaments((prev) => [...prev, data]);
      handleCloseModal();
    } catch (err) {
      alert("Error creating tournament: " + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTournament) return;

    try {
      const validationError = validateTournamentForm(formData);
      if (validationError) {
        alert(validationError);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/tournaments/${selectedTournament.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(buildPayload()),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to update tournament");
      }

      setTournaments((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );

      handleCloseEditModal();
    } catch (err) {
      alert("Error updating tournament: " + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTournament) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/tournaments/${selectedTournament.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete tournament");
      }

      setTournaments((prev) =>
        prev.filter((item) => item.id !== selectedTournament.id),
      );

      handleCloseDeleteModal();
    } catch (err) {
      alert("Error deleting tournament: " + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredTournaments = tournaments.filter((item) => {
    const query = searchQuery.toLowerCase();

    return (
      item.emertimi?.toLowerCase().includes(query) ||
      item.lloji?.toLowerCase().includes(query) ||
      item.lokacioni?.toLowerCase().includes(query) ||
      item.statusi?.toLowerCase().includes(query) ||
      getSportName(item.sporti_id).toLowerCase().includes(query)
    );
  });

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm">
          Loading tournaments...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Tournament Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Create, review, update, and remove tournaments from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Add Tournament
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, sport, format, location, or status"
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {filteredTournaments.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No tournaments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tournament
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Sport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Location
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTournaments.map((tournament) => (
                    <tr key={tournament.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {tournament.emertimi}
                        </div>
                        <div className="text-sm text-gray-500">
                          Registration: {formatCurrency(tournament.cmimi_regjistrimit)} EUR
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getSportName(tournament.sporti_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFormatBadgeClasses(tournament.lloji)}`}
                        >
                          {tournament.lloji || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>{formatDate(tournament.data_fillimit)}</div>
                        <div className="text-gray-500">
                          to {formatDate(tournament.data_perfundimit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(tournament.statusi)}`}
                        >
                          {tournament.statusi || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tournament.lokacioni || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(tournament.id)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(tournament.id)}
                            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tournament.id)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ModalShell title="Create Tournament" onClose={handleCloseModal}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <TournamentFormFields
              formData={formData}
              sports={sports}
              onChange={handleInputChange}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Tournament
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showViewModal && selectedTournament && (
        <ModalShell title="Tournament Details" onClose={handleCloseViewModal}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-base text-gray-900">
                {selectedTournament.emertimi || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sport</p>
              <p className="mt-1 text-base text-gray-900">
                {getSportName(selectedTournament.sporti_id)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Format</p>
              <p className="mt-1 text-base text-gray-900">
                {selectedTournament.lloji || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="mt-1 text-base text-gray-900">
                {selectedTournament.statusi || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Start Date</p>
              <p className="mt-1 text-base text-gray-900">
                {formatDate(selectedTournament.data_fillimit)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">End Date</p>
              <p className="mt-1 text-base text-gray-900">
                {formatDate(selectedTournament.data_perfundimit)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="mt-1 text-base text-gray-900">
                {selectedTournament.lokacioni || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Registration Price
              </p>
              <p className="mt-1 text-base text-gray-900">
                {formatCurrency(selectedTournament.cmimi_regjistrimit)} EUR
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-base text-gray-900">
                {selectedTournament.pershkrimi || "N/A"}
              </p>
            </div>
          </div>
        </ModalShell>
      )}

      {showEditModal && selectedTournament && (
        <ModalShell title="Edit Tournament" onClose={handleCloseEditModal}>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <TournamentFormFields
              formData={formData}
              sports={sports}
              onChange={handleInputChange}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showDeleteModal && selectedTournament && (
        <ModalShell title="Delete Tournament" onClose={handleCloseDeleteModal}>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {selectedTournament.emertimi}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
