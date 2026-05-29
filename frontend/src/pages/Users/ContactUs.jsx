import { useState } from "react";
import api from "../../config/axiosInstance";
import * as yup from "yup";
import { Bug, HelpCircle, ShieldAlert, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGE_MAX_LENGTH = 500;
const SUBJECT_MAX_LENGTH = 120;

const CATEGORY_OPTIONS = [
  { value: "dispute", label: "Dispute", icon: ShieldAlert },
  { value: "upgrade", label: "Role Request", icon: UserPlus },
  { value: "bug", label: "Bug Report", icon: Bug },
  { value: "other", label: "General", icon: HelpCircle },
];

const getCategoryLabel = (value) => {
  const option = CATEGORY_OPTIONS.find((item) => item.value === value);
  return option ? option.label : "General";
};

export default function ContactUs() {
  const [formData, setFormData] = useState({
    emri: "",
    email: "",
    kategoria: "other",
    subjekti: "",
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
    kategoria: yup
      .string()
      .oneOf(["dispute", "upgrade", "bug", "other"])
      .required("Category is required"),
    subjekti: yup
      .string()
      .max(SUBJECT_MAX_LENGTH, `Subject must not exceed ${SUBJECT_MAX_LENGTH} characters`)
      .nullable(),
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
    setAlert(null);

    try {
      await validationSchema.validate(formData, { abortEarly: false });

      await api.post("/contactUs", formData);
      setFormData({ emri: "", email: "", kategoria: "other", subjekti: "", mesazhi: "" });
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
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
        * { font-family: "Poppins", sans-serif; }
      `}</style>

      <section className="relative flex flex-col justify-center gap-20 bg-gray-50 px-4 py-20 overflow-hidden md:flex-row dark:bg-slate-950">
        
        <div className="size-140 pointer-events-none fixed left-1/2 top-1/2 mb-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[200px] dark:bg-emerald-500/25"></div>

        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 mt-12 text-center md:text-left"
        >
          {/* Titulli merr ngjyra nga e zeza në emerald në light, nga e bardha në emerald në dark */}
          <h1 className="mt-4 max-w-[470px] bg-linear-to-r from-slate-900 to-emerald-600 bg-clip-text text-3xl font-medium text-transparent max-md:mx-auto md:text-5xl/15 dark:from-white dark:to-emerald-300">
            Ready to Transform Your Digital Experience?
          </h1>
          <p className="mx-auto mt-4 max-w-[345px] text-sm/6 text-slate-600 md:mx-0 dark:text-slate-300">
            Let our design team craft a website that elevates your brand. Book a free session today.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-sm max-md:mx-auto dark:border-white/10 dark:bg-slate-900/75 dark:shadow-black/20"
        >
          
          <AnimatePresence>
            {alert && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className={`overflow-hidden rounded-lg px-4 py-3 text-sm ${
                  alert.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <button
                    onClick={() => setAlert(null)}
                    className="ml-4 opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
              <input
                type="text"
                name="emri"
                value={formData.emri}
                onChange={handleInputChange}
                placeholder="Eden Johnson"
                className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errors.emri ? "border-red-500 dark:border-red-500" : "border-slate-300 dark:border-white/10"
                }`}
              />
              <AnimatePresence>
                {errors.emri && (
                   <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.emri}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = formData.kategoria === option.value;

                  return (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, kategoria: option.value }))}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                          : "border-slate-300 bg-white text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-emerald-400/50 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={14} />
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {errors.kategoria && (
                   <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.kategoria}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Subject</label>
              <input
                type="text"
                name="subjekti"
                value={formData.subjekti}
                onChange={handleInputChange}
                placeholder="Short summary of your request"
                maxLength={SUBJECT_MAX_LENGTH}
                className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errors.subjekti ? "border-red-500 dark:border-red-500" : "border-slate-300 dark:border-white/10"
                }`}
              />
              <div className="mt-2 flex items-start justify-between gap-4">
                <AnimatePresence>
                  {errors.subjekti ? (
                    <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.subjekti}</motion.p>
                  ) : (
                    <motion.p initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mt-1 text-xs text-slate-500">
                      Optional, used by the admin inbox.
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="ml-auto mt-1 text-xs text-slate-500">
                  {formData.subjekti.length}/{SUBJECT_MAX_LENGTH}
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Eden@example.com"
                className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errors.email ? "border-red-500 dark:border-red-500" : "border-slate-300 dark:border-white/10"
                }`}
              />
               <AnimatePresence>
                {errors.email && (
                   <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Message */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Message</label>
              <textarea
                placeholder="Write your message here..."
                name="mesazhi"
                value={formData.mesazhi}
                onChange={handleInputChange}
                maxLength={MESSAGE_MAX_LENGTH}
                rows="4"
                className={`w-full resize-none rounded-lg border bg-slate-50 px-4 py-3 text-slate-900 transition placeholder:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errors.mesazhi ? "border-red-500 dark:border-red-500" : "border-slate-300 dark:border-white/10"
                }`}
              ></textarea>

              <div className="mt-2 flex items-start justify-between">
                <AnimatePresence>
                  {errors.mesazhi && (
                     <motion.p initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.mesazhi}</motion.p>
                  )}
                </AnimatePresence>
                <div className="ml-auto mt-1 text-xs text-slate-500">
                  {formData.mesazhi.length}/{MESSAGE_MAX_LENGTH}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <p className="max-w-3xs text-xs text-slate-500 md:text-sm dark:text-slate-400">
                By submitting, you agree to our{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">Terms</span> and{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">Privacy Policy</span>.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="cursor-pointer rounded-full bg-linear-to-r from-emerald-500 to-teal-700 px-8 py-3 text-sm text-white transition duration-300 hover:from-emerald-400 hover:to-teal-600 disabled:opacity-70 md:px-10"
              >
                {loading ? "Sending..." : "Send Message"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </section>
    </>
  );
}