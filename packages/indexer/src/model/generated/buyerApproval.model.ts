import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Listing} from "./listing.model"

@Entity_()
export class BuyerApproval {
    constructor(props?: Partial<BuyerApproval>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Listing, {nullable: true})
    listing!: Listing

    @Index_()
    @StringColumn_({nullable: false})
    buyerAddress!: string

    @BooleanColumn_({nullable: false})
    isApproved!: boolean

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
