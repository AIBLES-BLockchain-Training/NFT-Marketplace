import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Auction} from "./auction.model"
import {Subject} from "./subject.model"

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
    @ManyToOne_(() => Subject, {nullable: true})
    bidder!: Subject

    @Index_()
    @BigIntColumn_({nullable: false})
    bidAmount!: bigint

    @DateTimeColumn_({nullable: false})
    timestamp!: Date
}
