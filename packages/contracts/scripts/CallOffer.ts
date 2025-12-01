import { ethers } from 'hardhat';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type OfferParams = {
  assetContract: string;
  tokenId: number;
  quantity: number;
  currency: string;
  totalPrice: bigint;
  expirationTimestamp: number;
};

async function main() {
  const delayBetweenCalls = 1000;

  try {
    const [signer] = await ethers.getSigners();
    const ROUTER_ADDRESS = process.env['ADDRESS_ROUTER'];

    // You can set this NFT address or let user input
    // This is the same NFT used in CallListing.ts
    const NFT_ADDRESS = process.env['ADDRESS_NFT'] || '0xD704424d262e312fD2954eA7a51Be352fDa8E38A';

    if (!ROUTER_ADDRESS) {
      throw new Error('Please set ADDRESS_ROUTER in .env file');
    }

    console.log('========================================');
    console.log('Testing Offer via Router with Native ETH');
    console.log('========================================');
    console.log('Signer address:', signer.address);
    console.log('Router address:', ROUTER_ADDRESS);
    console.log('NFT address:', NFT_ADDRESS);
    console.log('');

    const offerInterface = (await ethers.getContractFactory('NFTOffer')).interface;
    const routerAsOffer = new ethers.Contract(ROUTER_ADDRESS, offerInterface, signer);

    // STEP 1: Get current state
    console.log('========== CURRENT STATE ==========');
    const totalOffers = await routerAsOffer['totalOffers']();
    console.log('Total offers:', totalOffers.toString());

    const feeRecipient = await routerAsOffer['feeRecipient']();
    console.log('Fee recipient:', feeRecipient);

    const feePercentage = await routerAsOffer['feePercentage']();
    const feePercent = (Number(feePercentage) / 100).toFixed(2);
    console.log('Fee percentage:', feePercentage.toString(), '(' + feePercent + '%)');

    const accumulatedFees = await routerAsOffer['accumulatedFees'](ethers.ZeroAddress);
    console.log('Accumulated ETH fees:', ethers.formatEther(accumulatedFees), 'ETH');

    await delay(delayBetweenCalls);

    // STEP 2: Create new offer with Native ETH
    console.log('\n========== CREATE NEW OFFER ==========');
    const latestBlock = await ethers.provider.getBlock('latest');
    if (!latestBlock) throw new Error('Could not get latest block');
    const now = latestBlock.timestamp;

    const offerAmount = ethers.parseEther('0.05'); // 0.05 ETH
    const offerParams: OfferParams = {
      assetContract: NFT_ADDRESS,
      tokenId: 1,
      quantity: 1,
      currency: ethers.ZeroAddress, // Native ETH
      totalPrice: offerAmount,
      expirationTimestamp: now + 1800, // 30 minutes from now
    };

    console.log('Creating offer with parameters:');
    console.log('- Asset:', offerParams.assetContract);
    console.log('- Token ID:', offerParams.tokenId);
    console.log('- Quantity:', offerParams.quantity);
    console.log('- Currency: ETH (Native Token)');
    console.log('- Total Price:', ethers.formatEther(offerParams.totalPrice), 'ETH');
    console.log('- Expiration:', new Date((offerParams.expirationTimestamp) * 1000).toISOString());

    const tx = await routerAsOffer['makeOffer'](offerParams, {
      value: offerAmount // IMPORTANT: Send ETH with transaction
    });
    console.log('Transaction hash:', tx.hash);

    const receipt = await tx.wait();
    console.log('Offer created! Gas used:', receipt.gasUsed.toString());

    // Get offer ID from event
    let newOfferId = totalOffers + BigInt(1);
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = routerAsOffer.interface.parseLog(log);
        return parsed?.name === 'OfferCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = routerAsOffer.interface.parseLog(event);
      if (parsed) {
        newOfferId = parsed.args['offerId'];
        console.log('New offer ID:', newOfferId.toString());
      }
    }

    await delay(delayBetweenCalls);

    // STEP 3: Get offer details
    console.log('\n========== GET OFFER DETAILS ==========');
    const offer = await routerAsOffer['getOffer'](newOfferId);
    console.log('Offer details:');
    console.log('- Offer ID:', offer.offerId.toString());
    console.log('- Offeror:', offer.offeror);
    console.log('- Asset:', offer.assetContract);
    console.log('- Token ID:', offer.tokenId.toString());
    console.log('- Quantity:', offer.quantity.toString());
    console.log('- Total Price:', ethers.formatEther(offer.totalPrice), 'ETH');
    console.log('- Currency:', offer.currency === ethers.ZeroAddress ? 'ETH' : offer.currency);
    console.log('- Expiration:', new Date(Number(offer.expirationTimestamp) * 1000).toISOString());
    console.log('- Status:', offer.status.toString(), '(1=ACTIVE, 2=COMPLETED, 3=CANCELLED)');
    console.log('- Token Type:', Number(offer.tokenType) === 0 ? 'ERC721' : 'ERC1155');

    await delay(delayBetweenCalls);

    // STEP 4: Get all valid offers
    console.log('\n========== GET ALL VALID OFFERS ==========');
    const totalOffersNow = await routerAsOffer['totalOffers']();
    if (totalOffersNow > 0) {
      const validOffers = await routerAsOffer['getAllValidOffers'](1, Math.min(Number(totalOffersNow), 5));
      console.log('Found', validOffers.length, 'valid offers');

      for (let i = 0; i < Math.min(validOffers.length, 3); i++) {
        const o = validOffers[i];
        console.log('\nValid Offer #' + o.offerId.toString() + ':');
        console.log('- Offeror:', o.offeror);
        console.log('- Total Price:', ethers.formatEther(o.totalPrice), 'ETH');
        console.log('- Status:', o.status.toString());
      }
    }

    await delay(delayBetweenCalls);

    // STEP 5: Cancel the offer
    console.log('\n========== CANCEL OFFER ==========');
    console.log('Cancelling offer #' + newOfferId.toString() + '...');

    const cancelTx = await routerAsOffer['cancelOffer'](newOfferId);
    console.log('Transaction hash:', cancelTx.hash);

    const cancelReceipt = await cancelTx.wait();
    console.log('Offer cancelled! Gas used:', cancelReceipt.gasUsed.toString());
    console.log('ETH refunded to offeror');

    await delay(delayBetweenCalls);

    // STEP 6: Final state
    console.log('\n========== FINAL STATE ==========');
    const totalOffersEnd = await routerAsOffer['totalOffers']();
    console.log('Total offers:', totalOffersEnd.toString());

    const accumulatedFeesEnd = await routerAsOffer['accumulatedFees'](ethers.ZeroAddress);
    console.log('Accumulated ETH fees:', ethers.formatEther(accumulatedFeesEnd), 'ETH');

    console.log('\n========================================');
    console.log('All operations completed successfully!');
    console.log('========================================');

  } catch (error: any) {
    console.error('\n========================================');
    console.error('Error occurred:');
    console.error('========================================');
    console.error('Message:', error.message);

    if (error.data) {
      console.error('Error data:', error.data);
    }

    process.exit(1);
  }
}

main().catch(console.error);