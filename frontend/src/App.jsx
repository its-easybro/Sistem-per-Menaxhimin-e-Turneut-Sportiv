import { BrowserRouter, Routes, Route } from "react-router-dom";
import SportsManagment from "./pages/admin/SportsManagment";
import Login from "./pages/Login";
import Register from "./pages/Register";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/SportsManagment" element={<SportsManagment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
