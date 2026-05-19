import {useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { API_BASE_URL } from "../../config/api";
import { Alert } from "../../components/Alert";
import { Edit, Trash2, Eye } from "lucide-react";

const formatDate = (isoDate) => {
    if (!isoDate) return "N/A";
    try{
   const date = new Date(isoDate);
   const day = String(date.getDate()).padStart(2, "0");
   const month = String(date.getMonth() + 1).padStart(2, "0");
   const year = date.getFullYear();
   return `${day}/${month}/${year}`;
    }catch{
        return "Invalid Date";
    }
};

const resolveTeamLogoUrl = (logoValue) => {
  if (!logoValue || typeof logoValue !== "string") return "";

  const trimmed = logoValue.trim();
  if (!trimmed) return "";

  // Handle legacy saved URLs that used /sports/uploads-teams.
  const migrated = trimmed.replace("/sports/uploads-teams/", "/teams/uploads-teams/");

  if (/^https?:\/\//i.test(migrated)) {
    return migrated;
  }

  if (migrated.startsWith("/teams/uploads-teams/")) {
    return `${API_BASE_URL}${migrated}`;
  }

  if (migrated.startsWith("/uploads-teams/")) {
    return `${API_BASE_URL}/teams${migrated}`;
  }

  return `${API_BASE_URL}/teams/uploads-teams/${migrated.replace(/^\/+/, "")}`;
};
const teamCreateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Team name must be at least 2 characters")
    .required("Team name is required"),
  trajneri: yup.string().min(2, "Trainer name must be at least 2 characters"),
  kontakti: yup.string().min(6, "Contact must be at least 6 characters"),
  email: yup.string().email("Email must be valid"),
  qyteti: yup.string().min(2, "City must be at least 2 characters"),
  data_themelimit: yup.string(),
  sporti_id: yup.string().required("Sport is required"),
  logoja: yup.string(),
});

const teamUpdateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Team name must be at least 2 characters"),
  trajneri: yup.string(),
  kontakti: yup.string(),
  email: yup.string().email("Email must be valid"),
  qyteti: yup.string(),
  data_themelimit: yup.string(),
  sporti_id: yup.string(),
  logoja: yup.string(),
});
export default function Teams() {
    // Provides admin-only team CRUD with modal-driven forms.
    const { user } = useContext(AuthContext);

    // Stores team list, active dialogs, selected row, and form values.
    const [teams , setTeams ] = useState([]);
    const [sports, setSports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal]= useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [alert, setAlert] = useState(null);
    const [uploading, setUploading] = useState(false)
    const [formData, setFormData] = useState({
                  emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
                sporti_id: "",
    });
    const [formErrors, setFormErrors] = useState({});

    const handleLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const data = new FormData();
      data.append("logo", file)

      setUploading(true)
      try {
        const response = await api.post("/teams/upload-team-logo", data, {
          headers: { "Content-Type": "multipart/form-data"}
        })

        setFormData((prev) => ({ ...prev, logoja: response.data.url }))
      } catch {
        setAlert({ type: "error", message: "Failed to upload logo" })
      } finally {
        setUploading(false)
      }
    }

    // Loads team records after auth is ready and admin access is confirmed.
    useEffect(() => {
        const loadTeams = async () => {
        if (!user?.is_admin) {
            setLoading(false);
            return;
        }
        try{
            setLoading(true);
            const [teamsResponse, sportsResponse] = await Promise.all([
              api.get("/teams"),
              api.get("/sports"),
            ]);

        const teamsData = teamsResponse.data;
        const sportsData = sportsResponse.data;
        setTeams(teamsData);
        setSports(Array.isArray(sportsData) ? sportsData : []);
    }  catch(err){
        setError(err.message);

    }finally {
        setLoading(false);
    }

    };
        loadTeams();
}, [user]);

    const handleCreate = () => {
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev)=> ({
            ...prev,
            [name]: value,
        }));

        if (formErrors[name]) {
          setFormErrors((prev) => ({
            ...prev,
            [name]: undefined,
          }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            await teamCreateSchema.validate(formData, { abortEarly: false });
             
            const response = await api.post(`/teams`, formData)
            
            const newTeam = response.data;
            setTeams([...teams, newTeam]);

            setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
                sporti_id: "",
            });
            setFormErrors({});
            setShowModal(false);
            setAlert({ type: "success", message: "Team created successfully!" });
        } catch(err){
            if (err.inner) {
              const validationErrors = {};
              err.inner.forEach((error) => {
                validationErrors[error.path] = error.message;
              });
              setFormErrors(validationErrors);
            } else {
              setAlert({
                type: "error",
                message:
                  "Error creating team: " +
                  (err.response?.data?.error || err.message),
              });
            }
        }
    };
    const handleCloseModal = () => {
        setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
                sporti_id: "",
        });
        setFormErrors({});
        setShowModal(false);

    };

    const handleCloseEditModal = () => {
        setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
                sporti_id: "",
        });
        setFormErrors({});
        setSelectedTeam(null);
        setShowEditModal(false);

    };

    const handleCloseViewModal = () => {
        setSelectedTeam(null);
        setShowViewModal(false);
    };

    const handleCloseDeleteModal = () => {
        setSelectedTeam(null);
        setShowDeleteModal(false);
    };

    const handleView = (id) => {
        const team = teams.find((e)=> e.id ===id);
        setSelectedTeam(team);
        setShowViewModal(true);
    };
    const handleEdit = (id) => {
        const team = teams.find((e)=> e.id === id)
        setSelectedTeam(team);

        setFormData({
                emertimi : team.emertimi || "",
                logoja : team.logoja || "",
                trajneri : team.trajneri || "",
                kontakti : team.kontakti || "",
                email : team.email || "",
                qyteti : team.qyteti || "",
                data_themelimit : team.data_themelimit || "",
                sporti_id : team.sporti_id ? String(team.sporti_id) : "",
        });
      setShowEditModal(true);
    };

    const handleDelete = (id) => {
        const team = teams.find((e)=> e.id === id);
        setSelectedTeam(team);
        setShowDeleteModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if(!selectedTeam) return;
        try{
          await teamUpdateSchema.validate(formData, { abortEarly: false });
          const response = await api.put(`teams/${selectedTeam.id}`, formData)

            const updatedTeam = response.data;

            setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
            setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
                sporti_id: "",
        });
        setFormErrors({});
        setSelectedTeam(null);
        setShowEditModal(false);
        setAlert({ type: "success", message: "Team updated successfully!" });
        } catch(err) {
            if (err.inner) {
              const validationErrors = {};
              err.inner.forEach((error) => {
                validationErrors[error.path] = error.message;
              });
              setFormErrors(validationErrors);
            } else {
              setAlert({
                type: "error",
                message:
                  "Error updating team: " +
                  (err.response?.data?.error || err.message),
              });
            }
        }
    };

    const handleDeleteConfirm = async () => {
        if(!selectedTeam) return;
        try{
          await api.delete(`teams/${selectedTeam.id}`)

            setTeams(teams.filter((t) => t.id !== selectedTeam.id));

            setSelectedTeam(null);
            setShowDeleteModal(false);
            setAlert({ type: "success", message: "Team deleted successfully!" });
        }catch(err){
            setAlert({
              type: "error",
              message:
                "Error deleting team: " +
                (err.response?.data?.error || err.message),
            });
        }

    };

    // Redirects non-admin users away from protected team management.
    if(!user || !user.is_admin) {
        return < Navigate to="/login" replace/>;
    }

   function renderSkeleton() {
    return (
      <div className="bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          {/* Header and Add button */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            {/* Search bar placeholder */}
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          {/* Table placeholder */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-8"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-24"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-12"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-20 mx-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-10"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
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

  if (loading) return renderSkeleton();

  if (error)
    return (
      <div className="flex justify-center items-center h-center">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
     return (
    <div className="bg-gray-50 p-4">
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
            <h2 className="text-2xl font-bold text-gray-800">
              Team Management
            </h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add New Team
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search team"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400"
            />
            {/* Search Icon (magnifying glass) */}
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
        {/* Team table section */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-center font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Team Name</th>
                <th className="px-4 py-3 text-left font-semibold">Trainer</th>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">City</th>
                <th className="px-4 py-3 text-left font-semibold">Sport</th>
                <th className="px-4 py-3 text-center font-semibold">Founded Date</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
                
              
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-gray-200">
              {teams.filter((s) =>
                (s.emertimi || "").toLowerCase().includes(searchQuery.toLowerCase()),
              ).length > 0 ? (
                teams
                  .filter((s) =>
                    (s.emertimi || "").toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-100 transtion-colors duration-150"
                    >
                      <td className="px-4 py-3 text-gray-500 text-center">
                        {s.id}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.emertimi}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.trajneri}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.kontakti || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {s.email || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.qyteti || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.sporti_emri || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 text-center">
                        {formatDate(s.data_themelimit)}
                      </td>
                      
                        
                     <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(s.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(s.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
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
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    {searchQuery
                      ? `No team match "${searchQuery}". Try a different search.`
                      : 'No teams found. Click "Add New Team" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD NEW TEAM MODAL */}
        {showModal && ( 
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2x1 font-bold text-gray-800 mb-6">
                Add New Team
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Team logo upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Logo
                    </label>
                    {formData.logoja && (
                    <img
                        src={resolveTeamLogoUrl(formData.logoja)}
                        alt="Team logo"
                        className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-200"
                      />
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                     Team Name*
                    </label>
                    <input
                      type="text"
                      name="emertimi"
                      value={formData.emertimi}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        formErrors.emertimi ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Name of the team"
                      required
                    />
                    {formErrors.emertimi && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.emertimi}</p>
                    )}
                  </div>
                  {/* Trainer input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trainer *
                    </label>
                    <input
                      type="text"
                      name="trajneri"
                      value={formData.trajneri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Trainer Name"
                      required
                    />
                  </div>

                  {/* contact input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact *
                    </label>
                    <input
                      type="tel"
                      name="kontakti"
                      value={formData.kontakti}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        formErrors.kontakti ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="+383 12 345 678"
                      required
                    />
                    {formErrors.kontakti && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.kontakti}</p>
                    )}
                  </div>
                  {/* Email input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        formErrors.email ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Email"
                      required
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                    )}
                  </div>
                  {/* City input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                    </label>
                    <input
                      type="text"
                      name="qyteti"
                      value={formData.qyteti}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        formErrors.qyteti ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="City"
                      required
                    />
                    {formErrors.qyteti && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.qyteti}</p>
                    )}
                  </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport *
                    </label>
                    <select
                      name="sporti_id"
                      value={formData.sporti_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Founded Date *
                    </label>
                    <input
                      type="date"
                      name="data_themelimit"
                      value={formData.data_themelimit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        formErrors.data_themelimit ? "border-red-500" : "border-gray-300"
                      }`}
                      required
                    />
                    {formErrors.data_themelimit && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.data_themelimit}</p>
                    )}
                  </div>
                </div>
                {/* Form buttons */}
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
        {/* View team modal*/}
        {showViewModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2x1 font-bold text-gray-800 mb-6">
                Team Details
              </h3>
              {/* Add this */}
              {selectedTeam.logoja && (
                <div className="flex justify-center mb-6">
                  <img
                    src={resolveTeamLogoUrl(selectedTeam.logoja)}
                    alt={`${selectedTeam.emertimi} logo`}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.emertimi}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trainer
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.trajneri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.kontakti}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.qyteti}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sport
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedTeam.sporti_emri || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Founded Date
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {formatDate(selectedTeam.data_themelimit)}
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

        {/* Edit team modal */}
        {showEditModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
               {/* Team logo upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Logo
                    </label>
                    {formData.logoja && (
                    <img
                        src={resolveTeamLogoUrl(formData.logoja)}
                        alt="Team logo"
                        className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-200"
                      />
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
              <h3 className="text-2x1 font-bold text-gray-800 mb-6">
                Edit Team
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      name="emertimi"
                      value={formData.emertimi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Team Name"
                      required
                    />
                  </div>
                  {/* Trainer input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trainer *
                    </label>
                    <input
                      type="text"
                      name="trajneri"
                      value={formData.trajneri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Trainer Name"
                      required
                    />
                  </div>
                  {/* Contact input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact *
                    </label>
                    <input
                      type="text"
                      name="kontakti"
                      value={formData.kontakti}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Contact"
                    />
                  </div>
                  {/* Email input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Email"
                    />
                  </div>
                  {/* City input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="qyteti"
                      value={formData.qyteti}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport *
                    </label>
                    <select
                      name="sporti_id"
                      value={formData.sporti_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Founded date input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Founded Date
                    </label>
                    <input
                      type="date"
                      name="data_themelimit"
                      value={formData.data_themelimit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Update
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

        {/* Delete team confirmation modal */}
        {showDeleteModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Delete Team
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{selectedTeam.emertimi}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>
                <button
                  type="button"
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
};
