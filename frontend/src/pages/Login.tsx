import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  authService,
  googleClientId,
} from "../config";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { useAppData } from "../context/AppContext";
import BrandLogo from "../components/BrandLogo";
import {
  BiCheckCircle,
  BiMapPin,
} from "react-icons/bi";
import {
  MdOutlineDeliveryDining,
} from "react-icons/md";

type AuthMode = "login" | "register";

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string | null;
}

const Login = () => {
  const navigate = useNavigate();

  const {
    setUser,
    setIsAuth,
  } = useAppData();

  const [mode, setMode] =
    useState<AuthMode>("login");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleModeChange = (
    nextMode: AuthMode
  ) => {
    setMode(nextMode);

    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleEmailAuth = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const name =
      form.name.trim();

    const email =
      form.email.trim().toLowerCase();

    const password =
      form.password;

    const confirmPassword =
      form.confirmPassword;

    if (mode === "register") {
      if (!name) {
        toast.error(
          "Please enter your name."
        );
        return;
      }

      if (!email) {
        toast.error(
          "Please enter your email."
        );
        return;
      }

      if (!password) {
        toast.error(
          "Please enter a password."
        );
        return;
      }

      if (
        password.length < 8
      ) {
        toast.error(
          "Password must be at least 8 characters."
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        toast.error(
          "Passwords do not match."
        );
        return;
      }
    } else {
      if (!email) {
        toast.error(
          "Please enter your email."
        );
        return;
      }

      if (!password) {
        toast.error(
          "Please enter your password."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "register"
          ? "/api/auth/register"
          : "/api/auth/email-login";

      const payload =
        mode === "register"
          ? {
            name,
            email,
            password,
          }
          : {
            email,
            password,
          };

      const { data } =
        await axios.post(
          `${authService}${endpoint}`,
          payload
        );

      localStorage.setItem(
        "token",
        data.token
      );

      setUser(
        data.user as AuthUser
      );

      setIsAuth(true);

      toast.success(
        mode === "register"
          ? "Account created successfully!"
          : "Welcome back to QuickDish!"
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Email authentication error:",
        error
      );

      if (
        axios.isAxiosError(error)
      ) {
        const message =
          error.response?.data
            ?.message;

        toast.error(
          message ||
          "Authentication failed. Please try again."
        );
      } else {
        toast.error(
          "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const responseGoogle = async (
    authResult: {
      code: string;
    }
  ) => {
    if (!authResult.code) {
      toast.error(
        "Google sign-in did not return an authorization code."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await axios.post(
          `${authService}/api/auth/login`,
          {
            code: authResult.code,
          }
        );

      localStorage.setItem(
        "token",
        result.data.token
      );

      setUser(
        result.data.user as AuthUser
      );

      setIsAuth(true);

      toast.success(
        "Welcome to QuickDish!"
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Google authentication error:",
        error
      );

      if (
        axios.isAxiosError(error)
      ) {
        toast.error(
          error.response?.data
            ?.message ||
          "Could not sign you in with Google."
        );
      } else {
        toast.error(
          "Could not sign you in with Google."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const googleLogin =
    useGoogleLogin({
      onSuccess: responseGoogle,
      onError: () =>
        toast.error(
          "Google sign-in was cancelled or failed."
        ),
      flow: "auth-code",
    });

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      toast.error(
        "Add VITE_GOOGLE_CLIENT_ID to frontend/.env first."
      );
      return;
    }

    googleLogin();
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <section className="relative hidden min-h-[650px] overflow-hidden rounded-[2.25rem] bg-[#0a0d12] p-10 text-white shadow-2xl lg:block">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange-500/25 blur-3xl" />

        <div className="absolute -bottom-24 -left-14 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <BrandLogo link={false} />

          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-orange-100">
              Food that finds you
            </span>

            <h1 className="mt-5 max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.055em]">
              Your next favourite meal is closer than you think.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              One account for ordering,
              restaurant management, and
              delivery partner workflows —
              with secure payments and
              live tracking built in.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              [
                "Nearby",
                "restaurants",
                <BiMapPin key="map" />,
              ],
              [
                "Secure",
                "checkout",
                <BiCheckCircle key="check" />,
              ],
              [
                "Live",
                "delivery",
                <MdOutlineDeliveryDining key="delivery" />,
              ],
            ].map(
              ([
                title,
                subtitle,
                icon,
              ]) => (
                <div
                  key={String(title)}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <span className="text-xl text-orange-300">
                    {icon}
                  </span>

                  <p className="mt-3 text-sm font-bold">
                    {title}
                  </p>

                  <p className="text-xs text-slate-400">
                    {subtitle}
                  </p>
                </div>
              )
            )}
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
            {mode === "login"
              ? "Sign in to QuickDish"
              : "Create your QuickDish account"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {mode === "login"
              ? "Sign in with Google or use your email and password."
              : "Create an account using your name, email, and password."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#141A22] p-1">
            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  "login"
                )
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${mode === "login"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  "register"
                )
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${mode === "register"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                }`}
            >
              Create Account
            </button>
          </div>

          <form
            onSubmit={handleEmailAuth}
            className="mt-6 space-y-4"
          >
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                  Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-[#141A22] px-4 py-3.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-[#141A22] px-4 py-3.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={
                    form.password
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter your password"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-[#141A22] px-4 py-3.5 pr-12 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (prev) =>
                        !prev
                    )
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-300">
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={
                      form.confirmPassword
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-2xl border border-white/10 bg-[#141A22] px-4 py-3.5 pr-12 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) =>
                          !prev
                      )
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="h-5 w-5" />
                    ) : (
                      <FiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cm-primary w-full !rounded-2xl !py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-[#222b36]" />
            OR
            <span className="h-px flex-1 bg-[#222b36]" />
          </div>

          <button
            type="button"
            onClick={
              handleGoogleLogin
            }
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#171c24] px-4 py-3.5 text-sm font-bold text-slate-300 shadow-sm transition hover:border-orange-200 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FcGoogle size={22} />

            {loading
              ? "Please wait..."
              : "Continue with Google"}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      "register"
                    )
                  }
                  className="font-bold text-orange-500 hover:text-orange-400"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      "login"
                    )
                  }
                  className="font-bold text-orange-500 hover:text-orange-400"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to
            QuickDish's Terms of Service
            and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Login;