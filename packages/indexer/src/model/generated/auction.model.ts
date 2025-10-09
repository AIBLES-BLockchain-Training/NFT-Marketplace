import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
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
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    seller!: Subject

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @Index_()
    @BigIntColumn_({nullable: false})
    startPrice!: bigint

    @Index_()
    @BigIntColumn_({nullable: false})
    stepAmount!: bigint

    @Index_()
    @BigIntColumn_({nullable: true})
    ceilingPrice!: bigint | undefined | null

    @DateTimeColumn_({nullable: true})
    startTime!: Date | undefined | null

    @DateTimeColumn_({nullable: true})
    endTime!: Date | undefined | null

    @IntColumn_({nullable: false})
    timeBufferInSeconds!: number

    @Column_("varchar", {length: 9, nullable: false})
    status!: AuctionStatus

    @Index_()
    @ManyToOne_(() => Bid, {nullable: true})
    winningBid!: Bid | undefined | null

    @OneToMany_(() => Bid, e => e.auction)
    bids!: Bid[]

    @OneToMany_(() => PurchaseHistory, e => e.auction)
    purchaseHistory!: PurchaseHistory[]
}
