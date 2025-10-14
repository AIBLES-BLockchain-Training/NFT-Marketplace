import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Listing} from "./listing.model"
import {SupportedCurrency} from "./supportedCurrency.model"

@Entity_()
export class CurrencyApproval {
    constructor(props?: Partial<CurrencyApproval>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Listing, {nullable: true})
    listing!: Listing

    @Index_()
    @ManyToOne_(() => SupportedCurrency, {nullable: true})
    currency!: SupportedCurrency

    @BigIntColumn_({nullable: false})
    pricePerToken!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    approvedBy!: string

    @Index_()
    @StringColumn_({nullable: true})
    transactionHash!: string | undefined | null

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: true})
    updatedAt!: Date | undefined | null
}
