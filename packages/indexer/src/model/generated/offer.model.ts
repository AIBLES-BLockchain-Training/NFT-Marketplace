import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, ManyToOne as ManyToOne_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
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
    buyerAddress!: string

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nftId!: NFT

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @BigIntColumn_({nullable: false})
    totalPrice!: bigint

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @DateTimeColumn_({nullable: false})
    expirationTime!: Date

    @Index_()
    @Column_("varchar", {length: 9, nullable: false})
    status!: OfferStatus
}
