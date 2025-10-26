import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_ALL_ROLE_ASSIGNMENTS_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface RoleAssignment {
  id: string;
  assignedAt: string;
  transactionHash: string;
  subject: {
    id: string;
    name: string;
    subjectType: string;
  };
  role: {
    id: string;
    roleName: string;
    roleHash: string;
  };
}

export function RoleAssignmentsList() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAssignments();
  }, [currentPage, searchTerm]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const where = searchTerm
        ? { subject: { id_containsInsensitive: searchTerm } }
        : {};

      const result = await graphqlClient.query(GET_ALL_ROLE_ASSIGNMENTS_QUERY, {
        limit: itemsPerPage,
        offset,
        where,
      });

      setAssignments(result.roleAssignments || []);
      setTotalCount(result.roleAssignmentsConnection?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      toast.error('Failed to load role assignments');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName.includes('MANAGEMENT')) return 'danger';
    if (roleName.includes('LISTING')) return 'success';
    if (roleName.includes('AUCTION')) return 'warning';
    if (roleName.includes('OFFER')) return 'info';
    return 'default';
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Role Assignments</h2>
        <p className="text-sm text-gray-400">View all users and their assigned roles</p>
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
        Showing {assignments.length} of {totalCount} assignments
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No role assignments found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Assigned At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-dark-border hover:bg-dark-bg/50">
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-white">
                        {assignment.subject.id.slice(0, 10)}...{assignment.subject.id.slice(-8)}
                      </p>
                      {assignment.subject.name && (
                        <p className="text-xs text-gray-500">{assignment.subject.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={getRoleBadgeVariant(assignment.role.roleName) as any}>
                        {assignment.role.roleName}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">{assignment.subject.subjectType}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(assignment.assignedAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${assignment.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-400 hover:text-primary-300 font-mono"
                      >
                        {assignment.transactionHash.slice(0, 10)}...
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
