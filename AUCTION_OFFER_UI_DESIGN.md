# AUCTION & OFFER UI/UX DESIGN SPECIFICATION

## Table of Contents
- [1. Auction Feature](#1-auction-feature)
  - [1.1 Auction Card (Grid View)](#11-auction-card-grid-view)
  - [1.2 Auction Detail Page/Modal](#12-auction-detail-pagemodal)
  - [1.3 Create Auction Form](#13-create-auction-form)
- [2. Offer Feature](#2-offer-feature)
  - [2.1 Offer Card (NFT Detail)](#21-offer-card-nft-detail)
  - [2.2 Make Offer Modal](#22-make-offer-modal)
  - [2.3 Offer Management Page](#23-offer-management-page)
- [3. UI/UX Best Practices](#3-uiux-best-practices)
- [4. Implementation Priority](#4-implementation-priority)
- [5. Technical Specifications](#5-technical-specifications)

---

## 1. AUCTION FEATURE

### 1.1 Auction Card (Grid View)

**Layout:**
```
+-------------------------------------+
|                                     |
|         NFT Image (400x400)         |
|                                     |
|  [LIVE] Timer: 2h 15m 30s          |
|  [ENDING SOON] Less than 10min     |
|  [ENDED]                            |
+-------------------------------------+
| Bored Ape #1234                     |
| Collection Name                     |
+-------------------------------------+
| CURRENT BID                         |
|    5.2 ETH                          |
|    by 0x1234...5678                 |
+-------------------------------------+
| Floor: 3.5 ETH                      |
| Total Bids: 12                      |
+-------------------------------------+
|          [Place Bid]                |
+-------------------------------------+
```

**Key Elements:**

1. **Status Badge** (Top-right corner)
   - `LIVE` - Auction is active (Red background)
   - `ENDING SOON` - Less than 10 minutes remaining (Orange background)
   - `ENDED` - Auction has concluded (Gray background)
   - `CANCELLED` - Auction was cancelled (Dark gray background)

2. **Countdown Timer**
   - Format: `Xd Xh Xm Xs` or `Xh Xm Xs` or `Xm Xs`
   - Updates every second
   - Color changes based on time remaining:
     - Normal: White/Light gray
     - Less than 1 hour: Orange
     - Less than 10 minutes: Red
     - Less than 1 minute: Red with pulse animation

3. **Current Bid Display**
   - Large font size (24px-32px)
   - Primary color for amount
   - Secondary color for bidder address
   - Truncated address format: `0x1234...5678`

4. **Context Information**
   - Floor price for comparison
   - Total number of bids (activity indicator)

5. **Call-to-Action Button**
   - Primary button style
   - Full width within card
   - Disabled state when auction ended

**Responsive Behavior:**
- Desktop: 3-4 cards per row
- Tablet: 2-3 cards per row
- Mobile: 1-2 cards per row

---

### 1.2 Auction Detail Page/Modal

**Layout:**
```
+------------------------------------------------------------------+
|                                                                  |
|  +----------------+  +------------------------------------------+|
|  |                |  |  Bored Ape #1234                        ||
|  |                |  |  Owned by 0x1234...5678                 ||
|  |   NFT Image    |  |                                          ||
|  |                |  |  AUCTION ENDING IN:                      ||
|  |   (800x800)    |  |  +------------------------------------+  ||
|  |                |  |  |  02 : 15 : 30 : 45                 |  ||
|  |                |  |  |  Days Hrs  Min  Sec                |  ||
|  |                |  |  +------------------------------------+  ||
|  +----------------+  |                                          ||
|                      |  CURRENT BID                             ||
|                      |  +------------------------------------+  ||
|                      |  |  5.2 ETH                           |  ||
|                      |  |  Approximately $9,850 USD          |  ||
|                      |  |  by 0xabcd...ef01                  |  ||
|                      |  +------------------------------------+  ||
|                      |                                          ||
|                      |  AUCTION DETAILS                         ||
|                      |  +------------------------------------+  ||
|                      |  | Start Price:    3.5 ETH            |  ||
|                      |  | Min Step:       +5% (0.26 ETH)     |  ||
|                      |  | Buyout Price:   10 ETH (Optional)  |  ||
|                      |  | Time Buffer:    5 minutes          |  ||
|                      |  +------------------------------------+  ||
|                      |                                          ||
|                      |  YOUR NEXT BID MUST BE:                  ||
|                      |  +------------------------------------+  ||
|                      |  | Minimum: 5.46 ETH                  |  ||
|                      |  |         (5.2 + 5%)                 |  ||
|                      |  |                                    |  ||
|                      |  | Amount: [5.5] ETH        [Max]     |  ||
|                      |  |                                    |  ||
|                      |  | Balance Check: Sufficient          |  ||
|                      |  | Approval Status: Approved          |  ||
|                      |  |                                    |  ||
|                      |  | [ Place Bid 5.5 ETH ]              |  ||
|                      |  | [ Buyout 10 ETH ]                  |  ||
|                      |  +------------------------------------+  ||
|                      +------------------------------------------+|
|                                                                  |
+------------------------------------------------------------------+
|  BID HISTORY (12 bids)                                          |
|  +------------------------------------------------------------+  |
|  |  #1  5.2 ETH  by 0xabcd...ef01    2 minutes ago          |  |
|  |  #2  5.0 ETH  by 0x1234...5678    15 minutes ago         |  |
|  |  #3  4.8 ETH  by 0x9999...aaaa    1 hour ago             |  |
|  |  #4  4.5 ETH  by 0x7777...bbbb    2 hours ago            |  |
|  |  ...                                                      |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  IMPORTANT NOTES:                                               |
|  - If you are outbid, your previous bid will be refunded        |
|  - Bids placed in the last 5 minutes extend auction by 5 min    |
|  - Winner must collect NFT after auction ends                   |
|  - Seller must collect payout after auction ends                |
+------------------------------------------------------------------+
```

**Key Sections:**

#### A. Countdown Timer Section
- Large, prominent display
- Four-segment format: Days, Hours, Minutes, Seconds
- Live updates every second
- Color-coded urgency:
  - More than 1 day: Normal (white/gray)
  - Less than 1 day: Yellow
  - Less than 1 hour: Orange
  - Less than 10 minutes: Red
  - Less than 1 minute: Red with pulse animation

#### B. Current Bid Information
- Large ETH amount display (32px font)
- USD conversion below (gray, smaller font)
- Bidder address with truncation
- Link to bidder's profile

#### C. Auction Details Panel
- **Start Price**: Initial auction price
- **Min Step**: Percentage increase required for next bid
  - Display both percentage and ETH amount
  - Example: `+5% (0.26 ETH)`
- **Buyout Price**: Optional instant-win price
  - Highlighted with special styling if set
  - Shows "Optional" if not set
- **Time Buffer**: Minutes added when bid placed near end
  - Example: "5 minutes"

#### D. Bid Input Section
- **Minimum Bid Calculation**
  - Auto-calculate: `Current Bid × (1 + Step%)`
  - Display clearly above input
  - Example: `Minimum: 5.46 ETH (5.2 + 5%)`

- **Bid Amount Input**
  - Number input with ETH suffix
  - Validation: Must be >= minimum bid
  - Quick action buttons:
    - [+10%] - Increase by 10%
    - [+20%] - Increase by 20%
    - [Max] - Set to buyout price (if exists)

- **Pre-flight Checks**
  - Balance check: `✓ Sufficient` or `✗ Insufficient`
  - Approval check: `✓ Approved` or `✗ Not Approved`
  - Real-time validation feedback

- **Action Buttons**
  - Primary: `Place Bid X.X ETH`
  - Secondary: `Buyout XX ETH` (if buyout price exists)
  - Disabled states with helpful messages

#### E. Bid History Table
- Chronological list (newest first)
- Columns:
  - Rank (#1, #2, #3, etc.)
  - Bid Amount (ETH)
  - Bidder Address (truncated, clickable)
  - Timestamp (relative: "2 minutes ago")
- Top 3 bids highlighted with different background
- Infinite scroll or pagination for long lists

#### F. Information Panel
- Important auction rules
- User responsibilities:
  - Refund mechanism for outbid users
  - Time buffer extension rules
  - Collection requirements for winner/seller
- Terms and conditions link

**Auction States:**

1. **Before Start**
   - Show: "Auction starts in X time"
   - Disable bid input
   - Show start time countdown

2. **Active**
   - Full bidding functionality
   - Live updates
   - Time buffer activation near end

3. **Ended**
   - Disable bidding
   - Show winner
   - Show collection buttons:
     - For winner: `[Collect NFT]`
     - For seller: `[Collect Payout]`

4. **Cancelled**
   - Show cancellation message
   - Show refund status for bidders

---

### 1.3 Create Auction Form

**Layout:**
```
+----------------------------------------------------+
|  CREATE AUCTION                                    |
+----------------------------------------------------+
|                                                    |
|  STEP 1: NFT SELECTION                            |
|  +----------------------------------------------+  |
|  |  Your NFT: Bored Ape #1234                  |  |
|  |  [Select Different NFT]                     |  |
|  +----------------------------------------------+  |
|                                                    |
|  STEP 2: AUCTION SETTINGS                         |
|  +----------------------------------------------+  |
|  |  Currency                                    |  |
|  |  ( ) ETH  ( ) USDC  ( ) WETH                |  |
|  |                                              |  |
|  |  Start Price (Required)                      |  |
|  |  [3.5______] ETH                            |  |
|  |  Tip: Collection floor is 3.2 ETH           |  |
|  |                                              |  |
|  |  Buyout Price (Optional)                     |  |
|  |  [10_____] ETH                              |  |
|  |  Note: Instant win if someone bids this     |  |
|  |                                              |  |
|  |  Minimum Bid Step (Required)                 |  |
|  |  [5______] %                                |  |
|  |  Note: Each bid must be at least this %     |  |
|  |        higher than previous bid             |  |
|  |                                              |  |
|  |  Duration (Required)                         |  |
|  |  [7______] days                             |  |
|  |  Quick select: [1d] [3d] [7d] [14d] [30d]  |  |
|  |  Ends: January 15, 2025 10:30 AM            |  |
|  |                                              |  |
|  |  Time Buffer (Required)                      |  |
|  |  [5______] minutes                          |  |
|  |  Note: Extends auction if bid placed in     |  |
|  |        last X minutes                        |  |
|  +----------------------------------------------+  |
|                                                    |
|  STEP 3: PREVIEW                                  |
|  +----------------------------------------------+  |
|  |  AUCTION SUMMARY                             |  |
|  |  - Start Price:    3.5 ETH                  |  |
|  |  - Next Bid:       3.675 ETH (+5%)          |  |
|  |  - Buyout Price:   10 ETH                   |  |
|  |  - Duration:       7 days                    |  |
|  |  - Ends At:        Jan 15, 2025 10:30 AM    |  |
|  |  - Time Buffer:    5 minutes                 |  |
|  +----------------------------------------------+  |
|                                                    |
|  APPROVAL REQUIRED                                |
|  [Step 1: Approve NFT] [Step 2: Create Auction]  |
|                                                    |
|  Note: You need to approve this contract to      |
|        transfer your NFT when auction ends        |
+----------------------------------------------------+
```

**Form Sections:**

#### A. NFT Selection
- Display selected NFT with image
- NFT name and token ID
- Collection name
- Owner verification
- Button to change selection

#### B. Currency Selection
- Radio buttons for supported currencies
- ETH (native)
- ERC20 tokens (USDC, USDT, WETH, etc.)
- Display current balance for each option

#### C. Start Price Input
- Required field
- Number input with currency suffix
- Validation: Must be > 0
- Helper text:
  - Show collection floor price
  - Show last sale price
  - Suggested starting price based on market

#### D. Buyout Price Input (Optional)
- Number input with currency suffix
- Validation: Must be > start price
- Clear "Optional" label
- Explanation tooltip:
  - "Anyone can instantly buy at this price"
  - "Ends auction immediately"

#### E. Minimum Bid Step
- Percentage input
- Default: 5%
- Validation: 1-100%
- Recommended range: 3-10%
- Helper text:
  - "Higher % = fewer bids but faster price increase"
  - "Lower % = more bids but slower price increase"

#### F. Duration Selection
- Number input with unit dropdown (days/hours)
- Quick select buttons:
  - 1 day
  - 3 days
  - 7 days (default)
  - 14 days
  - 30 days
- Live end date/time calculation
- Display in user's timezone

#### G. Time Buffer
- Number input in minutes
- Default: 5 minutes
- Validation: 1-60 minutes
- Explanation:
  - "If someone bids in the last X minutes,"
  - "auction extends by X more minutes"

#### H. Preview Panel
- Real-time summary of all settings
- Calculated values:
  - Minimum next bid amount
  - Exact end date/time
- Visual confirmation before submission

#### I. Approval & Submission
- Two-step process:
  1. Approve NFT transfer (if not already approved)
     - Show approval status
     - Button enabled only if not approved
  2. Create auction transaction
     - Button enabled only after approval
     - Shows estimated gas fee

**Form Validation:**

| Field | Validation Rules |
|-------|------------------|
| NFT | Must own the NFT |
| Currency | Must select one |
| Start Price | Must be > 0 |
| Buyout Price | Must be > start price (if set) |
| Bid Step | Must be 1-100% |
| Duration | Must be >= 1 hour |
| Time Buffer | Must be 1-60 minutes |

**Smart Defaults:**
- Currency: ETH
- Start Price: Collection floor price (if available)
- Buyout Price: Empty (optional)
- Bid Step: 5%
- Duration: 7 days
- Time Buffer: 5 minutes

---

## 2. OFFER FEATURE

### 2.1 Offer Card (NFT Detail)

**Layout:**
```
+---------------------------------------+
|  OFFERS RECEIVED (3)                  |
+---------------------------------------+
|  HIGHEST OFFER                        |
|  +---------------------------------+  |
|  | 4.8 ETH                         |  |
|  | by 0x1234...5678                |  |
|  | Expires in 2 days               |  |
|  |                                 |  |
|  | [Accept Offer] [Counter Offer] |  |
|  +---------------------------------+  |
|                                       |
|  OTHER OFFERS                         |
|  +---------------------------------+  |
|  | 4.5 ETH  by 0xabcd...ef01      |  |
|  | Expires: 1 day  [Accept]       |  |
|  +---------------------------------+  |
|  | 4.2 ETH  by 0x9999...aaaa      |  |
|  | Expires: 5 hours [Accept]      |  |
|  +---------------------------------+  |
|                                       |
|  MAKE AN OFFER                        |
|  +---------------------------------+  |
|  | Amount: [4.9__] ETH            |  |
|  | Valid for: [7] days            |  |
|  | [Make Offer]                   |  |
|  +---------------------------------+  |
+---------------------------------------+
```

**Key Sections:**

#### A. Highest Offer Highlight
- Prominent display in separate section
- Large font for ETH amount
- Offeror address (truncated)
- Expiration countdown
- Primary action buttons:
  - `[Accept Offer]` - For NFT owner
  - `[Counter Offer]` - Propose different terms

#### B. Other Offers List
- Sorted by amount (highest to lowest)
- Compact display
- Key information:
  - Offer amount
  - Offeror address
  - Expiration time (relative)
- Quick action: `[Accept]` button

#### C. Quick Offer Form
- Simplified offer creation
- Fields:
  - Amount input
  - Expiration duration dropdown
- Single submit button
- Expands to full modal on click

**Offer Status Indicators:**

| Status | Display |
|--------|---------|
| Active | Normal display with countdown |
| Expiring Soon | Orange text, "Less than 24h" |
| Expired | Grayed out, "Expired" label |
| Accepted | Green checkmark, "Accepted" |
| Cancelled | Gray, "Cancelled" label |

---

### 2.2 Make Offer Modal

**Layout:**
```
+--------------------------------------------+
|  MAKE AN OFFER                             |
|  Bored Ape #1234                           |
+--------------------------------------------+
|                                            |
|  YOUR OFFER AMOUNT                         |
|  +--------------------------------------+  |
|  |  Amount (Required)                   |  |
|  |  [4.9______] ETH                    |  |
|  |                                      |  |
|  |  MARKET CONTEXT                      |  |
|  |  - Floor Price:     3.5 ETH         |  |
|  |  - Last Sale:       4.2 ETH         |  |
|  |  - Highest Offer:   4.8 ETH         |  |
|  |  - Your Offer:      4.9 ETH (+2%)   |  |
|  +--------------------------------------+  |
|                                            |
|  EXPIRATION SETTINGS                       |
|  +--------------------------------------+  |
|  |  Valid For: [7] days                |  |
|  |  Expires: January 8, 2025 10:30 AM  |  |
|  |                                      |  |
|  |  Quick Select:                       |  |
|  |  [1d] [3d] [7d] [30d] [Custom]     |  |
|  +--------------------------------------+  |
|                                            |
|  QUANTITY (ERC-1155 Only)                  |
|  +--------------------------------------+  |
|  |  Quantity: [1____] / 10 available   |  |
|  +--------------------------------------+  |
|                                            |
|  PAYMENT BREAKDOWN                         |
|  +--------------------------------------+  |
|  |  Offer Amount:    4.9 ETH           |  |
|  |  Platform Fee:    0.049 ETH (1%)    |  |
|  |  -------------------------------    |  |
|  |  Total Locked:    4.949 ETH         |  |
|  |                                      |  |
|  |  Your Balance:    12.5 ETH          |  |
|  |  Status: Sufficient                  |  |
|  |                                      |  |
|  |  Allowance:       Unlimited          |  |
|  |  Status: Approved                    |  |
|  +--------------------------------------+  |
|                                            |
|  IMPORTANT INFORMATION                     |
|  - Your funds will be locked until:       |
|    * Offer is accepted by NFT owner, OR   |
|    * Offer expires, OR                    |
|    * You manually cancel the offer        |
|  - You can have multiple active offers    |
|    on different NFTs simultaneously       |
|  - Cannot modify offer once created       |
|                                            |
|  [1. Approve Currency] [2. Make Offer]    |
+--------------------------------------------+
```

**Form Sections:**

#### A. Offer Amount Input
- Primary input field
- Currency selector (if multiple currencies supported)
- Real-time USD conversion
- Market context display:
  - **Floor Price**: Collection floor for reference
  - **Last Sale**: Most recent sale price
  - **Highest Offer**: Current highest active offer
  - **Your Offer**: Amount you're entering with % vs highest

#### B. Expiration Settings
- Duration selector:
  - Quick buttons: 1d, 3d, 7d, 30d
  - Custom input for specific duration
- End date/time calculator
  - Display in user's timezone
  - Format: "January 8, 2025 10:30 AM EST"
- Validation: Must be at least 1 hour

#### C. Quantity Selection (ERC-1155)
- Only shown for ERC-1155 tokens
- Number input
- Max value = available supply
- Validation: 1 to available quantity

#### D. Payment Breakdown
- Clear breakdown of costs:
  - Offer amount
  - Platform fee (percentage and amount)
  - Total to be locked
- Balance check:
  - Current wallet balance
  - Sufficient/Insufficient indicator
- Allowance check:
  - Current approval amount
  - Approved/Not Approved indicator

#### E. Two-Step Submission
1. **Approve Currency** (if needed)
   - Button only shows if not approved
   - Shows approval transaction
   - Updates to "Approved" when done

2. **Make Offer**
   - Enabled only after approval
   - Creates offer transaction
   - Shows gas estimate

**Validation Rules:**

| Field | Rule |
|-------|------|
| Amount | Must be > 0 |
| Amount | Must have sufficient balance |
| Expiration | Must be >= 1 hour in future |
| Quantity | Must be 1 to available supply |

---

### 2.3 Offer Management Page

**Layout:**
```
+-----------------------------------------------------------+
|  MY OFFERS                                                |
|  [Active (5)] [Expired (2)] [Accepted (3)] [All]        |
+-----------------------------------------------------------+
|                                                           |
|  ACTIVE OFFERS                                            |
|  +-----------------------------------------------------+  |
|  |  [NFT Img]  Bored Ape #1234                         |  |
|  |             4.9 ETH                                  |  |
|  |             Expires in 5 days                        |  |
|  |             Status: Pending Review                   |  |
|  |                                                      |  |
|  |             [Cancel Offer] [Increase Amount]        |  |
|  +-----------------------------------------------------+  |
|  |  [NFT Img]  CryptoPunk #5678                        |  |
|  |             85 ETH                                   |  |
|  |             Expires in 2 hours (WARNING)             |  |
|  |             Status: Outbidding Others                |  |
|  |                                                      |  |
|  |             [Cancel Offer] [Extend Duration]        |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  EXPIRED OFFERS (Auto-refunded)                          |
|  +-----------------------------------------------------+  |
|  |  Azuki #999     4.2 ETH    Expired 2 days ago      |  |
|  |  [Make New Offer]                                   |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  ACCEPTED OFFERS (Completed)                             |
|  +-----------------------------------------------------+  |
|  |  Doodle #123    3.8 ETH    Accepted 1 week ago     |  |
|  |  [View NFT]                                         |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

**Tabs/Filters:**
- **Active**: Currently valid offers
- **Expired**: Past expiration date (auto-refunded)
- **Accepted**: Successfully purchased NFTs
- **All**: Complete history

**Offer Card Information:**

#### Active Offers
- NFT thumbnail image
- NFT name and token ID
- Offer amount (large, prominent)
- Expiration countdown
  - Normal: "Expires in X days"
  - Warning: "Expires in X hours" (orange if <24h)
  - Critical: "Expires in X minutes" (red if <1h)
- Status indicator:
  - "Pending Review" - No other offers
  - "Outbidding Others" - Your offer is highest
  - "Outbid" - Someone offered more
- Action buttons:
  - `[Cancel Offer]` - Get refund immediately
  - `[Increase Amount]` - Modify offer amount
  - `[Extend Duration]` - Add more time

#### Expired Offers
- Grayed out appearance
- NFT name and last offer amount
- Expiration timestamp
- Auto-refunded status
- Quick action: `[Make New Offer]`

#### Accepted Offers
- Success indicator (green background/border)
- NFT name and purchase price
- Acceptance timestamp
- Link to view NFT in wallet: `[View NFT]`

**Batch Actions:**
- Select multiple offers
- Bulk cancel
- Bulk extend duration

---

## 3. UI/UX BEST PRACTICES

### 3.1 Color System

**Status Colors:**
```
+-------------------+----------------+----------------------+
| State             | Color          | Usage                |
+-------------------+----------------+----------------------+
| Active/Success    | Green (#10b981)| Winning bids, active |
| Warning/Expiring  | Orange/Yellow  | Time warnings        |
| Error/Ended       | Red (#ef4444)  | Ended, errors        |
| Primary Action    | Blue (#3b82f6) | Main CTAs            |
| Inactive/Disabled | Gray (#6b7280) | Disabled states      |
+-------------------+----------------+----------------------+
```

### 3.2 Typography Hierarchy

**Font Sizes:**
```
+---------------+----------+------------------+
| Element       | Size     | Weight           |
+---------------+----------+------------------+
| Bid Amount    | 32-40px  | Bold (700)       |
| Price/Numbers | 24-28px  | Semi-bold (600)  |
| Headings      | 18-20px  | Semi-bold (600)  |
| Body Text     | 16px     | Regular (400)    |
| Labels        | 14px     | Medium (500)     |
| Helper Text   | 12-13px  | Regular (400)    |
+---------------+----------+------------------+
```

### 3.3 Spacing System

**Consistent Spacing:**
```
XS:  4px   (0.25rem)  - Tight elements
SM:  8px   (0.5rem)   - Related items
MD:  16px  (1rem)     - Default spacing
LG:  24px  (1.5rem)   - Section spacing
XL:  32px  (2rem)     - Major sections
2XL: 48px  (3rem)     - Page sections
```

### 3.4 Animation Guidelines

**Timing Functions:**
```
Fast:   150ms  - Hover states, small movements
Normal: 250ms  - Modal open/close, transitions
Slow:   350ms  - Page transitions, large movements
```

**Animation States:**
```
Countdown < 10 minutes:
  - Pulse animation on timer
  - Red color with shadow
  - Animation: pulse 2s infinite

New Bid Notification:
  - Slide-in from right
  - Stay for 3 seconds
  - Fade out

Offer Accepted:
  - Success message modal
  - Green checkmark animation
  - Confetti effect (optional)

Loading States:
  - Skeleton screens for data loading
  - Spinner for transactions
  - Progress bar for multi-step processes
```

### 3.5 Responsive Design

**Breakpoints:**
```
Mobile:  < 640px   (sm)
Tablet:  640-1024px (md-lg)
Desktop: > 1024px   (xl)
```

**Layout Adaptations:**

#### Mobile (< 640px)
```
Auction Card:
+------------------+
|   NFT Image      |
|   [LIVE] 2h 15m  |
+------------------+
| NFT Name         |
+------------------+
| Current Bid      |
|   5.2 ETH        |
+------------------+
| [Place Bid]      |
+------------------+

Stack all elements vertically
Full-width buttons
Collapsed bid history (show 3, "View All")
```

#### Tablet (640-1024px)
```
2 columns for auction cards
Side-by-side layout for detail pages
Condensed navigation
```

#### Desktop (> 1024px)
```
3-4 columns for auction cards
Full detail layout with sidebar
Expanded bid history
```

### 3.6 Loading & Empty States

**Loading States:**
```
Skeleton Screen:
+------------------+
| [Gray Block]     | <- Image placeholder
+------------------+
| [Gray Line]      | <- Title placeholder
| [Gray Line]      | <- Price placeholder
+------------------+

Spinner:
    [Rotating Circle]
    "Loading auction data..."
```

**Empty States:**
```
No Auctions:
+------------------------------------+
|                                    |
|         [Auction Icon]             |
|                                    |
|    No Active Auctions              |
|    Be the first to create one!     |
|                                    |
|    [Create Auction]                |
|                                    |
+------------------------------------+

No Offers:
+------------------------------------+
|                                    |
|         [Offer Icon]               |
|                                    |
|    No Offers Yet                   |
|    Make an offer to start!         |
|                                    |
|    [Make Offer]                    |
|                                    |
+------------------------------------+
```

### 3.7 Error Handling

**Error Messages:**
```
Transaction Failed:
+----------------------------------------+
| [X] Transaction Failed                 |
|                                        |
| The transaction was rejected.          |
|                                        |
| Possible reasons:                      |
| - Insufficient gas fee                 |
| - User rejected transaction            |
| - Contract error                       |
|                                        |
| Error: "execution reverted"            |
|                                        |
| [Try Again] [Cancel]                   |
+----------------------------------------+

Insufficient Balance:
+----------------------------------------+
| [!] Insufficient Balance               |
|                                        |
| You need 5.5 ETH to place this bid     |
| Your balance: 3.2 ETH                  |
| Needed: 2.3 ETH more                   |
|                                        |
| [Add Funds] [Change Amount]            |
+----------------------------------------+
```

### 3.8 Real-time Updates

**Update Mechanisms:**

1. **WebSocket Connection** (Preferred)
   - Real-time bid updates
   - Auction status changes
   - Offer acceptance notifications
   - No polling required

2. **Polling Strategy** (Fallback)
   ```
   Auction > 1 hour remaining:  Poll every 30 seconds
   Auction < 1 hour remaining:  Poll every 10 seconds
   Auction < 10 min remaining:  Poll every 5 seconds
   Auction < 1 min remaining:   Poll every 1 second
   ```

3. **Optimistic UI Updates**
   - Show bid immediately
   - Show loading indicator
   - Confirm with blockchain data
   - Rollback if failed

**Notification System:**
```
Toast Notification:
+-------------------------------------+
| [i] You've been outbid!             |
| New bid: 5.5 ETH by 0x1234...5678  |
| [View Auction]              [Dismiss]|
+-------------------------------------+

Success Notification:
+-------------------------------------+
| [✓] Offer Accepted!                 |
| You purchased Bored Ape #1234       |
| [View NFT]                  [Dismiss]|
+-------------------------------------+
```

---

## 4. IMPLEMENTATION PRIORITY

### Phase 1: Core Auction (2-3 weeks)
**Priority: HIGH**

- [ ] Auction card component
  - Grid layout
  - Status badges
  - Countdown timer
  - Basic information display

- [ ] Auction detail page/modal
  - NFT display
  - Full auction information
  - Bid history
  - Current bid display

- [ ] Place bid functionality
  - Bid input form
  - Validation
  - Transaction handling
  - Success/error states

- [ ] Live countdown timer
  - Real-time updates
  - Color changes based on time
  - Urgency indicators

- [ ] Bid history component
  - Chronological list
  - Bidder information
  - Timestamps

**Deliverables:**
- Users can browse active auctions
- Users can view auction details
- Users can place bids
- Users can see bid history

---

### Phase 2: Create Auction (1-2 weeks)
**Priority: HIGH**

- [ ] Create auction form
  - NFT selection
  - Price settings
  - Duration settings
  - Time buffer configuration

- [ ] Form validation
  - Real-time validation
  - Error messages
  - Success feedback

- [ ] NFT approval flow
  - Check approval status
  - Approve transaction
  - Status updates

- [ ] Preview panel
  - Settings summary
  - Calculated values
  - Visual confirmation

**Deliverables:**
- Users can create new auctions
- Users can set auction parameters
- Users can approve NFTs for auction

---

### Phase 3: Core Offer (1-2 weeks)
**Priority: MEDIUM**

- [ ] Offer card component
  - Offer display
  - Expiration countdown
  - Action buttons

- [ ] Make offer modal
  - Offer amount input
  - Expiration settings
  - Payment breakdown

- [ ] Accept offer functionality
  - Owner actions
  - Transaction handling
  - NFT transfer

- [ ] Offer management page
  - Active offers list
  - Expired offers
  - Accepted offers

**Deliverables:**
- Users can make offers on NFTs
- Owners can accept offers
- Users can manage their offers

---

### Phase 4: Advanced Auction Features (1 week)
**Priority: MEDIUM**

- [ ] Buyout (ceiling price)
  - Instant buy option
  - Automatic auction end
  - Payout processing

- [ ] Time buffer extension
  - Automatic extension logic
  - Visual indicators
  - Notifications

- [ ] Auction cancellation
  - Owner cancel option
  - Bid refunds
  - Status updates

**Deliverables:**
- Buyout functionality
- Time buffer working correctly
- Auction management tools

---

### Phase 5: Advanced Offer Features (1 week)
**Priority: LOW**

- [ ] Counter-offer system
  - Owner can propose different price
  - Negotiation flow
  - Acceptance/rejection

- [ ] Offer modification
  - Increase amount
  - Extend duration
  - Update terms

- [ ] Multiple offers per NFT
  - Offer comparison
  - Ranking system
  - Quick accept highest

**Deliverables:**
- Counter-offer functionality
- Offer modification tools
- Enhanced offer management

---

### Phase 6: Polish & Optimization (1-2 weeks)
**Priority: LOW**

- [ ] Real-time WebSocket integration
  - Live bid updates
  - Instant notifications
  - Connection management

- [ ] Push notifications
  - Browser notifications
  - Email notifications (optional)
  - SMS notifications (optional)

- [ ] Mobile optimization
  - Responsive layouts
  - Touch interactions
  - Mobile-specific features

- [ ] Analytics dashboard
  - Auction performance
  - Offer statistics
  - User activity

**Deliverables:**
- Real-time updates
- Notification system
- Optimized mobile experience
- Analytics tools

---

## 5. TECHNICAL SPECIFICATIONS

### 5.1 Smart Contract Integration

#### Auction Contract Methods

**Create Auction:**
```typescript
function createAuction(params: {
  assetContract: string;
  tokenId: bigint;
  quantity: bigint;
  currency: string;
  startPrice: bigint;
  ceilingPrice: bigint;
  stepAmount: bigint;  // Percentage in basis points (500 = 5%)
  timeBufferInSeconds: bigint;
  startTime: bigint;
  endTime: bigint;
}): Promise<TransactionReceipt>
```

**Place Bid:**
```typescript
function bid(
  auctionId: bigint,
  bidAmount: bigint
): Promise<TransactionReceipt>
```

**Collect Payout (Seller):**
```typescript
function collectPayout(
  auctionId: bigint
): Promise<TransactionReceipt>
```

**Collect Token (Winner):**
```typescript
function collectToken(
  auctionId: bigint
): Promise<TransactionReceipt>
```

**Cancel Auction:**
```typescript
function cancelAuction(
  auctionId: bigint
): Promise<TransactionReceipt>
```

#### Offer Contract Methods

**Make Offer:**
```typescript
function makeOffer(params: {
  assetContract: string;
  tokenId: bigint;
  quantity: bigint;
  currency: string;
  totalPrice: bigint;
  expirationTimestamp: bigint;
}): Promise<TransactionReceipt>
```

**Accept Offer:**
```typescript
function acceptOffer(
  offerId: bigint
): Promise<TransactionReceipt>
```

**Cancel Offer:**
```typescript
function cancelOffer(
  offerId: bigint
): Promise<TransactionReceipt>
```

### 5.2 GraphQL Queries

#### Get Auctions
```graphql
query GetAuctions(
  $status: AuctionStatus
  $collectionId: String
  $limit: Int
  $offset: Int
) {
  auctions(
    where: {
      status_eq: $status
      nftId: { collection: { id_eq: $collectionId } }
    }
    limit: $limit
    offset: $offset
    orderBy: endTime_ASC
  ) {
    id
    auctionId
    startPrice
    ceilingPrice
    highestBid
    stepAmount
    startTime
    endTime
    timeBufferInSeconds
    status
    nft {
      id
      tokenId
      name
      imageUrl
      collection {
        id
        name
        symbol
      }
    }
    auctionCreator {
      id
      name
    }
    winningBid {
      id
      bidderAddress
      bidAmount
      timestamp
    }
    bids {
      id
      bidderAddress
      bidAmount
      timestamp
    }
    currency {
      id
      symbol
      decimals
    }
  }
}
```

#### Get Offers
```graphql
query GetOffers(
  $nftId: String
  $status: OfferStatus
  $limit: Int
) {
  offers(
    where: {
      nft: { id_eq: $nftId }
      status_eq: $status
    }
    limit: $limit
    orderBy: totalPrice_DESC
  ) {
    id
    offerId
    totalPrice
    quantity
    expirationTime
    status
    nft {
      id
      tokenId
      name
      imageUrl
    }
    offeror {
      id
      name
    }
    currency {
      id
      symbol
      decimals
    }
  }
}
```

### 5.3 State Management

**Auction Store:**
```typescript
interface AuctionStore {
  auctions: Auction[];
  selectedAuction: Auction | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAuctions: () => Promise<void>;
  fetchAuctionById: (id: string) => Promise<void>;
  placeBid: (auctionId: string, amount: bigint) => Promise<void>;
  createAuction: (params: AuctionParams) => Promise<void>;
  cancelAuction: (auctionId: string) => Promise<void>;
  collectPayout: (auctionId: string) => Promise<void>;
  collectToken: (auctionId: string) => Promise<void>;
}
```

**Offer Store:**
```typescript
interface OfferStore {
  offers: Offer[];
  myOffers: Offer[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOffers: (nftId: string) => Promise<void>;
  fetchMyOffers: () => Promise<void>;
  makeOffer: (params: OfferParams) => Promise<void>;
  acceptOffer: (offerId: string) => Promise<void>;
  cancelOffer: (offerId: string) => Promise<void>;
}
```

### 5.4 Utility Functions

**Time Calculations:**
```typescript
// Calculate time remaining
function getTimeRemaining(endTime: string): {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Format time remaining for display
function formatTimeRemaining(endTime: string): string

// Check if auction is ending soon
function isEndingSoon(endTime: string, threshold: number = 600000): boolean

// Check if auction has ended
function hasEnded(endTime: string): boolean
```

**Bid Calculations:**
```typescript
// Calculate minimum next bid
function calculateMinimumBid(
  currentBid: bigint,
  stepPercentage: bigint
): bigint

// Validate bid amount
function validateBid(
  bidAmount: bigint,
  minimumBid: bigint
): boolean

// Calculate total cost including fees
function calculateTotalCost(
  bidAmount: bigint,
  feePercentage: bigint
): bigint
```

**Price Formatting:**
```typescript
// Format ETH amount
function formatEth(amount: bigint, decimals: number = 4): string

// Format USD amount
function formatUsd(amount: number): string

// Convert ETH to USD
function ethToUsd(ethAmount: bigint, ethPrice: number): number
```

### 5.5 Component Architecture

**Component Hierarchy:**
```
AuctionPage
├── AuctionFilters
├── AuctionGrid
│   └── AuctionCard (multiple)
│       ├── NFTImage
│       ├── StatusBadge
│       ├── CountdownTimer
│       ├── BidInfo
│       └── ActionButton
└── AuctionDetailModal
    ├── NFTDisplay
    ├── AuctionInfo
    │   ├── CountdownTimer
    │   ├── CurrentBidDisplay
    │   └── AuctionDetails
    ├── BidForm
    │   ├── AmountInput
    │   ├── ValidationMessages
    │   └── SubmitButton
    └── BidHistory
        └── BidHistoryItem (multiple)

OfferPage
├── OfferFilters
└── OfferList
    └── OfferCard (multiple)
        ├── NFTImage
        ├── OfferInfo
        ├── ExpirationTimer
        └── ActionButtons

CreateAuctionPage
├── NFTSelector
├── AuctionSettingsForm
│   ├── PriceInputs
│   ├── DurationSelector
│   ├── TimeBufferInput
│   └── CurrencySelector
├── PreviewPanel
└── SubmitSection
    ├── ApprovalButton
    └── CreateButton
```

### 5.6 Testing Strategy

**Unit Tests:**
- Component rendering
- User interactions
- State management
- Utility functions

**Integration Tests:**
- Form submissions
- Transaction flows
- API calls
- WebSocket connections

**E2E Tests:**
- Complete auction creation flow
- Bid placement flow
- Offer creation and acceptance
- Auction ending and collection

---

## Appendix A: Glossary

**Auction Terms:**
- **Start Price**: Minimum price to start bidding
- **Ceiling Price**: Buyout price for instant purchase
- **Step Amount**: Minimum percentage increase per bid
- **Time Buffer**: Minutes added when late bid placed
- **Highest Bidder**: Current auction leader
- **Payout**: Seller's earnings after auction ends

**Offer Terms:**
- **Offeror**: Person making the offer
- **Total Price**: Full amount for the offer
- **Expiration**: When offer becomes invalid
- **Counter Offer**: Alternative offer from NFT owner
- **Active**: Currently valid offer
- **Expired**: Past expiration date

**Status Terms:**
- **CREATED**: Auction/Offer created but not started
- **ACTIVE**: Currently accepting bids/valid
- **ENDED**: Auction finished, awaiting collection
- **CANCELLED**: Cancelled by creator
- **COMPLETED**: Offer accepted and finalized

---

## Appendix B: Example User Flows

### Flow 1: Create and Win Auction

**Step 1: Seller Creates Auction**
1. Navigate to owned NFT detail page
2. Click "Create Auction" button
3. Fill auction form:
   - Start price: 5 ETH
   - Buyout: 10 ETH
   - Duration: 7 days
   - Step: 5%
4. Approve NFT for contract
5. Submit create auction transaction
6. Wait for confirmation
7. Auction is live

**Step 2: Bidder Places Bids**
1. Navigate to auction detail page
2. See current bid: 0 ETH (no bids yet)
3. Enter bid amount: 5.5 ETH (above start price)
4. Approve currency (if needed)
5. Submit bid transaction
6. Bid confirmed, becomes highest bidder

**Step 3: Another Bidder Outbids**
1. Second bidder sees current bid: 5.5 ETH
2. Minimum next bid: 5.775 ETH (5.5 + 5%)
3. Enters bid: 6 ETH
4. Submits transaction
5. First bidder receives refund automatically
6. Second bidder becomes highest

**Step 4: Auction Ends**
1. Time reaches 0
2. Auction status changes to "ENDED"
3. Winner sees "Collect NFT" button
4. Seller sees "Collect Payout" button

**Step 5: Collection**
1. Winner clicks "Collect NFT"
2. Transaction transfers NFT to winner
3. Seller clicks "Collect Payout"
4. Transaction transfers ETH to seller (minus fees)

### Flow 2: Make and Accept Offer

**Step 1: Buyer Makes Offer**
1. Navigate to NFT detail page
2. Click "Make Offer" button
3. Fill offer form:
   - Amount: 4.5 ETH
   - Valid for: 7 days
4. Review payment breakdown:
   - Offer: 4.5 ETH
   - Fee: 0.045 ETH
   - Total: 4.545 ETH locked
5. Approve currency
6. Submit offer transaction
7. Offer is active

**Step 2: Owner Reviews Offers**
1. Owner visits their NFT
2. Sees "3 Offers Received"
3. Views all offers:
   - 4.5 ETH (your offer)
   - 4.2 ETH
   - 3.8 ETH
4. Owner considers offers

**Step 3: Owner Accepts Offer**
1. Owner clicks "Accept" on 4.5 ETH offer
2. Confirms transaction
3. Smart contract executes:
   - Transfers NFT to buyer
   - Transfers ETH to seller (minus fee)
   - Refunds other offers
4. Transaction completes

**Step 4: Buyer Receives NFT**
1. Buyer gets notification: "Offer Accepted!"
2. NFT appears in wallet
3. Offer status updates to "Completed"

---

## Document Metadata

**Version:** 1.0
**Last Updated:** January 2025
**Author:** NFT Marketplace Development Team
**Status:** Draft for Implementation

**Change Log:**
- v1.0 (Jan 2025): Initial design specification
- Future updates will be tracked here

---

END OF DOCUMENT
