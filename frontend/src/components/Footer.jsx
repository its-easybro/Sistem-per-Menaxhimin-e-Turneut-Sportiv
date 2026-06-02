import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-white/10 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-auto" />
              <span className="text-xl font-bold text-white">SportScore</span>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Elevate your game with our comprehensive tournament management system. 
              Organize events, track live scores, and manage teams effortlessly.
            </p>
            {/* Social Icons */}
          <div className="flex gap-6">
            <a href="https://github.com/Erik-Jashari/Sistem-per-Menaxhimin-e-Turneut-Sportiv" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <FaGithub size={22} />
            </a>
          </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-8">
            
            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-3">
                {/* Footer links point to public pages so guests can browse without logging in. */}
                <li><Link to="/live-matches" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Live Matches</Link></li>
                <li><Link to="/public/standings" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Standings & Results</Link></li>
                <li><Link to="/brackets" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Brackets</Link></li>
                <li><Link to="/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Match Scheduling</Link></li>
                <li><Link to="/organizer/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Tournament Management</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link to="/about-us" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> About the System</Link></li>
                <li><Link to="/contact-us" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Support Center</Link></li>
                <li><Link to="/#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> Rules & Regulations</Link></li>
                <li><Link to="/#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"> FAQ</Link></li>
              </ul>
            </div>

            {/* Pages */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Pages</h3>
              <ul className="space-y-3">
                <li><Link to="/about-us" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact-us" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/live-matches" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">Live Matches</Link></li>
                <li><Link to="/brackets" className="text-sm text-gray-400 hover:text-white transition-colors">Brackets</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} SportScore. All rights reserved.
          </p>


          <div className="flex gap-6 text-sm text-gray-500">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
