import React, { useContext, useEffect, useState } from 'react'
import AuthContext from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import { Users, Trophy, Activity } from 'lucide-react';
import axios from 'axios';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ users: 0, sports: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, sportsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/sports`, { withCredentials: true })
        ]);
        
        const usersData = usersRes.data;
        setStats({
          users: usersData.length,
          sports: sportsRes.data.length
        });
        
        // Get 5 most recent users
        setRecentUsers(usersData.slice(-5).reverse());
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.is_admin) {
      fetchStats();
    }
  }, [user]);

  {// Render skeleton loader while fetching data */}
  function renderSkeleton() {
    return (
      <div className="max-w-6xl mx-auto w-full animate-pulse">
      <header className="mb-8">
      </header>
          {/* Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <Users size={28} />
                <div className='h-4 bg-gray-200 rounded w-16'></div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
                <Trophy size={28} />
                <div className='h-4 bg-gray-200 rounded w-16'></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
                <Activity size={28} />
                <div className='h-4 bg-gray-200 rounded w-16'></div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Large Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col min-h-[400px]">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className='bg-gray-800'>
                    <tr className="bg-gray-50 text-gray-500 text-sm">
                      <th className="px-4 py-3 font-semibold rounded-tl-lg"><div className='h-4 bg-gray-200 rounded w-10'></div></th>
                      <th className="px-4 py-3 font-semibold"><div className='h-4 bg-gray-200 rounded w-16'></div></th>
                      <th className="px-4 py-3 font-semibold"><div className='h-4 bg-gray-200 rounded w-16'></div></th>
                      <th className="px-4 py-3 font-semibold rounded-tr-lg text-right"><div className='h-4 bg-gray-200 rounded w-16'></div></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-gray-900"><div className='h-4 bg-gray-200 rounded w-16'></div></td>
                        <td className="px-4 py-4 text-gray-500"><div className='h-4 bg-gray-200 rounded w-16'></div></td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            <div className='h-4 bg-gray-200 rounded w-16'></div>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-right">
                          <div className='h-4 bg-gray-200 rounded w-16'></div>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500"><div className='h-4 bg-gray-200 rounded w-16'></div></td>
                      </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6 lg:h-[400px]">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50"></div>
              </div>
              <div className='h-4 bg-gray-200 rounded w-16'></div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white opacity-5 rounded-tl-full"></div>
                <div className="relative z-10">
                  <div className='h-4 bg-gray-200 rounded w-16'></div>
                </div>
                <button className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-slate-50 transition-colors w-max relative z-10">
                  <div className='h-4 bg-gray-200 rounded w-16'></div>
                </button>
              </div>
            </div>
            
          </div>
    </div>
    );
  }
  if(loading){
    return renderSkeleton();
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.emri || 'Admin'}. Here is your system summary.</p>
      </header>

          {/* Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <Users size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.users}</h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
                <Trophy size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Sports</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.sports}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
                <Activity size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <h3 className="text-2xl font-black text-gray-900">Online</h3>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Large Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col min-h-[400px]">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Recent Registrations
              </h2>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm">
                      <th className="px-4 py-3 font-semibold rounded-tl-lg">User</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {recentUsers.map(u => (
                      <tr key={u.id || u.email} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-gray-900">{u.username || u.emri}</td>
                        <td className="px-4 py-4 text-gray-500">{u.email}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-right">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6 lg:h-[400px]">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50"></div>
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 relative z-10">More cards for future use</h3>
                <p className="text-gray-800 font-medium text-lg relative z-10 leading-snug">
                  Bottom Text.
                </p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white flex-1 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white opacity-5 rounded-tl-full"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">more cards for future use</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Bottom Text.
                  </p>
                </div>
                <button className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-slate-50 transition-colors w-max relative z-10">
                  Button
                </button>
              </div>
            </div>   
          </div>
    </div>
    );
  };
}

export default AdminPanel;
