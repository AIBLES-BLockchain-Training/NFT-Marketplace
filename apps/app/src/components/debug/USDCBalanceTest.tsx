import React from 'react';
import { useUSDCBalance } from '../../hooks/useUSDCBalance';
import { useWallet } from '../../hooks/useWallet';

export function USDCBalanceTest() {
  const { address, isConnected } = useWallet();
  const { usdcBalance, isLoading, error, refetch } = useUSDCBalance();

  if (!isConnected) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-lg mb-2">USDC Balance Test</h3>
        <p>Please connect your wallet first</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold text-lg mb-2">USDC Balance Test</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Wallet Address:</strong><br />
          <code className="text-xs bg-gray-200 p-1 rounded">{address}</code>
        </div>
        
        <div>
          <strong>USDC Contract:</strong><br />
          <code className="text-xs bg-gray-200 p-1 rounded">0x1c7D4B196Cb0C7B01d743Fbc6116A902379C7238</code>
        </div>
        
        <div>
          <strong>Network:</strong> Sepolia (Chain ID: 11155111)
        </div>
        
        <div className="border-t pt-2">
          <strong>USDC Balance:</strong>
          {isLoading ? (
            <span className="text-blue-600"> Loading...</span>
          ) : error ? (
            <span className="text-red-600"> Error: {error}</span>
          ) : usdcBalance ? (
            <span className="text-green-600"> {usdcBalance} USDC</span>
          ) : (
            <span className="text-gray-600"> 0 USDC</span>
          )}
        </div>
        
        <button 
          onClick={refetch}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh Balance'}
        </button>
      </div>
    </div>
  );
}