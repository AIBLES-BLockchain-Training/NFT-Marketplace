import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, Index as Index_, ManyToOne as ManyToOne_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {NFT} from "./nft.model"
import {Subject} from "./subject.model"
import {SupportedCurrency} from "./supportedCurrency.model"
import {AuctionStatus} from "./_auctionStatus"
import {Bid} from "./bid.model"
import {PurchaseHistory} from "./purchaseHistory.model"

@Entity_()
export class Auction {
    constructor(props?: Partial<Auction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    auctionId!: bigint

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    seller!: Subject

    @Index_()
    @StringColumn_({nullable: false})
    sellerAddress!: string

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    winningBidder!: Subject | undefined | null

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @BigIntColumn_({nullable: false})
    minimumBidAmount!: bigint

    @Index_()
    @BigIntColumn_({nullable: false})
    startPrice!: bigint

    @Index_()
    @BigIntColumn_({nullable: false})
    stepAmount!: bigint

    @BigIntColumn_({nullable: false})
    bidBufferBps!: bigint

    @Index_()
    @BigIntColumn_({nullable: true})
    ceilingPrice!: bigint | undefined | null

    @DateTimeColumn_({nullable: true})
    startTime!: Date | undefined | null

    @DateTimeColumn_({nullable: true})
    endTime!: Date | undefined | null

    @IntColumn_({nullable: false})
    timeBufferInSeconds!: number

    @StringColumn_({nullable: false})
    tokenType!: string

    @Column_("varchar", {length: 9, nullable: false})
    status!: AuctionStatus

    @BooleanColumn_({nullable: false})
    isPayoutCollected!: boolean

    @BooleanColumn_({nullable: false})
    isTokenCollected!: boolean

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: true})
    updatedAt!: Date | undefined | null

    @OneToMany_(() => Bid, e => e.auction)
    bids!: Bid[]

    @OneToMany_(() => PurchaseHistory, e => e.auction)
    purchaseHistory!: PurchaseHistory[]
}
