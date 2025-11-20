import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, ManyToOne as ManyToOne_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Subject} from "./subject.model"
import {NFT} from "./nft.model"
import {SupportedCurrency} from "./supportedCurrency.model"
import {OfferStatus} from "./_offerStatus"

@Entity_()
export class Offer {
    constructor(props?: Partial<Offer>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    offerId!: string

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    offeror!: Subject

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    tokenOwner!: Subject | undefined | null

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @BigIntColumn_({nullable: false})
    totalPrice!: bigint

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @Index_()
    @DateTimeColumn_({nullable: false})
    expirationTime!: Date

    @BigIntColumn_({nullable: false})
    expirationTimestamp!: bigint

    @Index_()
    @Column_("varchar", {length: 9, nullable: false})
    status!: OfferStatus

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: true})
    updatedAt!: Date | undefined | null

    @Index_()
    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number
}
