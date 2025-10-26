export const GET_NFTS_QUERY = `
  query GetNFTs($limit: Int!, $offset: Int!, $where: NFTWhereInput) {
    nfts(limit: $limit, offset: $offset, where: $where, orderBy: tokenId_ASC) {
      id
      tokenId
      name
      imageUrl
      description
      metadataUri
      collection {
        id
        name
        symbol
        collectionType
      }
      traits {
        id
        traitType
        value
        displayType
      }
      owners {
        ownerAddress
        balance
        updatedAt
      }
    }
  }
`;

export const GET_NFT_BY_ID_QUERY = `
  query GetNFTById($id: String!) {
    nft: nftById(id: $id) {
      id
      tokenId
      name
      imageUrl
      description
      metadataUri
      collection {
        id
        name
        symbol
        description
        logoUrl
        collectionType
        creator {
          id
          name
          avatarUrl
        }
      }
      traits {
        id
        traitType
        value
        displayType
      }
      owners {
        ownerAddress
        balance
        updatedAt
      }
      listings(where: { status_eq: CREATED }) {
        id
        pricePerToken
        quantity
        startTimestamp
        endTimestamp
        isReserved
        status
        createdAt
        updatedAt
        transactionHash
        owner {
          id
          name
          avatarUrl
        }
        listingCreator: owner {
          id
          name
          avatarUrl
        }
        currencyApprovals {
          id
          pricePerToken
          currency {
            id
            symbol
            decimals
          }
        }
      }
      # TODO: Uncomment when Auction and Offer are added to schema
      # auctions(where: { status_in: [CREATED, ACTIVE] }) {
      #   id
      #   auctionId
      #   sellerAddress
      #   quantity
      #   minimumBidAmount
      #   bidBufferBps
      #   startPrice
      #   stepAmount
      #   ceilingPrice
      #   startTime
      #   endTime
      #   timeBufferInSeconds
      #   status
      #   auctionCreator {
      #     id
      #     name
      #     avatarUrl
      #   }
      #   currency {
      #     id
      #     symbol
      #     decimals
      #   }
      #   winningBid {
      #     id
      #     bidderAddress
      #     bidAmount
      #     timestamp
      #     bidder {
      #       id
      #       name
      #       avatarUrl
      #     }
      #   }
      #   bids {
      #     id
      #     bidderAddress
      #     bidAmount
      #     timestamp
      #     bidder {
      #       id
      #       name
      #       avatarUrl
      #     }
      #   }
      # }
      # offers(where: { status_eq: ACTIVE }) {
      #   id
      #   offerId
      #   buyerAddress
      #   quantity
      #   totalPrice
      #   expirationTime
      #   expirationTimestamp
      #   status
      #   createdAt
      #   offeror {
      #     id
      #     name
      #     avatarUrl
      #   }
      #   tokenOwner {
      #     id
      #     name
      #     avatarUrl
      #   }
      #   currency {
      #     id
      #     symbol
      #     decimals
      #   }
      # }
    }
  }
`;

export const GET_LISTINGS_QUERY = `
  query GetListings($limit: Int!, $offset: Int!, $where: ListingWhereInput) {
    listings(limit: $limit, offset: $offset, where: $where, orderBy: createdAt_DESC) {
      id
      listingId
      quantity
      pricePerToken
      startTimestamp
      endTimestamp
      isReserved
      status
      createdAt
      transactionHash
      owner {
        id
        name
        avatarUrl
      }
      listingCreator: owner {
        id
        name
        avatarUrl
      }
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
      currencyApprovals {
        id
        pricePerToken
        currency {
          id
          symbol
          decimals
        }
      }
      buyerApprovals {
        id
        buyerAddress
        isApproved
      }
    }
  }
`;

export const GET_LISTING_BY_ID_QUERY = `
  query GetListingById($id: String!) {
    listing: listingById(id: $id) {
      id
      listingId
      quantity
      pricePerToken
      startTimestamp
      endTimestamp
      isReserved
      status
      createdAt
      updatedAt
      transactionHash
      owner {
        id
        name
        avatarUrl
        bio
      }
      listingCreator: owner {
        id
        name
        avatarUrl
        bio
      }
      nft {
        id
        tokenId
        name
        description
        imageUrl
        metadataUri
        collection {
          id
          name
          symbol
          description
          logoUrl
          collectionType
        }
        traits {
          id
          traitType
          value
          displayType
        }
      }
      currencyApprovals {
        id
        pricePerToken
        approvedBy
        createdAt
        currency {
          id
          name
          symbol
          decimals
          isActive
        }
      }
      buyerApprovals {
        id
        buyerAddress
        isApproved
        approvedBy
        createdAt
      }
    }
  }
`;

export const GET_COLLECTIONS_QUERY = `
  query GetCollections($limit: Int!, $offset: Int!) {
    collections(limit: $limit, offset: $offset, orderBy: createdAt_DESC) {
      id
      name
      symbol
      description
      logoUrl
      bannerUrl
      collectionType
      totalSupply
      floorPrice
      createdAt
      creator {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const GET_COLLECTIONS_TABLE_QUERY = `
  query GetCollectionsTable($limit: Int!, $offset: Int!) {
    collections(limit: $limit, offset: $offset, orderBy: createdAt_DESC) {
      id
      name
      logoUrl
      floorPrice
      nfts(limit: 1000) {
        id
        owners {
          ownerAddress
        }
        purchaseHistory(limit: 1000) {
          timestamp
          totalPrice
        }
      }
    }
  }
`;

export const GET_COLLECTION_BY_ID_QUERY = `
  query GetCollectionById($id: String!) {
    collection: collectionById(id: $id) {
      id
      name
      symbol
      description
      logoUrl
      bannerUrl
      collectionType
      totalSupply
      floorPrice
      createdAt
      creator {
        id
        name
        avatarUrl
      }
      traits {
        id
        traitType
        value
      }
    }
  }
`;

export const GET_COLLECTION_LISTED_NFTS_QUERY = `
  query GetCollectionListedNFTs($collectionId: String!) {
    listings(where: { nft: { collection: { id_eq: $collectionId } }, status_eq: CREATED }, limit: 1000, orderBy: createdAt_DESC) {
      id
      pricePerToken
      quantity
      startTimestamp
      endTimestamp
      owner {
        id
      }
      nft {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currencyApprovals {
        pricePerToken
        currency {
          id
          symbol
          decimals
        }
      }
    }
  }
`;

export const GET_COLLECTION_AUCTIONED_NFTS_QUERY = `
  query GetCollectionAuctionedNFTs($collectionId: String!) {
    auctions(where: { nftId: { collection: { id_eq: $collectionId } }, status_in: [CREATED, ACTIVE] }, limit: 1000) {
      id
      startPrice
      nftId {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currency {
        symbol
      }
      endTime
    }
  }
`;

export const GET_COLLECTION_OFFERED_NFTS_QUERY = `
  query GetCollectionOfferedNFTs($collectionId: String!) {
    offers(where: { nftId: { collection: { id_eq: $collectionId } }, status_eq: ACTIVE }, limit: 1000) {
      id
      totalPrice
      quantity
      expirationTime
      nftId {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currency {
        symbol
      }
    }
  }
`;

export const GET_COLLECTION_USER_LISTINGS_QUERY = `
  query GetCollectionUserListings($collectionId: String!, $ownerAddress: String!) {
    listings(where: { nft: { collection: { id_eq: $collectionId } }, owner: { id_eq: $ownerAddress }, status_eq: CREATED }, orderBy: createdAt_DESC) {
      id
      pricePerToken
      quantity
      startTimestamp
      endTimestamp
      owner {
        id
      }
      nft {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currencyApprovals {
        pricePerToken
        currency {
          id
          symbol
          decimals
        }
      }
    }
  }
`;

export const GET_COLLECTION_USER_AUCTIONS_QUERY = `
  query GetCollectionUserAuctions($collectionId: String!, $ownerAddress: String!) {
    auctions(where: { nftId: { collection: { id_eq: $collectionId } }, sellerAddress_eq: $ownerAddress, status_in: [CREATED, ACTIVE] }) {
      id
      startPrice
      nftId {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currency {
        symbol
      }
      endTime
    }
  }
`;

export const GET_COLLECTION_USER_OFFERS_QUERY = `
  query GetCollectionUserOffers($collectionId: String!, $buyerAddress: String!) {
    offers(where: { nftId: { collection: { id_eq: $collectionId } }, buyerAddress_eq: $buyerAddress, status_eq: ACTIVE }) {
      id
      totalPrice
      quantity
      expirationTime
      nftId {
        id
        tokenId
        name
        imageUrl
        collection {
          id
          name
          symbol
          collectionType
        }
      }
      currency {
        symbol
      }
    }
  }
`;

export const GET_AUCTIONS_QUERY = `
  query GetAuctions($limit: Int!, $offset: Int!, $where: AuctionWhereInput) {
    auctions(limit: $limit, offset: $offset, where: $where, orderBy: startTime_DESC) {
      id
      auctionId
      sellerAddress
      quantity
      minimumBidAmount
      bidBufferBps
      startPrice
      stepAmount
      ceilingPrice
      startTime
      endTime
      timeBufferInSeconds
      status
      auctionCreator {
        id
        name
        avatarUrl
      }
      nft: nftId {
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
      currency {
        id
        symbol
        decimals
      }
      winningBid {
        id
        bidderAddress
        bidAmount
        timestamp
        bidder {
          id
          name
          avatarUrl
        }
      }
      bids {
        id
        bidderAddress
        bidAmount
        timestamp
        bidder {
          id
          name
          avatarUrl
        }
      }
    }
  }
`;

export const GET_OFFERS_QUERY = `
  query GetOffers($limit: Int!, $offset: Int!, $where: OfferWhereInput) {
    offers(limit: $limit, offset: $offset, where: $where, orderBy: expirationTime_DESC) {
      id
      offerId
      buyerAddress
      quantity
      totalPrice
      expirationTime
      expirationTimestamp
      status
      createdAt
      offeror {
        id
        name
        avatarUrl
      }
      tokenOwner {
        id
        name
        avatarUrl
      }
      nft: nftId {
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
      currency {
        id
        symbol
        decimals
      }
    }
  }
`;

export const GET_USER_ROLE_ASSIGNMENTS_QUERY = `
  query GetUserRoleAssignments($address: String!) {
    roleAssignments(where: { subject: { id_eq: $address } }) {
      id
      assignedAt
      role {
        id
        roleName
        roleHash
      }
    }
  }
`;

export const GET_PURCHASE_HISTORY_QUERY = `
  query GetPurchaseHistory($limit: Int!, $offset: Int!, $where: PurchaseHistoryWhereInput) {
    purchaseHistories(limit: $limit, offset: $offset, where: $where, orderBy: timestamp_DESC) {
      id
      transactionHash
      quantity
      totalPrice
      tradeType
      timestamp
      blockNumber
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
      seller {
        id
        name
        avatarUrl
      }
      buyer {
        id
        name
        avatarUrl
      }
      currency {
        id
        symbol
        decimals
      }
    }
  }
`;

export const GET_ADMIN_STATS_QUERY = `
  query GetAdminStats {
    collectionsConnection(orderBy: id_ASC) {
      totalCount
    }
    nftsConnection(orderBy: id_ASC) {
      totalCount
    }
    listingsConnection(where: { status_eq: CREATED }, orderBy: id_ASC) {
      totalCount
    }
    auctionsConnection(where: { status_eq: CREATED }, orderBy: id_ASC) {
      totalCount
    }
    subjectsConnection(where: { subjectType_eq: USER }, orderBy: id_ASC) {
      totalCount
    }
    purchaseHistoriesConnection(orderBy: id_ASC) {
      totalCount
    }
  }
`;

export const GET_USER_NFTS_QUERY = `
  query GetUserNFTs($address: String!) {
    tokenOwnerships(where: { ownerAddress_eq: $address }) {
      id
      balance
      ownerAddress
      nft {
        id
        tokenId
        name
        imageUrl
        description
        collection {
          id
          name
          symbol
          collectionType
        }
        traits {
          id
          traitType
          value
        }
      }
    }
  }
`;

export const GET_USER_ACTIVE_LISTINGS_QUERY = `
  query GetUserActiveListings($address: String!) {
    listings(where: { owner: { id_eq: $address }, status_eq: CREATED }) {
      id
      nft {
        id
      }
    }
  }
`;

export const GET_ROLE_ASSIGNMENTS_QUERY = `
  query GetRoleAssignments {
    roleAssignments(orderBy: assignedAt_DESC) {
      id
      assignedAt
      subject {
        id
      }
      role {
        id
        roleName
        roleHash
      }
    }
  }
`;

export const GET_RECENT_TRADES_QUERY = `
  query GetRecentTrades($limit: Int!) {
    trades(limit: $limit, orderBy: timestamp_DESC) {
      id
      type
      timestamp
      actor {
        id
      }
      nft {
        id
        tokenId
        name
      }
      metadata
    }
  }
`;

export const GET_ROLE_REQUESTS_QUERY = `
  query GetRoleRequests($where: RoleRequestWhereInput) {
    roleRequests(where: $where, orderBy: requestedAt_DESC) {
      id
      status
      requestedAt
      processedAt
      processedBy
      transactionHash
      blockNumber
      requester {
        id
        name
        avatarUrl
      }
      role {
        id
        roleName
        roleHash
      }
    }
  }
`;

export const GET_NFT_ROLE_REQUESTS_QUERY = `
  query GetNFTRoleRequests($where: NFTRoleRequestWhereInput) {
    nftRoleRequests(where: $where, orderBy: requestedAt_DESC) {
      id
      nftAddress
      tokenId
      status
      requestedAt
      processedAt
      processedBy
      transactionHash
      blockNumber
      requester {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const GET_ALL_ROLE_ASSIGNMENTS_QUERY = `
  query GetAllRoleAssignments($limit: Int!, $offset: Int!, $where: RoleAssignmentWhereInput) {
    roleAssignments(limit: $limit, offset: $offset, where: $where, orderBy: assignedAt_DESC) {
      id
      assignedAt
      transactionHash
      subject {
        id
        name
        avatarUrl
        subjectType
      }
      role {
        id
        roleName
        roleHash
      }
    }
    roleAssignmentsConnection(where: $where, orderBy: id_ASC) {
      totalCount
    }
  }
`;

export const GET_WHITELISTED_NFTS_QUERY = `
  query GetWhitelistedNFTs($limit: Int!, $offset: Int!) {
    nftRoleRequests(limit: $limit, offset: $offset, where: { status_eq: APPROVED }, orderBy: processedAt_DESC) {
      id
      nftAddress
      tokenId
      requestedAt
      processedAt
      processedBy
      transactionHash
      requester {
        id
        name
      }
    }
    nftRoleRequestsConnection(where: { status_eq: APPROVED }, orderBy: id_ASC) {
      totalCount
    }
  }
`;

export const GET_WHITELISTED_CURRENCIES_QUERY = `
  query GetWhitelistedCurrencies($limit: Int!, $offset: Int!) {
    supportedCurrencies(limit: $limit, offset: $offset, where: { isActive_eq: true }, orderBy: id_ASC) {
      id
      name
      symbol
      decimals
      isActive
      feePercentage
      totalAmountFee
    }
    supportedCurrenciesConnection(where: { isActive_eq: true }, orderBy: id_ASC) {
      totalCount
    }
  }
`;

export const GET_TRENDING_COLLECTIONS_QUERY = `
  query GetTrendingCollections($limit: Int!) {
    collections(limit: $limit, orderBy: createdAt_DESC) {
      id
      name
      symbol
      description
      logoUrl
      bannerUrl
      collectionType
      totalSupply
      floorPrice
      createdAt
      creator {
        id
        name
        avatarUrl
      }
      nfts(limit: 1) {
        id
        imageUrl
        purchaseHistory(limit: 1000) {
          id
        }
      }
    }
  }
`;

export const GET_TRENDING_NFTS_QUERY = `
  query GetTrendingNFTs($limit: Int!) {
    nfts(limit: $limit, orderBy: tokenId_ASC) {
      id
      tokenId
      name
      imageUrl
      description
      collection {
        id
        name
        symbol
        collectionType
      }
      purchaseHistory(limit: 1000) {
        id
        timestamp
        totalPrice
      }
      listings(where: { status_eq: CREATED }, limit: 1) {
        id
        pricePerToken
        currencyApprovals {
          currency {
            symbol
          }
        }
      }
    }
  }
`;
