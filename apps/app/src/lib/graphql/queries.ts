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
      auctions(where: { status_in: [CREATED, ACTIVE] }) {
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
      offers(where: { status_eq: ACTIVE }) {
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
        currency {
          id
          symbol
          decimals
        }
      }
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
      nfts {
        id
        tokenId
        name
        imageUrl
      }
      traits {
        id
        traitType
        value
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
    collectionsConnection {
      totalCount
    }
    nftsConnection {
      totalCount
    }
    listingsConnection(where: { status_eq: CREATED }) {
      totalCount
    }
    auctionsConnection(where: { status_eq: CREATED }) {
      totalCount
    }
    subjectsConnection(where: { subjectType_eq: USER }) {
      totalCount
    }
    tradesConnection {
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
