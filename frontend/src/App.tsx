import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";
import BrandLogo from "./components/BrandLogo";

const AppContent = () => {
  const { user, loading } = useAppData();

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <BrandLogo link={false} />
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-orange-400/15 border-t-orange-500" />
          <p className="mt-3 text-sm font-medium text-slate-400">
            Preparing your QuickDish experience...
          </p>
        </div>
      </div>
    );
  }

  if (user?.role === "seller") return <Restaurant />;
  if (user?.role === "rider") return <RiderDashboard />;
  if (user?.role === "admin") return <Admin />;

  return (
    <div className="cm-shell">
      <Navbar />
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/paymentsuccess/:paymentId" element={<PaymentSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/address" element={<AddAddressPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Routes>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
