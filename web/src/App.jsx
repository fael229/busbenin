import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSession } from "./contexts/SessionProvider";
import { useEffect } from "react";
import Layout from "./components/Layout";
import AdminRoute from "./components/AdminRoute";
import CompagnieRoute from "./components/CompagnieRoute";
import Home from "./pages/Home";
import Trajets from "./pages/Trajets";
import TrajetDetails from "./pages/TrajetDetails";
import Compagnies from "./pages/Compagnies";
import CompagnieDetails from "./pages/CompagnieDetails";
import Reservation from "./pages/Reservation";
import Payment from "./pages/Payment";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Reservations from "./pages/Reservations";
import Favorites from "./pages/Favorites";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTrajets from "./pages/admin/Trajets";
import AdminCompagnies from "./pages/admin/Compagnies";
import AdminReservations from "./pages/admin/AdminReservations";
import AdminUsers from "./pages/admin/Users";
import AdminDestinations from "./pages/admin/Destinations";
import CompagnieDashboard from "./pages/compagnie/Dashboard";
import CompagnieTrajets from "./pages/compagnie/Trajets";
import CompagnieReservations from "./pages/compagnie/Reservations";
import NotFound from "./pages/NotFound";
import Location from "./pages/Location";
import LocationAdd from "./pages/LocationAdd";
import LocationReservation from "./pages/LocationReservation";
import LocationPayment from "./pages/LocationPayment";
import MesVehiculesLocation from "./pages/MesVehiculesLocation";
import AdminLocation from "./pages/AdminLocation";
import Wallet from "./pages/Wallet";
import AdminWallets from "./pages/admin/Wallets";

function ProtectedRoute({ children }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    console.log("🔍 React Router pathname:", location.pathname);
    console.log("🔍 Window location:", window.location.href);
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="trajets" element={<Trajets />} />
        <Route path="trajet/:id" element={<TrajetDetails />} />
        <Route path="compagnies" element={<Compagnies />} />
        <Route path="compagnies/:id" element={<CompagnieDetails />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="location" element={<Location />} />

        {/* Routes protégées */}
        <Route
          path="location/ajouter"
          element={
            <ProtectedRoute>
              <LocationAdd />
            </ProtectedRoute>
          }
        />
        <Route
          path="location/reserver/:id"
          element={
            <ProtectedRoute>
              <LocationReservation />
            </ProtectedRoute>
          }
        />
        <Route
          path="location/payment/:id"
          element={
            <ProtectedRoute>
              <LocationPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="mes-vehicules-location"
          element={
            <ProtectedRoute>
              <MesVehiculesLocation />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/location"
          element={
            <AdminRoute>
              <AdminLocation />
            </AdminRoute>
          }
        />
        <Route
          path="reservation/:id"
          element={
            <ProtectedRoute>
              <Reservation />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="reservations"
          element={
            <ProtectedRoute>
              <Reservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/:id"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />

        {/* Routes Admin */}
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="admin/wallets"
          element={
            <AdminRoute>
              <AdminWallets />
            </AdminRoute>
          }
        />
        <Route
          path="admin/trajets"
          element={
            <AdminRoute>
              <AdminTrajets />
            </AdminRoute>
          }
        />
        <Route
          path="admin/compagnies"
          element={
            <AdminRoute>
              <AdminCompagnies />
            </AdminRoute>
          }
        />
        <Route
          path="admin/reservations"
          element={
            <AdminRoute>
              <AdminReservations />
            </AdminRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="admin/destinations"
          element={
            <AdminRoute>
              <AdminDestinations />
            </AdminRoute>
          }
        />

        {/* Routes Compagnie */}
        <Route
          path="compagnie"
          element={
            <CompagnieRoute>
              <CompagnieDashboard />
            </CompagnieRoute>
          }
        />
        <Route
          path="compagnie/trajets"
          element={
            <CompagnieRoute>
              <CompagnieTrajets />
            </CompagnieRoute>
          }
        />
        <Route
          path="compagnie/reservations"
          element={
            <CompagnieRoute>
              <CompagnieReservations />
            </CompagnieRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
