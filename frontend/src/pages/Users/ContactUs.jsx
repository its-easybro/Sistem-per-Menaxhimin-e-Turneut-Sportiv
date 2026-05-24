import { useState } from "react";
import api from "../../config/axiosInstance";
import * as yup from "yup";

const MESSAGE_MAX_LENGTH = 500;

export default function ContactUs() {
  const [formData, setFormData] = useState({
    emri: "",
    email: "",
    mesazhi: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const validationSchema = yup.object().shape({
    emri: yup
      .string()
      .min(3, "Name must be at least 3 characters")
      .required("Name is required"),
    email: yup
      .string()
      .email("Invalid email address")
      .required("Email is required"),
    mesazhi: yup
      .string()
      .min(10, "Message must be at least 10 characters")
      .max(
        MESSAGE_MAX_LENGTH,
        `Message must not exceed ${MESSAGE_MAX_LENGTH} characters`,
      )
      .required("Message is required"),
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await validationSchema.validate(formData, { abortEarly: false });

      await api.post("/contactUs", formData);
      setFormData({ emri: "", email: "", mesazhi: "" });
      setAlert({
        type: "success",
        message: "Message sent successfully! We'll get back to you soon.",
      });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message: "Failed to send message. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Loads Poppins font styling for this page section. */}
      <style>{`
                @import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
            
                * {
                    font-family: "Poppins", sans-serif;
                }
            `}</style>
      {/* Main contact section with intro content and form panel. */}
      <section className="relative flex flex-col justify-center gap-20 bg-slate-950 px-4 py-20 md:flex-row">
        {/* Decorative background glow to add depth behind content. */}
        <div className="fixed top-1/2 left-1/2 mb-10 size-140 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full bg-emerald-500/25 blur-[200px]"></div>

        {/* Left side call-to-action and social proof visuals. */}
        <div className="text-center md:text-left mt-12">
          <h1 className="font-medium text-3xl md:text-5xl/15 bg-linear-to-r max-md:mx-auto from-white to-emerald-300 bg-clip-text text-transparent max-w-[470px] mt-4">
            Ready to Transform Your Digital Experience?
          </h1>
          <p className="text-sm/6 text-slate-300 max-w-[345px] mt-4 mx-auto md:mx-0">
            Let our design team craft a website that elevates your brand. Book a
            free session today.
          </p>
        </div>

        {/* Right side contact form for collecting user details and message. */}
        <div className="w-full max-w-lg max-md:mx-auto rounded-xl border border-white/10 bg-slate-900/75 p-8 backdrop-blur-sm shadow-2xl shadow-black/20">
          {/* Alert */}
          {alert && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm ${
                alert.type === "success"
                  ? "bg-emerald-500/15 border border-emerald-400/30 text-emerald-200"
                  : "bg-rose-500/15 border border-rose-400/30 text-rose-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{alert.message}</span>
                <button
                  onClick={() => setAlert(null)}
                  className="ml-4 opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm mb-2 text-slate-200">Name</label>
              <input
                type="text"
                name="emri"
                value={formData.emri}
                onChange={handleInputChange}
                placeholder="Eden Johnson"
                className={`w-full rounded-lg border bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 transition ${errors.emri ? "border-red-500" : "border-white/10"}`}
              />
              {errors.emri && (
                <p className="text-red-400 text-xs mt-1">{errors.emri}</p>
              )}
            </div>

            {/* --- EMAIL FIELD --- */}
            <div>
              <label className="block text-sm mb-2 text-slate-200">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Eden@example.com"
                className={`w-full rounded-lg border bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 transition ${errors.email ? "border-red-500" : "border-white/10"}`}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* --- MESSAGE FIELD --- */}
            <div>
              <label className="block text-sm mb-2 text-slate-200">Message</label>
              <textarea
                placeholder="Write your message here..."
                name="mesazhi"
                value={formData.mesazhi}
                onChange={handleInputChange}
                maxLength={MESSAGE_MAX_LENGTH}
                rows="4"
                className={`w-full rounded-lg border bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 transition resize-none ${errors.mesazhi ? "border-red-500" : "border-white/10"}`}
              ></textarea>

              <div className="mt-2 flex items-start justify-between">
                {errors.mesazhi && (
                  <p className="text-red-400 text-xs mt-1">{errors.mesazhi}</p>
                )}

                <div className="ml-auto text-xs text-slate-500 mt-1">
                  {formData.mesazhi.length}/{MESSAGE_MAX_LENGTH}
                </div>
              </div>
            </div>

            {/* --- SUBMIT BUTTON --- */}
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-slate-400 max-w-3xs">
                By submitting, you agree to our{" "}
                <span className="text-slate-100">Terms</span> and{" "}
                <span className="text-slate-100">Privacy Policy</span>.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="bg-linear-to-r from-emerald-600 to-slate-800 hover:from-emerald-500 hover:to-slate-900 text-white text-sm px-8 md:px-16 py-3 rounded-full transition duration-300 cursor-pointer"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
