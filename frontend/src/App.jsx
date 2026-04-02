import { BrowserRouter, Routes, Route } from "react-router-dom";
import SportsManagment from "./pages/admin/SportsManagment";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;