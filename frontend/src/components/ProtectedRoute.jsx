import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require specific roles.
 * Redirects to login if user lacks required role.
 *
 * @param {array} requiredRoles - Array of role properties to check
 * @param {ReactComponent} Layout - Layout component to wrap the route
 */
const ProtectedRoute = ({ requiredRoles = [], Layout = null }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Allow auth-only routes when no role restriction is configured.
  const hasRequiredRole =
    requiredRoles.length === 0 ||
    requiredRoles.some((role) => user?.[role] === true);

  if (!user || !hasRequiredRole) {
    return <Navigate to="/login" />;
  }

  // If a Layout component is provided, use it as a wrapper
  if (Layout) {
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  }

  // Otherwise just render the page directly
  return <Outlet />;
};

export default ProtectedRoute;
