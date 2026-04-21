import {useContext, useEffect, useState } from "react";
import {Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import { Alert } from "../../components/Alert";

const initialFormData = {
    emri: "",
    mbiemri: "",
    email: "",
    telefoni: "",
    nr_licences: "",
    kategoria: "",
    pervoja_vitesh: "",
};

export default function Referees() {
    // Keeps the page restricted to authenticated admins from auth context.
    const {user} = useContext(AuthContext);

    // Stores list data, modal state, selection, and current form values.
    const [referees, setReferees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedReferee, setSelectedReferee] = useState(null);
    const [searchQuery, setSearchQuery ] = useState("");
    const [formData, setFormData] = useState(initialFormData);
    // Loads referees once auth state is available and user is admin.
    useEffect(()=> {
        const loadReferees = async () => {
            if(!user?.is_admin){
                setLoading(false);
                
                return;
            }
            try{
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/referees`,{
                    credentials: "include",

                });
                if(!response.ok){
                    throw new Error("Failed to fetch referees");
                }
                const data = await response.json();
                setReferees(data);

            }catch(err){
                setError(err.message);
            }finally{
                setLoading(false);
            }
        };
        loadReferees();
    }, [user]);

    const resetForm = () => {
        setFormData(initialFormData);
    };

    const handleCreate = () => {
        resetForm();
        setShowModal(true);

    }
    const handleInputChange = (e) => {
        const {name, value, type, checked} = e.target;
        setFormData((prev)=> ({
            ...prev,
            [name]: type ==="checkbox" ? checked : value,
        }));
    };
    const handleCloseModal = () => {
        resetForm();
        setShowModal(false);
    };

    const handleCloseViewModal = () => {
        setSelectedReferee(null);
        setShowViewModal(false);
    };
    const handleCloseEditModal = () => {
        resetForm();
        setSelectedReferee(null);
        setShowEditModal(false);
    };
    const handleCloseDeleteModal = () => {
        setSelectedReferee(null);
        setShowDeleteModal(false);

    };
    const handleView = (id) => {
        const referee = referees.find((item) => item.id === id);
        setSelectedReferee(referee);
        setShowViewModal(true);
    };
    const handleEdit = (id) => {
        const referee = referees.find((item)=> item.id===id);
        if(!referee) return;
        setSelectedReferee(referee);
        setFormData({
            emri: referee.emri || "",
            mbiemri: referee.mbiemri || "",
            email: referee.email || "",
            telefoni: referee.telefoni || "",
            nr_licences: referee.nr_licences || "",
            kategoria: referee.kategoria || "",
            pervoja_vitesh: referee.pervoja_vitesh ?? "",
        });
        setShowEditModal(true);
    };
    const handleDelete = (id)=> {
        const referee= referees.find((item)=> item.id === id);
        setSelectedReferee(referee);
        setShowDeleteModal(true);

    };
    const buildPayload = () => ({
        // Converts optional numeric inputs before sending to backend.
        ...formData,
       
        pervoja_vitesh: formData.pervoja_vitesh === "" ? null : Number(formData.pervoja_vitesh),
        telefoni: formData.telefoni === "" ? null : Number(formData.telefoni),
    });
    const handleSubmit = async (e) => {
        e.preventDefault();

        try{
            const response = await fetch(`${API_BASE_URL}/referees`,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                
                },
                credentials: "include",
                body: JSON.stringify(buildPayload()),
            });
            const data = await response.json();
            if(!response.ok){
                throw new Error(data.error || "Failed to create referee");
            }
            setReferees((prev)=> [...prev, data]);
            handleCloseModal();
            setAlert({ type: "success", message: "Referee created successfully" });

        }catch(err){
            setAlert({type: "error", message: "Failed to create referee: " + err.message});
        }
    };

    const handleEditSubmit = async (e)=> {
        e.preventDefault();

        if(!selectedReferee) return;

        try{
            const response = await fetch (`${API_BASE_URL}/referees/${selectedReferee.id}`,{
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(buildPayload()),
            });

            const data = await response.json();

            if(!response.ok){
                throw new Error(data.error || "Failed to update referee");

            }
            setReferees((prev)=> prev.map((item)=> (item.id === data.id ? data : item)));
            handleCloseEditModal();
            setAlert({type: "success", message: "Referee updated successfully"});

        }catch(err){
            setAlert({type:"error", message: "Failed to update referee" + err.message});
        }
    };
    const handleDeleteConfirm = async () => {
        if(!selectedReferee) return;
        try{
            const response = await fetch(`${API_BASE_URL}/referees/${selectedReferee.id}`,{
                method: "DELETE",
                credentials: "include",
            });
            const data = await response.json();

            if(!response.ok){
                throw new Error(data.error || "Failed to delete referee");
            }
            setReferees((prev)=> prev.filter((item)=> item.id !== selectedReferee.id));
            handleCloseDeleteModal();
            setAlert({type: "success", message: "Referee deleted successfully"});
        }catch(err){
            setAlert({type:"error", message: "Failed to delete referee"+err.message});
        }
    };
    // Applies search filter across identity and category fields.
    const filteredReferees = referees.filter((referee)=>{
        const query = searchQuery.toLowerCase();
        return (
            
            referee.emri?.toLowerCase().includes(query) ||
            referee.mbiemri?.toLowerCase().includes(query) ||
            referee.email?.toLowerCase().includes(query) ||
            referee.kategoria?.toLowerCase().includes(query)

        );
    });

    if (!user || !user.is_admin){
        return <Navigate to="/login" />;
    }

function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
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
                  {Array.from({ length: 9 }).map((_, index) => (
                    <th key={index} className="px-6 py-4">
                      <div className="h-4 bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full max-w-[100px]"></div>
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

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-gray-800">Referees Management</h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add New Referee
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search referee"
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

        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Surname</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Phone Number</th>
                <th className="px-6 py-4 text-left font-semibold">Nr of License</th>
                <th className="px-6 py-4 text-left font-semibold">Category</th>
                <th className="px-6 py-4 text-center font-semibold">Years of experience</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReferees.length > 0 ? (
                filteredReferees.map((referee) => (
                  <tr key={referee.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-6 py-4 text-gray-500 text-center">{referee.id}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.emri}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.mbiemri || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">{referee.email || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.telefoni || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 font-semibold">{referee.nr_licences || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">{referee.kategoria || "-"}</td>
                    <td className="px-6 py-4 text-gray-800 text-center">{referee.pervoja_vitesh || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(referee.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(referee.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(referee.id)}
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
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-600">
                    {searchQuery
                      ? `No referee matches "${searchQuery}". Try a different search.`
                      : 'No referees found. Click "Add New Referee" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Referee</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <RefereeForm formData={formData} onChange={handleInputChange} />
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

        {showViewModal && selectedReferee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Referee Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RefereeDetail label="Full Name" value={selectedReferee.emri} />
                <RefereeDetail label="Email" value={selectedReferee.email || "-"} />
                <RefereeDetail label="Phone Number" value={selectedReferee.telefoni || "-"} />
                <RefereeDetail label="License Number" value={selectedReferee.nr_licences || "-"} />
                <RefereeDetail
                  label="Category"
                  value={selectedReferee.kategoria || "-"}
                />
               
                
                <RefereeDetail
                  label="Created At"
                  value={
                    selectedReferee.created_at
                      ? new Date(selectedReferee.created_at).toLocaleString()
                      : "-"
                  }
                />
              </div>
              <div className="flex gap-4 pt-5">
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

        {showEditModal && selectedReferee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Referee</h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <RefereeForm formData={formData} onChange={handleInputChange} />
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

        {showDeleteModal && selectedReferee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Referee?</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{selectedReferee.emri}</strong>? This
                action cannot be undone.
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
function RefereeForm({ formData, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Referee Name *</label>
        <input
          type="text"
          name="emri"
          value={formData.emri}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Referee name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Surname *</label>
        <input
          type="text"
          name="mbiemri"
          value={formData.mbiemri}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Surname"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
        <input
          type="text"
          name="email"
          value={formData.email}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Email"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <input
          type="number"
          name="telefoni"
          value={formData.telefoni}
          onChange={onChange}
          min="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
        <select
          name="kategoria"
          value={formData.kategoria}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select category</option>
          <option value="FIFA">FIFA</option>
          <option value="UEFA">UEFA</option>
          <option value="Kombëtar">Kombëtar</option>
          <option value="Rajonal">Rajonal</option>
         
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nr of License *</label>
        <input          type="text"
          name="nr_licences"
          value={formData.nr_licences}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required
       /> 
          
      </div>

       <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
        <input          type="number"
          name="pervoja_vitesh"
          value={formData.pervoja_vitesh}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required
       /> 
          
      </div>
    </div>
  );
}

function RefereeDetail({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{value}</p>
    </div>
  );
}
