import { useState } from "react";
import * as yup from "yup";
import api from "../../config/axiosInstance";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [formData, setFormData] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const validationSchema = yup.object().shape({
    email: yup
      .string()
      .email("Invalid email address")
      .required("Email is required"),
  });

  const handleChange = (e) => {
    const { value } = e.target;
    setFormData({ email: value });
    if (errors.email) {
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setAlert(null);

    try {
      await validationSchema.validate(formData, { abortEarly: false });
      setLoading(true);
      await api.post("/api/auth/forgot-password", { email: formData.email });
      setFormData({ email: "" });
      setAlert({
        type: "success",
        message: "If that email exists, a reset link has been sent.",
      });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message: err?.message || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-10 flex items-center justify-center dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-300">
            Account access
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Enter your email and we'll send a reset link right away.
          </p>
        </div>

        {alert && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-4 text-sm text-center shadow-sm ${
              alert.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
            }`}
          >
            <p className="leading-6">{alert.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 dark:bg-slate-950 dark:text-slate-100 ${
                errors.email
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700"
              }`}
            />
            {errors.email && (
              <p className="text-rose-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
