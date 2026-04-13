import {useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

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

export default function Teams() {
    const { user } = useContext(AuthContext);

    const [teams , setTeams ] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal]= useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [formData, setFormData] = useState({
                  emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",

    });

    useEffect(() => {
        const loadTeams = async () => {
        if (!user?.is_admin) {
            setLoading(false);
            return;
        }
        try{
            setLoading(true);
            const [teamsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/teams`,{
                    credentials: "include",

                }),
            ]);
            if (!teamsResponse.ok) {
                throw new Error("Failed to fetch teams");
        }
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            const response = await fetch(`${API_BASE_URL}/teams`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(formData),
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || "Failed to create team");
            }
            const newTeam = await response.json();
            setTeams([...teams, newTeam]);

            setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
            });
            setShowModal(false);

        } catch(err){
            alert("Error creating team: " + err.message);

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
        });
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
        });
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
            const response = await fetch(`${API_BASE_URL}/teams/${selectedTeam.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(formData),
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || "Failed to update team");
            }

            const updatedTeam = await response.json();

            setTeams(teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
            setFormData({
                emertimi : "",
                logoja : "",
                trajneri : "",
                kontakti : "",
                email : "",
                qyteti : "",
                data_themelimit : "",
        });

        setSelectedTeam(null);
        setShowEditModal(false);
        } catch(err) {
            alert("Error updating team: " + err.message);
        }
    };

    const handleDeleteConfirm = async () => {
        if(!selectedTeam) return;
        try{
            const response = await fetch(`${API_BASE_URL}/teams/${selectedTeam.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || "Failed to delete team");
            }

            setTeams(teams.filter((t) => t.id !== selectedTeam.id));

            setSelectedTeam(null);
            setShowDeleteModal(false);

        }catch(err){
            alert("Error deleting team:" + err.message);
        }

    };

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
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Team Name</th>
                <th className="px-4 py-3 text-left font-semibold">Trainer</th>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">City</th>
                <th className="px-4 py-3 text-left font-semibold">Start Date</th>
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
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.id}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.emertimi}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.trajneri}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.kontakti || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.email || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {s.qyteti || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {formatDate(s.data_themelimit)}
                      </td>
                      
                        
                     <td className="px-4 py-3">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Name of the team"
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

                  {/* contact input field */}
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
                      placeholder="****-**-**"
                      
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
                </div>
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



    


