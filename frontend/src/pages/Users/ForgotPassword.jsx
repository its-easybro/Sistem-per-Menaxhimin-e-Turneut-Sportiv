import { useState } from "react";
import api from "../../config/axiosInstance";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try{
            await api.post("/api/auth/forgot-password", { email })
            setEmail("");
            setAlert({ type: "success", message: "If that email exists, a reset link has been sent." });
        } catch (err) {
            setAlert({ type: "error", message: "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">Account access</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Forgot Password?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Enter your email and we'll send a reset link right away.</p>
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
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="your@email.com"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
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
                    Remembered it? <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}