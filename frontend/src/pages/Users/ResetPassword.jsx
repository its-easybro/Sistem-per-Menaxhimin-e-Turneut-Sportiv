import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../config/axiosInstance";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirm) {
            return setAlert({ type: "error", message: "Passwords do not match." });
        }

        setLoading(true);
        try {
            await api.post("/api/auth/reset-password", { token, password });
            setAlert({ type: "success", message: "Password reset! Redirecting to login..." });
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setAlert({ type: "error", message: err.response?.data?.message || "Invalid or expired link." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">Secure access</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Reset Password</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Enter your new password below.</p>
                </div>

                {alert && (
                    <div
                        className={`mb-6 rounded-2xl border px-4 py-4 text-sm text-center shadow-sm ${
                            alert.type === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                    >
                        <p className="leading-6">{alert.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={showPassword ? "Hide new password" : "Show new password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((value) => !value)}
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
