import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_WHITELISTED_CURRENCIES_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface WhitelistedCurrency {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  feePercentage: number;
  totalAmountFee: string;
}

export function WhitelistedCurrenciesList() {
  const [currencies, setCurrencies] = useState<WhitelistedCurrency[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCurrencies();
  }, [currentPage]);

  useEffect(() => {
    if (searchTerm) {
      filterCurrencies();
    } else {
      fetchCurrencies();
    }
  }, [searchTerm]);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const result = await graphqlClient.query(GET_WHITELISTED_CURRENCIES_QUERY, {
        limit: itemsPerPage,
        offset,
      });

      setCurrencies(result.supportedCurrencies || []);
      setTotalCount(result.supportedCurrenciesConnection?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching whitelisted currencies:', error);
      toast.error('Failed to load whitelisted currencies');
    } finally {
      setLoading(false);
    }
  };

  const filterCurrencies = () => {
    const filtered = currencies.filter(currency =>
      currency.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setCurrencies(filtered);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getCurrencyName = (currency: WhitelistedCurrency) => {
    if (currency.id.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return 'Native ETH';
    }
    return currency.name || 'Unknown';
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Whitelisted Currencies</h2>
        <p className="text-sm text-gray-400">Currencies approved for trading</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by address, symbol or name..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {currencies.length} of {totalCount} currencies
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      ) : currencies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {searchTerm ? 'No matching currencies found' : 'No whitelisted currencies'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Currency</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Symbol</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Decimals</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Fee %</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr key={currency.id} className="border-b border-dark-border hover:bg-dark-bg/50">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-white">{getCurrencyName(currency)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="info">{currency.symbol}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/address/${currency.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary-400 hover:text-primary-300"
                      >
                        {currency.id.slice(0, 10)}...{currency.id.slice(-8)}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">{currency.decimals}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">{currency.feePercentage}%</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={currency.isActive ? 'success' : 'default'}>
                        {currency.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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
