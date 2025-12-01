import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Listing } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { formatEth } from '../../lib/web3/utils';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { useUSDCBalance } from '../../hooks/useUSDCBalance';
import { getBrowserProvider } from '../../lib/web3/provider';
import { encodeBuyFromListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS, ROUTER_ADDRESS } from '../../lib/contracts/addresses';
import { USDC_ADDRESS } from '../../lib/constants';
import { truncate } from '../../lib/utils/format';
import { checkERC20Allowance, approveERC20 } from '../../lib/web3/approve';
import { ERC20_ABI } from '../../lib/contracts/abis';
import toast from 'react-hot-toast';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: () => void;
}

export function BuyModal({ isOpen, onClose, listing, onSuccess }: BuyModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address, balance } = useWallet();
  const { usdcBalance, refetch: refetchUSDC } = useUSDCBalance();
  const [quantity, setQuantity] = useState('1');
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState(0);
  const [isApprovingToken, setIsApprovingToken] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<string>('0');

  // Check if listing has approved currencies
  const hasApprovedCurrencies = listing.currencyApprovals && listing.currencyApprovals.length > 0;

  // Parse values - keep quantity as decimal for UI display
  const maxQuantity = parseFloat(listing.quantity);
  const quantityNum = parseFloat(quantity || '0');

  // For contract call, convert to integer
  const selectedQuantityForContract = BigInt(Math.floor(quantityNum));

  // Get currency and price from selected currencyApproval
  let currencyAddress = ZERO_ADDRESS; // Contract uses address(0) for native ETH
  let pricePerToken = BigInt(listing.pricePerToken);
  let displaySymbol = 'ETH'; // Default display symbol

  if (hasApprovedCurrencies) {
    // Use the selected approved currency
    const approvedCurrency = listing.currencyApprovals?.[selectedCurrencyIndex];
    if (approvedCurrency) {
      const dbCurrencyAddress = approvedCurrency.currency.id.toLowerCase();

      // Normalize: Both 0x0000...0000 and 0xEeee...EEeE represent native ETH
      // Always use 0x0000...0000 (ZERO_ADDRESS) for contract calls
      const isNativeToken = dbCurrencyAddress === ZERO_ADDRESS.toLowerCase() ||
                            dbCurrencyAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      currencyAddress = isNativeToken ? ZERO_ADDRESS : approvedCurrency.currency.id;
      pricePerToken = BigInt(approvedCurrency.pricePerToken);

      // Display symbol: Show 'ETH' for native tokens or UNKNOWN symbols
      displaySymbol = (isNativeToken || approvedCurrency.currency.symbol === 'UNKNOWN')
        ? 'ETH'
        : approvedCurrency.currency.symbol;
    }
  }

  // Calculate total price for display (with correct decimals)
  const totalPriceDisplay = (() => {
    const isNativeToken = currencyAddress === ZERO_ADDRESS;
    if (isNativeToken) {
      return pricePerToken * selectedQuantityForContract;
    } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
      // Use same logic as formatUSDCFromLegacy for consistency
      console.log('BuyModal USDC price conversion:', {
        input: pricePerToken.toString(),
        isLarge: pricePerToken >= BigInt('1000000000000000000')
      });
      
      // If number is very large (18+ digits), convert from 18-decimal to 6-decimal
      if (pricePerToken >= BigInt('1000000000000000000')) { // 1e18
        const usdcPrice = pricePerToken / BigInt(10**12);
        return usdcPrice * selectedQuantityForContract;
      }
      
      // If it's exactly divisible by 10^12 and result > 0, convert
      if (pricePerToken % BigInt(10**12) === 0n && pricePerToken >= BigInt(10**12)) {
        const usdcPrice = pricePerToken / BigInt(10**12);
        return usdcPrice * selectedQuantityForContract;
      }
      
      // Otherwise assume it's already in 6-decimal format
      return pricePerToken * selectedQuantityForContract;
    } else {
      return pricePerToken * selectedQuantityForContract;
    }
  })();

  // Calculate total price for contract (always in original storage format)
  const totalPriceContract = pricePerToken * selectedQuantityForContract;

  // Fetch balance when currency changes
  useEffect(() => {
    if (!address) return;

    const fetchBalance = async () => {
      try {
        const isNativeToken = currencyAddress === ZERO_ADDRESS;
        
        if (isNativeToken) {
          // Use ETH balance from wallet
          setCurrentBalance(balance || '0');
        } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
          // Use USDC balance from hook
          setCurrentBalance(usdcBalance || '0');
        } else {
          // Fetch other ERC20 balance
          const provider = getBrowserProvider();
          if (!provider) return;

          const contract = new ethers.Contract(currencyAddress, ERC20_ABI, provider);
          const tokenBalance = await contract.balanceOf(address);
          const decimals = await contract.decimals();
          const formatted = ethers.formatUnits(tokenBalance, decimals);
          setCurrentBalance(formatted);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        setCurrentBalance('0');
      }
    };

    fetchBalance();
  }, [currencyAddress, balance, usdcBalance, address]);

  // Check if user has sufficient balance
  const balanceNum = parseFloat(currentBalance);
  
  // Format total price with correct decimals based on currency
  const totalPriceNum = (() => {
    const isNativeToken = currencyAddress === ZERO_ADDRESS;
    if (isNativeToken) {
      return parseFloat(ethers.formatEther(totalPriceDisplay));
    } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
      // totalPriceDisplay is already in 6-decimal format
      return parseFloat(ethers.formatUnits(totalPriceDisplay, 6));
    } else {
      // Default to 18 decimals for other ERC20 tokens
      return parseFloat(ethers.formatEther(totalPriceDisplay));
    }
  })();
  
  const hasSufficientBalance = balanceNum >= totalPriceNum;

  const handleBuy = async () => {
    try {
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      // Validation: must buy at least 1 item after rounding down
      if (selectedQuantityForContract < 1n) {
        toast.error('Quantity must be at least 1.0 (will be rounded down to 1)');
        return;
      }

      if (quantityNum > maxQuantity) {
        toast.error(`Maximum quantity is ${maxQuantity}`);
        return;
      }

      // Check sufficient balance
      if (!hasSufficientBalance) {
        toast.error(`Insufficient ${displaySymbol} balance`);
        return;
      }

      // Check if currency is ERC20 (not native ETH)
      const isNativeToken = currencyAddress === ZERO_ADDRESS;

      // If ERC20, check and request approval if needed
      if (!isNativeToken) {
        console.log('ERC20 token detected, checking allowance...');
        setIsApprovingToken(true);

        try {
          const { hasAllowance, currentAllowance } = await checkERC20Allowance(
            currencyAddress,
            address,
            ROUTER_ADDRESS,
            totalPriceContract
          );

          console.log(`Current allowance: ${currentAllowance}, Required: ${totalPriceContract}`);

          if (!hasAllowance) {
            toast.loading('Approving token...', { id: 'approval' });

            // Request approval
            const approved = await approveERC20(currencyAddress, ROUTER_ADDRESS);

            if (!approved) {
              toast.error('Token approval failed', { id: 'approval' });
              setIsApprovingToken(false);
              return;
            }

            toast.success('Token approved successfully!', { id: 'approval' });
          }
        } catch (error: unknown) {
          console.error('Approval error:', error);
          if (error instanceof Error && error.message === 'User rejected approval') {
            toast.error('You rejected the token approval', { id: 'approval' });
          } else {
            toast.error('Failed to approve token', { id: 'approval' });
          }
          setIsApprovingToken(false);
          return;
        } finally {
          setIsApprovingToken(false);
        }
      }

      // Proceed with purchase
      const tx = encodeBuyFromListing(
        BigInt(listing.id), // listing.id is the listingId from contract
        address, // Buy for connected wallet (buyer), not seller!
        selectedQuantityForContract, // Use integer quantity for contract
        currencyAddress,
        totalPriceContract // Use original 18-decimal format for contract
      );

      await sendTransaction(tx, 'Purchase successful!');
    } catch (error: unknown) {
      console.error('Buy error:', error);
    }
  };

  return (
    <>
      {/* Buy Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Buy NFT">
        {!hasApprovedCurrencies ? (
            <div className="space-y-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-red-400 font-semibold mb-2">Cannot Purchase This Listing</p>
                    <p className="text-gray-300 text-sm">
                      This listing has no approved currencies yet. The listing owner needs to approve at least one currency (e.g., ETH) before buyers can purchase.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Owner action required: Call <code className="bg-dark-bg px-1 py-0.5 rounded">approveCurrencyForListing</code>
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={onClose} variant="secondary" fullWidth>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
            {/* ERC20 Info Banner */}
            {currencyAddress !== ZERO_ADDRESS && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-400 font-semibold mb-1">ERC20 Token Payment</p>
                    <p className="text-gray-300 text-xs">
                      You&apos;ll need to approve the {displaySymbol} token before purchasing. This is a one-time approval that allows the marketplace to transfer tokens on your behalf.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
              {/* Currency Selector - Only show if multiple currencies available */}
              {listing.currencyApprovals && listing.currencyApprovals.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Payment Currency
                  </label>
                  <select
                    value={selectedCurrencyIndex}
                    onChange={(e) => setSelectedCurrencyIndex(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    {listing.currencyApprovals.map((approval, index) => {
                      const isNative = approval.currency.id.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                                      approval.currency.id.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                      const symbol = isNative ? 'ETH' : approval.currency.symbol;
                      const formatPrice = () => {
                        if (isNative) {
                          return formatEth(BigInt(approval.pricePerToken));
                        } else if (approval.currency.id.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
                          // Use same logic as formatUSDCFromLegacy
                          const priceBI = BigInt(approval.pricePerToken);
                          if (priceBI >= BigInt('1000000000000000000')) { // 1e18
                            const usdcPrice = priceBI / BigInt(10**12);
                            return ethers.formatUnits(usdcPrice, 6);
                          }
                          
                          if (priceBI % BigInt(10**12) === 0n && priceBI >= BigInt(10**12)) {
                            const usdcPrice = priceBI / BigInt(10**12);
                            return ethers.formatUnits(usdcPrice, 6);
                          }
                          
                          // Already in 6-decimal format
                          return ethers.formatUnits(priceBI, 6);
                        } else {
                          return formatEth(BigInt(approval.pricePerToken));
                        }
                      };
                      return (
                        <option key={index} value={index}>
                          {symbol} - {formatPrice()} per token
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Address: {truncate(listing.currencyApprovals[selectedCurrencyIndex].currency.id)}
                  </p>
                </div>
              )}

              {/* Balance Display */}
              <div className="bg-dark-card rounded-lg p-3 mb-4 border border-dark-border">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Your Balance</span>
                  <span className={`font-semibold ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                    {currentBalance} {displaySymbol}
                  </span>
                </div>
                {!hasSufficientBalance && (
                  <p className="text-red-400 text-xs mt-1">
                    ⚠ Insufficient balance for this purchase
                  </p>
                )}
              </div>

              <div className="bg-dark-card rounded-lg p-3 mb-4 border border-dark-border">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Price per Token</span>
                  <span className="text-white font-bold text-lg">
                    {(() => {
                      const isNativeToken = currencyAddress === ZERO_ADDRESS;
                      if (isNativeToken) {
                        return formatEth(pricePerToken);
                      } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
                        // Use same logic as formatUSDCFromLegacy
                        if (pricePerToken >= BigInt('1000000000000000000')) { // 1e18
                          const usdcPrice = pricePerToken / BigInt(10**12);
                          return ethers.formatUnits(usdcPrice, 6);
                        }
                        
                        if (pricePerToken % BigInt(10**12) === 0n && pricePerToken >= BigInt(10**12)) {
                          const usdcPrice = pricePerToken / BigInt(10**12);
                          return ethers.formatUnits(usdcPrice, 6);
                        }
                        
                        // Already in 6-decimal format
                        return ethers.formatUnits(pricePerToken, 6);
                      } else {
                        return formatEth(pricePerToken);
                      }
                    })()} {displaySymbol}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Quantity (Max: {maxQuantity})
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Enter quantity (e.g., 1.5, 2.3)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {quantityNum >= 1 ? (
                    <>Contract will buy: <span className="font-semibold">{Math.floor(quantityNum)}</span> items (rounded down)</>
                  ) : (
                    <span className="text-red-400">⚠ Must be at least 1.0</span>
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-dark-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-400">Total Price</span>
                  <span className="text-2xl font-bold text-primary-400">
                    {(() => {
                      const isNativeToken = currencyAddress === ZERO_ADDRESS;
                      if (isNativeToken) {
                        return formatEth(totalPriceDisplay);
                      } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
                        // totalPriceDisplay is already converted to 6-decimal format
                        return ethers.formatUnits(totalPriceDisplay, 6);
                      } else {
                        return formatEth(totalPriceDisplay);
                      }
                    })()} {displaySymbol}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500">
                    {Math.floor(quantityNum)} × {(() => {
                      const isNativeToken = currencyAddress === ZERO_ADDRESS;
                      if (isNativeToken) {
                        return formatEth(pricePerToken);
                      } else if (currencyAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
                        // Use same logic as formatUSDCFromLegacy
                        if (pricePerToken >= BigInt('1000000000000000000')) { // 1e18
                          const usdcPrice = pricePerToken / BigInt(10**12);
                          return ethers.formatUnits(usdcPrice, 6);
                        }
                        
                        if (pricePerToken % BigInt(10**12) === 0n && pricePerToken >= BigInt(10**12)) {
                          const usdcPrice = pricePerToken / BigInt(10**12);
                          return ethers.formatUnits(usdcPrice, 6);
                        }
                        
                        // Already in 6-decimal format
                        return ethers.formatUnits(pricePerToken, 6);
                      } else {
                        return formatEth(pricePerToken);
                      }
                    })()}
                  </p>
                  {hasApprovedCurrencies && (
                    <p className="text-xs text-gray-400">
                      Paying with: <span className="font-semibold">{displaySymbol}</span>
                      <br />
                      <span className="text-gray-600">{truncate(currencyAddress)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={onClose} variant="secondary" fullWidth disabled={isLoading || isApprovingToken}>
                Cancel
              </Button>
              <Button onClick={handleBuy} variant="primary" fullWidth isLoading={isLoading || isApprovingToken}>
                {isApprovingToken ? 'Approving Token...' : 'Confirm Purchase'}
              </Button>
            </div>
          </div>
          )}
      </Modal>

      {/* Transaction Result Modal - shown independently after closing buy modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            onClose(); // Close the buy modal FIRST to prevent re-mount
            closeModal(); // Then close result modal
            if (result.success) {
              onSuccess?.();
            }
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </>
  );
}
