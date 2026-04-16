import React from 'react'

export default function Example() {
    return (
        <>
            <style>{`
                @import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
            
                * {
                    font-family: "Poppins", sans-serif;
                }
            `}</style>
            <section className='relative bg-black flex flex-col md:flex-row justify-center px-4 py-20 gap-20'>
                
                <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mb-10 size-140 bg-green-500/35 rounded-full blur-[200px]'></div>
                
                <div className='text-center md:text-left mt-12'>
                    <div className="flex items-center  p-1.5 rounded-full border border-green-900 text-xs w-fit mx-auto md:mx-0">
                        <div className="flex items-center">
                            <img className="size-7 rounded-full border border-green-900" src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=50" alt="userImage1" />
                            <img className="size-7 rounded-full border border-green-900 -translate-x-2" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=50" alt="userImage2" />
                            <img className="size-7 rounded-full border border-green-900 -translate-x-4" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=50&h=50&auto=format&fit=crop" alt="userImage3" />
                        </div>
                        <p className="-translate-x-2 text-xs text-slate-200">Join community of 1m+ founders </p>
                    </div>
                    <h1 className='font-medium text-3xl md:text-5xl/15 bg-linear-to-r max-md:mx-auto from-white to-green-300 bg-clip-text text-transparent max-w-[470px] mt-4'>Ready to Transform Your Digital Experience?</h1>
                    <p className='text-sm/6 text-white max-w-[345px] mt-4 mx-auto md:mx-0'>Let our design team craft a website that elevates your brand. Book a free session today.</p> 
                </div>
                        
                <div className='w-full max-w-lg max-md:mx-auto bg-[#00A63E]/0 backdrop-blur-sm border border-white/10 rounded-xl p-8'>
                    <form className='space-y-6'>
                        <div>
                            <label className='block text-white text-sm mb-2'>Name</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Eden Johnson" 
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition'
                            />
                        </div>
            
                        <div>
                            <label className='block text-white text-sm mb-2'>Email</label>
                            <input 
                                type="email" 
                                required
                                placeholder="Eden@example.com" 
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition'
                            />
                        </div>
            
                        <div>
                            <label className='block text-white text-sm mb-2'>Message</label>
                            <textarea 
                                placeholder="Write your message here..." 
                                rows="4"
                                required
                                className='w-full bg-[#00A63E]/5 border border-white/20 rounded-lg px-4 py-3 text-white/40 placeholder:text-white/40 placeholder:text-sm focus:outline-none focus:border-green-600 transition resize-none'
                            ></textarea>
                        </div>
            
                        <div className='flex items-center justify-between'>
                            <p className='text-xs md:text-sm text-white/60 max-w-3xs'>
                                By submitting, you agree to our <span className='text-white'>Terms</span> and <span className='text-white'>Privacy Policy</span>.
                            </p>
                            <button type="submit" className='bg-linear-to-r from-green-950 to-green-600 hover:from-green-600 hover:to-green-950 text-white text-sm px-8 md:px-16 py-3 rounded-full transition duration-300 cursor-pointer'>
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
};
