import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatAddress, formatEth } from '../../lib/web3/utils';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'LISTING_CREATED' | 'LISTING_UPDATED' | 'LISTING_CANCELLED' | 'LISTING_BOUGHT' |
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
    if (type.includes('CREATED') || type.includes('MADE')) return 'primary';
    if (type.includes('CANCELLED')) return 'secondary';
    if (type.includes('BOUGHT') || type.includes('ACCEPTED')) return 'success';
    return 'primary';
  };

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Type
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Actor
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
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  No recent activity
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
                      {activity.metadata?.price && `${formatEth(activity.metadata.price)} ETH`}
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
