import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, ManyToOne as ManyToOne_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {NFT} from "./nft.model"
import {Subject} from "./subject.model"
import {SupportedCurrency} from "./supportedCurrency.model"
import {TradeType} from "./_tradeType"
import {Auction} from "./auction.model"
import {Listing} from "./listing.model"

@Entity_()
export class PurchaseHistory {
    constructor(props?: Partial<PurchaseHistory>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT | undefined | null

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    seller!: Subject

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    buyer!: Subject

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @Index_()
    @BigIntColumn_({nullable: false})
    totalPrice!: bigint

    @Index_()
    @Column_("varchar", {length: 7, nullable: false})
    tradeType!: TradeType

    @Index_()
    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @ManyToOne_(() => Auction, {nullable: true})
    auction!: Auction | undefined | null

    @Index_()
    @ManyToOne_(() => Listing, {nullable: true})
    listing!: Listing | undefined | null
}
