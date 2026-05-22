import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Users, Trophy, Fingerprint, PlusCircle, Swords, CalendarPlus } from 'lucide-react';
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ users: 0, sports: 0 });
  const [sessionsCount, setSessionsCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, sportsRes, sessionsRes] = await Promise.all([
          api.get(`/users`),
          api.get(`/sports`),
          api.get(`/sessions`),
        ]);

        const usersData = usersRes.data;
        setStats({
          users: usersData.length,
          sports: sportsRes.data.length,
        });
        setSessionsCount(sessionsRes.data.length);
        setRecentUsers(usersData.slice(-8).reverse());
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.is_admin) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);


  if(loading){
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-300">Overview</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Welcome back, {user?.emri || 'Admin'}. Here is your system summary.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300">
          <div className="p-4 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors duration-300">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors duration-300">Total Users</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-slate-200 transition-colors duration-300">{stats.users}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300">
          <div className="p-4 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl transition-colors duration-300">
            <Trophy size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors duration-300">Total Sports</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-slate-200 transition-colors duration-300">{stats.sports}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors duration-300">
            <Fingerprint size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors duration-300">Active Sessions</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-slate-200 transition-colors duration-300">{sessionsCount}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 flex flex-col min-h-[400px] transition-colors duration-300">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200 mb-6 flex items-center gap-2 transition-colors duration-300">
            Recent Registrations
          </h2>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 text-sm">
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-sm">
                {recentUsers.map(u => (
                  <tr key={u.id || u.email} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors duration-300">
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-slate-200 transition-colors duration-300">{u.username || u.emri}</td>
                    <td className="px-4 py-4 text-gray-500 dark:text-slate-400 transition-colors duration-300">{u.email}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors duration-300 ${u.roli === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : u.roli === 'organizator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : u.roli === 'gjyqtar' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {u.roli || (u.is_admin ? 'admin' : 'user')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 dark:text-slate-400 text-right transition-colors duration-300">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-200 mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <Link to="/matches" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-gray-100 dark:border-slate-700 transition-colors group">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                  <Swords size={18} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white">Schedule Match</span>
              </Link>
              <Link to="/tournaments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-gray-100 dark:border-slate-700 transition-colors group">
                <div className="bg-teal-50 dark:bg-teal-500/10 p-2 rounded-lg text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-500/20 transition-colors">
                  <CalendarPlus size={18} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white">New Tournament</span>
              </Link>
              <Link to="/users" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-gray-100 dark:border-slate-700 transition-colors group">
                <div className="bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                  <PlusCircle size={18} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white">Manage Users</span>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white flex flex-col justify-between relative overflow-hidden min-h-[210px]">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white opacity-5 rounded-tl-full"></div>
            <div className="absolute top-6 right-6 flex items-center justify-center">
              <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>

            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Live Match Center</h3>
              <p className="text-slate-400 text-sm leading-relaxed pr-6">
                Monitor and update scores for currently active games in real-time.
              </p>
            </div>
            <Link to="/admin/live-matches" className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-slate-50 transition-colors w-max relative z-10 text-center">
              Open Live Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
