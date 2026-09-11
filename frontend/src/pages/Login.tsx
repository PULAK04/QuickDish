import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, googleClientId } from "../config";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import BrandLogo from "../components/BrandLogo";
import { BiCheckCircle, BiMapPin } from "react-icons/bi";
import { MdOutlineDeliveryDining } from "react-icons/md";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const responseGoogle = async (authResult: { code: string }) => {
    if (!authResult.code) {
      toast.error("Google sign-in did not return an authorization code.");
      return;
    }

    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult.code,
      });

      localStorage.setItem("token", result.data.token);
      setUser(result.data.user);
      setIsAuth(true);
      toast.success("Welcome to QuickDish");
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Could not sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: () => toast.error("Google sign-in was cancelled or failed."),
    flow: "auth-code",
  });

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      toast.error("Add VITE_GOOGLE_CLIENT_ID to frontend/.env first.");
      return;
    }
    googleLogin();
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <section className="relative hidden min-h-[590px] overflow-hidden rounded-[2.25rem] bg-[#0a0d12] p-10 text-white shadow-2xl lg:block">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange-500/100/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-14 h-72 w-72 rounded-full bg-rose-500/100/20 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <BrandLogo link={false} />
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-[#171c24]/10 px-3 py-1.5 text-xs font-semibold text-orange-100">
              Food that finds you
            </span>
            <h1 className="mt-5 max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.055em]">
              Your next favourite meal is closer than you think.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              One account for ordering, restaurant management, and delivery partner workflows—with secure payments and live tracking built in.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Nearby", "restaurants", <BiMapPin key="map" />],
              ["Secure", "checkout", <BiCheckCircle key="check" />],
              ["Live", "delivery", <MdOutlineDeliveryDining key="delivery" />],
            ].map(([title, subtitle, icon]) => (
              <div key={String(title)} className="rounded-2xl border border-white/10 bg-[#171c24]/[0.06] p-4">
                <span className="text-xl text-orange-300">{icon}</span>
                <p className="mt-3 text-sm font-bold">{title}</p>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md">
        <div className="cm-card p-6 sm:p-8">
          <div className="lg:hidden">
            <BrandLogo link={false} />
          </div>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-orange-500 lg:mt-0">
            Welcome
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-100">
            Sign in to QuickDish
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Continue with Google. New users can choose whether they want to order food, run a restaurant, or deliver orders.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#171c24] px-4 py-3.5 text-sm font-bold text-slate-300 shadow-sm transition hover:border-orange-200 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FcGoogle size={22} />
            {loading ? "Signing you in..." : "Continue with Google"}
          </button>

          <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-[#222b36]" />
            secure sign-in
            <span className="h-px flex-1 bg-[#222b36]" />
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            By continuing, you agree to QuickDish’s Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Login;
