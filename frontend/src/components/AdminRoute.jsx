import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const AdminRoute = () => {
  const { user } = useContext(AuthContext);
  
  return user && user.is_admin ? <Outlet /> : <Navigate to="/login" />;
};

export default AdminRoute;