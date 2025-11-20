import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatAddress, formatEth } from '../../lib/web3/utils';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'ROLE_ASSIGNED' | 'ROLE_REVOKED' | 'NFT_WHITELISTED' | 'CURRENCY_ADDED' | 'FEE_WITHDRAWN' |
        'LISTING_CREATED' | 'LISTING_UPDATED' | 'LISTING_CANCELLED' | 'LISTING_BOUGHT' |
        'AUCTION_CREATED' | 'AUCTION_BID' | 'AUCTION_CANCELLED' | 'AUCTION_CLOSED' |
        'OFFER_MADE' | 'OFFER_ACCEPTED' | 'OFFER_CANCELLED';
  actor: {
    id: string;
  };
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityTableProps {
  activities: Activity[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
  const getActivityColor = (type: string): 'primary' | 'secondary' | 'success' => {
    // Admin actions
    if (type === 'ROLE_ASSIGNED') return 'success';
    if (type === 'ROLE_REVOKED') return 'secondary';
    if (type === 'NFT_WHITELISTED') return 'success';
    if (type === 'CURRENCY_ADDED') return 'success';
    if (type === 'FEE_WITHDRAWN') return 'primary';

    // Marketplace actions
    if (type.includes('CREATED') || type.includes('MADE')) return 'primary';
    if (type.includes('CANCELLED')) return 'secondary';
    if (type.includes('BOUGHT') || type.includes('ACCEPTED')) return 'success';
    return 'primary';
  };

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActivityDetails = (activity: Activity) => {
    switch (activity.type) {
      case 'ROLE_ASSIGNED':
      case 'ROLE_REVOKED':
        return `Role: ${activity.metadata?.role || 'Unknown'}`;
      case 'NFT_WHITELISTED':
        return `NFT: ${activity.metadata?.nftContract ? formatAddress(activity.metadata.nftContract as string) : 'Unknown'}`;
      case 'FEE_WITHDRAWN':
        return `${formatEth(activity.metadata?.amount as string)} ${(activity.metadata?.currency as any)?.symbol || ''}`;
      default:
        return activity.metadata?.price ? `${formatEth(activity.metadata.price as string)} ETH` : '';
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Admin Activity History</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Action
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Admin
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Time
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="text-gray-400">
                      <p className="font-medium mb-1">No admin activities recorded yet</p>
                      <p className="text-sm text-gray-500">
                        Activities will appear here when admins perform actions like:
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        <li>• Approving role requests</li>
                        <li>• Whitelisting NFT collections</li>
                        <li>• Withdrawing marketplace fees</li>
                        <li>• Managing currencies</li>
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-dark-border/50 hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Badge variant={getActivityColor(activity.type)}>
                      {formatActivityType(activity.type)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-primary-400">
                      {formatAddress(activity.actor.id)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-400">
                      {getActivityDetails(activity)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
