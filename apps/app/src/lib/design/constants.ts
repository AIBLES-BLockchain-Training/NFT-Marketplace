/**
 * Design System Constants
 * Standardized values for consistent UI across the application
 */

/**
 * Button Variants Mapping
 * Consistent button styling for different actions
 */
export const BUTTON_VARIANTS = {
  // Primary actions (Place Bid, Collect)
  PRIMARY: 'primary',
  // Secondary actions (Cancel, View Details)
  SECONDARY: 'secondary',
  // Destructive actions (Cancel Auction, Delete)
  DANGER: 'danger',
  // Special actions (Buyout)
  SPECIAL: 'primary', // Using primary for now, can create special variant later
} as const;

/**
 * Spacing Scale
 * Consistent spacing values using Tailwind classes
 */
export const SPACING = {
  // Component gaps
  GAP_XS: 'gap-2', // 8px
  GAP_SM: 'gap-3', // 12px
  GAP_MD: 'gap-4', // 16px
  GAP_LG: 'gap-6', // 24px
  GAP_XL: 'gap-8', // 32px

  // Padding
  PADDING_XS: 'p-2', // 8px
  PADDING_SM: 'p-3', // 12px
  PADDING_MD: 'p-4', // 16px
  PADDING_LG: 'p-6', // 24px
  PADDING_XL: 'p-8', // 32px

  // Margin
  MARGIN_XS: 'mb-2', // 8px
  MARGIN_SM: 'mb-3', // 12px
  MARGIN_MD: 'mb-4', // 16px
  MARGIN_LG: 'mb-6', // 24px
  MARGIN_XL: 'mb-8', // 32px
} as const;

/**
 * Loading State Messages
 * Consistent loading text across components
 */
export const LOADING_MESSAGES = {
  APPROVING: 'Approving...',
  BIDDING: 'Placing Bid...',
  BUYING: 'Processing Purchase...',
  CANCELLING: 'Cancelling...',
  COLLECTING: 'Collecting...',
  CONNECTING: 'Connecting...',
  LOADING: 'Loading...',
  SUBMITTING: 'Submitting...',
  UPDATING: 'Updating...',
} as const;

/**
 * Border Radius Scale
 */
export const BORDER_RADIUS = {
  SM: 'rounded-lg', // 8px
  MD: 'rounded-xl', // 12px
  LG: 'rounded-2xl', // 16px
  FULL: 'rounded-full',
} as const;

/**
 * Z-Index Layers
 */
export const Z_INDEX = {
  MODAL_BACKDROP: 'z-40',
  MODAL: 'z-50',
  MODAL_NESTED: 'z-[60]',
  TOAST: 'z-[100]',
} as const;

/**
 * Animation Durations
 */
export const ANIMATION = {
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms',
} as const;

/**
 * Breakpoints (for reference)
 */
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;
