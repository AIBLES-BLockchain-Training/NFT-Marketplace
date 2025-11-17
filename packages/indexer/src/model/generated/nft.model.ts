import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Collection} from "./collection.model"
import {Listing} from "./listing.model"
import {Auction} from "./auction.model"
import {Offer} from "./offer.model"
import {PurchaseHistory} from "./purchaseHistory.model"
import {Trait} from "./trait.model"
import {Extension} from "./extension.model"
import {TokenOwnership} from "./tokenOwnership.model"

@Entity_()
export class NFT {
    constructor(props?: Partial<NFT>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Collection, {nullable: true})
    collection!: Collection

    @Index_()
    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @StringColumn_({nullable: false})
    name!: string

    @StringColumn_({nullable: true})
    imageUrl!: string | undefined | null

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    @StringColumn_({nullable: true})
    metadataUri!: string | undefined | null

    @OneToMany_(() => Listing, e => e.nft)
    listings!: Listing[]

    @OneToMany_(() => Auction, e => e.nft)
    auctions!: Auction[]

    @OneToMany_(() => Offer, e => e.nft)
    offers!: Offer[]

    @OneToMany_(() => PurchaseHistory, e => e.nft)
    purchaseHistory!: PurchaseHistory[]

    @OneToMany_(() => Trait, e => e.nft)
    traits!: Trait[]

    @OneToMany_(() => Extension, e => e.nft)
    extensions!: Extension[]

    @OneToMany_(() => TokenOwnership, e => e.nft)
    owners!: TokenOwnership[]
}
