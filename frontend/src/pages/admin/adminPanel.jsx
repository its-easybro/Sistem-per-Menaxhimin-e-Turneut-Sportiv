import React, { useContext } from 'react'
import { Link, Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import { Users, Trophy, Settings, ArrowRight } from 'lucide-react';

  const AdminPanel = () => {
    const { user } = useContext(AuthContext);

  if (!user || !user.is_admin) {
    return <Navigate to="/" />;
  }


  const adminLinks = [
    {
      title: 'Sports Management',
      description: 'Manage the type of sports we have.',
      icon: <Trophy className="w-6 h-6 text-orange-500" />,
      to: '/sportsManagment',
      color: 'hover:border-orange-500'
    },
    {
      title: 'User Directory',
      description: 'View registered users, change roles, and manage accounts.',
      icon: <Users className="w-6 h-6 text-blue-500" />,
      to: '/users',
      color: 'hover:border-blue-500'
    },
    {
      title: 'System Settings',
      description: 'Configure site-wide preferences and security.',
      icon: <Settings className="w-6 h-6 text-slate-500" />,
      to: '/settings',
      color: 'hover:border-slate-500'
    }
  ];

  return (
    <div className="min-h-[80vh] bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">Welcome! Use the cards below to navigate the management system.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((link, index) => (
            <Link
              key={index}
              to={link.to}
              className={`group p-6 bg-gray-50 rounded-2xl border-2 border-transparent transition-all duration-300 hover:bg-white hover:shadow-xl ${link.color}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  {link.icon}
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2">{link.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
