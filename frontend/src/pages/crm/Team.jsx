import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { roleLabel, roleBadgeClass } from '../../utils/roles';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { canViewTeam } = useAuth();

  useEffect(() => {
    if (!canViewTeam) return;
    api.get('/users/team')
      .then((res) => setMembers(res.data))
      .catch((err) => showApiError(err, 'Could not load team members.'))
      .finally(() => setLoading(false));
  }, [canViewTeam]);

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">View employees and their roles. Contact an admin to manage accounts.</p>
        </div>

        <div className="card">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading team...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Email</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Phone</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Role</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((u) => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-solar-100 rounded-full flex items-center justify-center text-solar-700 font-bold text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{u.name}</div>
                            {u.empCode && <span className="text-xs text-gray-400 font-mono">Code: {u.empCode}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{u.email}</td>
                      <td className="py-3 px-3 text-gray-500">{u.phone || '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`badge ${roleBadgeClass(u.role)}`}>{roleLabel(u.role)}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold ${(u.points ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {(u.points ?? 0) >= 0 ? `+${u.points ?? 0}` : u.points ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No team members found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
