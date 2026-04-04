import { BrowserRouter, Routes, Route } from "react-router-dom";
import SportsManagment from "./pages/admin/SportsManagment";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import AdminRoute from "./components/AdminRoute";

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to the Home page!</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<AdminRoute />}>
          {/*add admin routes in this route*/}
            <Route path="/SportsManagment" element={<SportsManagment />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
