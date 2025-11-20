import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_ALL_ROLE_ASSIGNMENTS_QUERY } from '../../lib/graphql/queries';
import { MANAGEMENT_ROLE_HASH } from '../../lib/web3/utils';
import toast from 'react-hot-toast';

interface Admin {
  id: string;
  assignedAt: string;
  transactionHash: string;
  subject: {
    id: string;
    name: string;
    subjectType: string;
  };
}

export function AdminList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, searchTerm]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const where: any = {
        role: { roleHash_eq: MANAGEMENT_ROLE_HASH }
      };

      if (searchTerm) {
        where.subject = { id_containsInsensitive: searchTerm };
      }

      const result = await graphqlClient.query(GET_ALL_ROLE_ASSIGNMENTS_QUERY, {
        limit: itemsPerPage,
        offset,
        where,
      });

      setAdmins(result.roleAssignments || []);
      setTotalCount(result.roleAssignmentsConnection?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admin list');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Admin List</h2>
        <p className="text-sm text-gray-400">Users with MANAGEMENT_ROLE permissions</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by address..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {admins.length} of {totalCount} admins
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {searchTerm ? 'No matching admins found' : 'No admins found'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Granted At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-dark-border hover:bg-dark-bg/50">
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/address/${admin.subject.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary-400 hover:text-primary-300"
                      >
                        {admin.subject.id}
                      </a>
                      {admin.subject.name && (
                        <p className="text-xs text-gray-500 mt-1">{admin.subject.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="secondary">{admin.subject.subjectType}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="error">MANAGEMENT_ROLE</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(admin.assignedAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${admin.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-400 hover:text-primary-300 font-mono"
                      >
                        {admin.transactionHash.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
