import { useState } from "react";
import api from "../../config/axiosInstance"

const MESSAGE_MAX_LENGTH = 500;

export default function ContactUs() {
    const [formData, setFormData] = useState({ emri: "", email: "", mesazhi: "" })
    const [loading, setLoading] = useState(false)
    const [alert, setAlert] = useState(null)
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true)
        
        try{
            await api.post("/contactUs", formData)
            setFormData({ emri: "",  email: "", mesazhi: ""})
            setAlert({ type: "success", message: "Message sent successfully! We'll get back to you soon." });
        } catch {
            setAlert({ type: "error", message: "Failed to send message. Please try again." });
        } finally {
            setLoading(false);
        }
    }

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
            <section className='relative bg-black flex flex-col md:flex-row justify-center px-4 py-20 gap-20'>
                
                {/* Decorative background glow to add depth behind content. */}
                <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mb-10 size-140 bg-green-500/35 rounded-full blur-[200px]'></div>
                
                {/* Left side call-to-action and social proof visuals. */}
                <div className='text-center md:text-left mt-12'>
                    <h1 className='font-medium text-3xl md:text-5xl/15 bg-linear-to-r max-md:mx-auto from-white to-green-300 bg-clip-text text-transparent max-w-[470px] mt-4'>Ready to Transform Your Digital Experience?</h1>
                    <p className='text-sm/6 text-white max-w-[345px] mt-4 mx-auto md:mx-0'>Let our design team craft a website that elevates your brand. Book a free session today.</p> 
                </div>
                        
                {/* Right side contact form for collecting user details and message. */}
                <div className='w-full max-w-lg max-md:mx-auto bg-[#00A63E]/0 backdrop-blur-sm border border-white/10 rounded-xl p-8'>

                {/* Alert */}
                    {alert && (
                        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${alert.type === "success"
                                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                                : "bg-red-500/20 border border-red-500/40 text-red-300"
                            }`}>
                            <div className="flex justify-between items-center">
                                <span>{alert.message}</span>
                                <button onClick={() => setAlert(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
                            </div>
                        </div>
                    )}

                    <form className='space-y-6' onSubmit={handleSubmit}>
                        <div>
                            <label className='block text-white text-sm mb-2'>Name</label>
                            <input 
                                type="text" 
                                name="emri"
                                value={formData.emri}
                                onChange={handleInputChange}
                                required
                                placeholder="Eden Johnson" 
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition'
                            />
                        </div>
            
                        <div>
                            <label className='block text-white text-sm mb-2'>Email</label>
                            <input 
                                type="email" 
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="Eden@example.com" 
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition'
                            />
                        </div>
            
                        <div>
                            <label className='block text-white text-sm mb-2'>Message</label>
                            <textarea 
                                placeholder="Write your message here..." 
                                name="mesazhi"
                                value={formData.mesazhi}
                                onChange={handleInputChange}
                                maxLength={MESSAGE_MAX_LENGTH}
                                rows="4"
                                required
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition resize-none'
                            ></textarea>
                            <div className="mt-2 text-right text-xs text-white/50">
                                {formData.mesazhi.length}/{MESSAGE_MAX_LENGTH}
                            </div>
                        </div>
            
                        <div className='flex items-center justify-between'>
                            <p className='text-xs md:text-sm text-white/60 max-w-3xs'>
                                By submitting, you agree to our <span className='text-white'>Terms</span> and <span className='text-white'>Privacy Policy</span>.
                            </p>
                            <button type="submit" disabled={loading} className='bg-linear-to-r from-green-950 to-green-600 hover:from-green-600 hover:to-green-950 text-white text-sm px-8 md:px-16 py-3 rounded-full transition duration-300 cursor-pointer'>
                                {loading ? "Sending..." : "Send Message"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
};
