import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export const Apps = () => {
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dev/apps')
      .then(res => setApps(res.data.applications || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Applications</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your API-enabled applications.</p>
        </div>
        <Link to="/apps/new" className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all">
          <Plus size={14} /> New Application
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
        </div>
      ) : apps.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <Layers size={32} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-600">No applications</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first application to start generating API keys.</p>
          <Link to="/apps/new" className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">
            <Plus size={13} /> Create Application
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Application</th>
                <th className="text-left px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider hidden md:table-cell">Environment</th>
                <th className="text-left px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                <th className="text-left px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-wider hidden xl:table-cell">Created</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{app.applicationName}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{app.applicationId}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      app.environment === 'production' ? 'bg-blue-50 text-blue-600' :
                      app.environment === 'development' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {app.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      {app.status === 'active'
                        ? <><CheckCircle size={13} className="text-green-500" /><span className="text-xs text-green-600 font-medium">Active</span></>
                        : <><XCircle size={13} className="text-gray-400" /><span className="text-xs text-gray-400 font-medium">Inactive</span></>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 hidden xl:table-cell">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/apps/${app.applicationId}`} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 justify-end">
                      View <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Apps;
