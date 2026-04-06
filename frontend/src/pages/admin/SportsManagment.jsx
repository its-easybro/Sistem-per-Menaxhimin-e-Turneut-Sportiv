// Import React hooks: useEffect for side effects, useState for managing component state
import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

// This component provides a comprehensive interface for managing sports, including creating, viewing, editing, and deleting sports. It uses modals for each action to keep the UI clean and user-friendly. The component also handles loading states and errors gracefully.
export default function SportsManagment() {
  const { user, loading: authLoading } = useContext(AuthContext);

  // ===== STATE VARIABLES =====
  
  // stores the array of sports fetched from the backend API
  const [sports, setSports] = useState([]);
  
  // tracks whether the page is currently loading sports data
  const [loading, setLoading] = useState(true);
  
  // stores any error messages that occur during API calls
  const [error, setError] = useState('');
  
  // controls visibility of the Create Sport modal dialog
  const [showModal, setShowModal] = useState(false);
  
  // controls visibility of the Edit Sport modal dialog
  const [showEditModal, setShowEditModal] = useState(false);
  
  // controls visibility of the View Sport details modal dialog
  const [showViewModal, setShowViewModal] = useState(false);
  
  // controls visibility of the Delete Sport confirmation modal dialog
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // stores the currently selected sport object when viewing, editing, or deleting
  const [selectedSport, setSelectedSport] = useState(null);
  
  // stores the search query text entered by the user in the search bar
  const [searchQuery, setSearchQuery] = useState('');
  
  // stores form field values (sport name, description, number of players, type)
  const [formData, setFormData] = useState({
    emertimi: '',              // Sport name in Albanian
    pershkrimi: '',            // Description in Albanian
    numri_lojtareve: '',       // Number of players
    lloji: ''                  // Type of sport
  });

  // ===== FETCH SPORTS DATA ON COMPONENT MOUNT =====
  // This useEffect runs once when the component first loads (empty dependency array [])
  // It fetches all sports from the backend API and updates the state
  useEffect(() => {
    const loadSports = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/sports`, {
          credentials: 'include', // Send cookies along with the request
        });
        if (!response.ok) {
          throw new Error('Failed to fetch sports');
        }

        // Parse the response as JSON and extract the sports data array
        const data = await response.json();
        
        // Update the sports state with the fetched data
        setSports(data);
      } catch (err) {
        // If there's an error, store the error message in state
        setError(err.message);
      } finally {
        // After success or error, set loading to false to show the UI
        setLoading(false);
      }
    };

    // Call the async function
    loadSports();
  }, [user]);

  // ===== CREATE SPORT HANDLERS =====
  
  // Opens the Create Sport modal dialog when the "Create New Sport" button is clicked
  const handleCreate = () => {
    setShowModal(true);
  };

  // Updates the formData state as the user types in form input fields
  // Extracts the field name and value from the input element and updates formData
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value  // Update only the specific field that was changed
    }));
  };

  // Handles form submission when the user clicks the "Create" button in the modal
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    try {
      const response = await fetch(`http://localhost:5000/sports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)  // Send the form data as JSON
      });
      
      // Check if the request was successful
      if (!response.ok) throw new Error('Failed to create sport');
      
      // Parse the response to get the newly created sport with its ID
      const newSport = await response.json();
      
      // Add the new sport to the sports array in state
      setSports([...sports, newSport]);
      
      // Clear the form fields
      setFormData({ emertimi: '', pershkrimi: '', numri_lojtareve: '', lloji: '' });
      
      // Close the Create modal
      setShowModal(false);
    } catch (err) {
      // Show error message to the user
      alert('Error creating sport: ' + err.message);
    }
  };

  // Closes the Create Sports modal and resets the form
  const handleCloseModal = () => {
    setFormData({ emertimi: '', pershkrimi: '', numri_lojtareve: '', lloji: '' });
    setShowModal(false);
  };

  // ===== MODAL CLOSE HANDLERS =====
  
  // Closes the Edit modal and clears the selected sport and form data
  const handleCloseEditModal = () => {
    setFormData({ emertimi: '', pershkrimi: '', numri_lojtareve: '', lloji: '' });
    setSelectedSport(null);
    setShowEditModal(false);
  };

  // Closes the View modal and clears the selected sport
  const handleCloseViewModal = () => {
    setSelectedSport(null);
    setShowViewModal(false);
  };

  // Closes the Delete confirmation modal and clears the selected sport
  const handleCloseDeleteModal = () => {
    setSelectedSport(null);
    setShowDeleteModal(false);
  };

  // ===== VIEW/EDIT/DELETE BUTTON HANDLERS =====
  
  // Opens the View modal to display details of a specific sport
  const handleView = (id) => {
    // Find the sport with the matching ID from the sports array
    const sport = sports.find(s => s.id === id);
    
    // Set it as the selected sport to display in the modal
    setSelectedSport(sport);
    
    // Open the View modal
    setShowViewModal(true);
  };

  // Opens the Edit modal and pre-fills the form with the sport's current data
  const handleEdit = (id) => {
    // Find the sport with the matching ID
    const sport = sports.find(s => s.id === id);
    
    // Set it as the selected sport
    setSelectedSport(sport);
    
    // Pre-fill the form fields with the sport's current values
    setFormData({
      emertimi: sport.emertimi,
      pershkrimi: sport.pershkrimi,
      numri_lojtareve: sport.numri_lojtareve,
      lloji: sport.lloji
    });
    
    // Open the Edit modal
    setShowEditModal(true);
  };

  // Opens the Delete confirmation modal for a specific sport
  const handleDelete = (id) => {
    // Find the sport with the matching ID
    const sport = sports.find(s => s.id === id);
    
    // Set it as the selected sport to display in the confirmation
    setSelectedSport(sport);
    
    // Open the Delete confirmation modal
    setShowDeleteModal(true);
  };

  // ===== UPDATE/DELETE API HANDLERS =====
  
  // Handles form submission in the Edit modal when user clicks "Save Changes"
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSport) return;

    try {
      const response = await fetch(`http://localhost:5000/sports/${selectedSport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)  // Send the updated form data
      });
      
      // Check if the update was successful
      if (!response.ok) throw new Error('Failed to update sport');
      
      // Parse the response to get the updated sport data
      const updatedSport = await response.json();
      
      // Update the sports array, replacing the old sport with the updated one
      setSports(sports.map(s => s.id === updatedSport.id ? updatedSport : s));
      
      // Clear the form fields
      setFormData({ emertimi: '', pershkrimi: '', numri_lojtareve: '', lloji: '' });
      
      // Clear the selected sport
      setSelectedSport(null);
      
      // Close the Edit modal
      setShowEditModal(false);
    } catch (err) {
      // Show error message if the update fails
      alert('Error updating sport: ' + err.message);
    }
  };

  // Deletes a sport when user confirms in the Delete modal
  const handleDeleteConfirm = async () => {
    if (!selectedSport) return;

    try {
      const response = await fetch(`http://localhost:5000/sports/${selectedSport.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sport');
      }

      // Remove the deleted sport from the sports array using filter
      setSports(sports.filter(s => s.id !== selectedSport.id));
      
      // Clear the selected sport
      setSelectedSport(null);
      
      // Close the Delete confirmation modal
      setShowDeleteModal(false);
    } catch (err) {
      // Show error message if the deletion fails
      alert('Error deleting sport: ' + err.message);
    }
  };

  // ===== CONDITIONAL RENDERING FOR LOADING/ERROR STATES =====

  if (authLoading) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-gray-600">Checking access...</p>
    </div>
  );

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }
  
  // If data is still loading, show a loading message
  function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          {/* Header and Add Button Placeholder */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            {/* Search Bar Placeholder */}
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          {/* Table Placeholder */}
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

  // If an error occurred during data fetch, show an error message
  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg text-red-600">Error: {error}</p>
    </div>
  );

  // ===== MAIN COMPONENT RETURN - JSX RENDERING =====
  
  return (
    // Main container with light gray background and padding
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Centered container with max width to keep content readable */}
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER AND SEARCH SECTION */}
        <div className="mb-8">
          {/* Top row with title and Create button */}
          <div className="flex justify-between items-center mb-6">
            {/* Page title */}
            <h2 className="text-3xl font-bold text-gray-800">Sports Management</h2>
            
            {/* Create New Sport button - opens the Create modal when clicked */}
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Create New Sport
            </button>
          </div>
          
          {/* SEARCH BAR - allows users to filter sports by name */}
          <div className="relative">
            {/* Search input field that updates searchQuery state as user types */}
            <input
              type="text"
              placeholder="Search by sport name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}  // Update search state on every keystroke
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Decorative search icon (magnifying glass) */}
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

        {/* SPORTS TABLE SECTION */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* HTML table for displaying sports in a structured format */}
          <table className="w-full">
            {/* TABLE HEADER - defines column names */}
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Sport Name</th>
                <th className="px-6 py-4 text-left font-semibold">Description</th>
                <th className="px-6 py-4 text-left font-semibold">Players</th>
                <th className="px-6 py-4 text-left font-semibold">Type</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            
            {/* TABLE BODY - displays the sports data */}
            <tbody className="divide-y divide-gray-200">
              {/* 
                Filter the sports array based on the search query:
                - Convert both sport name and search query to lowercase for case-insensitive comparison
                - Only show sports whose name includes the search query text
                - Then check if there are any filtered results
              */}
              {sports.filter(s => s.emertimi.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                // If there are results, map through each sport and create a table row
                sports.filter(s => s.emertimi.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
                  // Each row represents one sport with hover effect for better UX
                  <tr key={s.id} className="hover:bg-gray-100 transition-colors duration-150">
                    {/* Display sport ID */}
                    <td className="px-6 py-4 text-gray-800">{s.id}</td>
                    
                    {/* Display sport name (Emertimi) */}
                    <td className="px-6 py-4 text-gray-800 font-medium">{s.emertimi}</td>
                    
                    {/* Display sport description (Pershkrimi) */}
                    <td className="px-6 py-4 text-gray-600">{s.pershkrimi}</td>
                    
                    {/* Display number of players (Numri Lojtareve) */}
                    <td className="px-6 py-4 text-gray-800">{s.numri_lojtareve}</td>
                    
                    {/* Display sport type (Lloji) */}
                    <td className="px-6 py-4 text-gray-800">{s.lloji}</td>
                    
                    {/* Action buttons for View, Edit, Delete */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {/* View button - opens View modal with sport details */}
                        <button
                          onClick={() => handleView(s.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        
                        {/* Edit button - opens Edit modal with pre-filled form data */}
                        <button
                          onClick={() => handleEdit(s.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        
                        {/* Delete button - opens Delete confirmation modal */}
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
                // If no results are found, show an empty state message
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-600">
                    {/* Show different message depending on whether user is searching or if no sports exist */}
                    {searchQuery ? `No sports match "${searchQuery}". Try a different search.` : 'No sports found. Click "Create New Sport" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        {/* ===== CREATE SPORT MODAL ===== */}
        {/* This modal is visible only when showModal is true (clicked Create button) */}
        {showModal && (
          // Dark overlay background to focus attention on the modal dialog
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {/* Modal dialog box - white container with rounded corners and shadow */}
            <div className="bg-white rounded-lg shadow-lg w-96 p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Sport</h3>
              
              {/* Form to collect sport information */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Sport Name Input Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}  // Update formData as user types
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Football"
                    required  // Make this field mandatory
                  />
                </div>

                {/* Description Input Field */}
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

                {/* Number of Players Input Field */}
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

                {/* Sport Type Input Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type (Lloji)
                  </label>
                  <input
                    type="text"
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Team Sport"
                    required
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {/* Create button - submits the form and creates the sport */}
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Create
                  </button>
                  
                  {/* Cancel button - closes modal without saving */}
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

        {/* ===== VIEW SPORT MODAL ===== */}
        {/* This modal is visible when showViewModal is true and a sport is selected */}
        {showViewModal && selectedSport && (
          // Dark overlay background
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {/* Modal dialog showing read-only sport details */}
            <div className="bg-white rounded-lg shadow-lg w-96 p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Sport Details</h3>
              
              {/* Read-only display of sport information */}
              <div className="space-y-4">
                {/* Sport Name - displayed as non-editable text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sport Name (Emertimi)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.emertimi}</p>
                </div>

                {/* Description - displayed as non-editable text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Pershkrimi)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.pershkrimi}</p>
                </div>

                {/* Number of Players - displayed as non-editable text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Players (Numri Lojtareve)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.numri_lojtareve}</p>
                </div>

                {/* Sport Type - displayed as non-editable text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type (Lloji)
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">{selectedSport.lloji}</p>
                </div>

                {/* Close button to dismiss the modal */}
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

        {/* ===== EDIT SPORT MODAL ===== */}
        {/* This modal is visible when showEditModal is true and a sport is selected */}
        {showEditModal && selectedSport && (
          // Dark overlay background
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {/* Modal dialog with editable form fields pre-filled with current values */}
            <div className="bg-white rounded-lg shadow-lg w-96 p-8 max-h-screen overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Sport</h3>
              
              {/* Form to edit sport information */}
              <form onSubmit={handleEditSubmit} className="space-y-4">
                
                {/* Sport Name Edit Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Name (Emertimi)
                  </label>
                  <input
                    type="text"
                    name="emertimi"
                    value={formData.emertimi}
                    onChange={handleInputChange}  // Update formData as user types
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., Football"
                    required
                  />
                </div>

                {/* Description Edit Field */}
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

                {/* Number of Players Edit Field */}
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

                {/* Sport Type Edit Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type (Lloji)
                  </label>
                  <input
                    type="text"
                    name="lloji"
                    value={formData.lloji}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g., Team Sport"
                    required
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {/* Save Changes button - submits updated data to backend */}
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Save Changes
                  </button>
                  
                  {/* Cancel button - closes modal without saving changes */}
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

        {/* ===== DELETE CONFIRMATION MODAL ===== */}
        {/* This modal is visible when showDeleteModal is true and a sport is selected */}
        {showDeleteModal && selectedSport && (
          // Dark overlay background
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {/* Modal dialog asking user to confirm deletion */}
            <div className="bg-white rounded-lg shadow-lg w-96 p-8">
              {/* Warning title in red to indicate destructive action */}
              <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Sport?</h3>
              
              {/* Confirmation message showing which sport will be deleted */}
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{selectedSport.emertimi}</strong>? This action cannot be undone.
              </p>
              
              {/* Confirmation Action Buttons */}
              <div className="flex gap-4">
                {/* Delete button - confirms deletion and calls handleDeleteConfirm */}
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>
                
                {/* Cancel button - closes modal without deleting */}
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