import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Auction} from "./auction.model"

@Entity_()
export class Bid {
    constructor(props?: Partial<Bid>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Auction, {nullable: true})
    auction!: Auction

    @Index_()
    @StringColumn_({nullable: false})
    bidderAddress!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    bidAmount!: bigint

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
