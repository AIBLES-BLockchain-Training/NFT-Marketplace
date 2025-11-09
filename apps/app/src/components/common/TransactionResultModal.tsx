import { Modal } from './Modal';
import { Button } from './Button';

interface TransactionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message: string;
  txHash?: string;
}

const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io/tx/';

export function TransactionResultModal({
  isOpen,
  onClose,
  success,
  message,
  txHash,
}: TransactionResultModalProps) {
  const handleViewOnEtherscan = () => {
    if (txHash) {
      window.open(`${ETHERSCAN_BASE_URL}${txHash}`, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={success ? 'Transaction Successful' : 'Transaction Failed'}
      zIndex="z-[70]"
      hideBackdrop={true}
    >
      <div className="space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {success ? (
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="text-center">
          <p className={`text-lg ${success ? 'text-white' : 'text-red-400'}`}>
            {message}
          </p>
        </div>

        {/* Transaction Hash */}
        {txHash && (
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-300 break-all flex-1">
                  {txHash}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(txHash)}
                  className="px-2 py-1 text-xs bg-dark-border hover:bg-dark-border/70 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {txHash && (
            <Button
              onClick={handleViewOnEtherscan}
              variant="secondary"
              fullWidth
            >
              View on Etherscan
            </Button>
          )}
          <Button onClick={onClose} variant="primary" fullWidth>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
