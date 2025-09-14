import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, BooleanColumn as BooleanColumn_, StringColumn as StringColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Subject} from "./subject.model"
import {NFT} from "./nft.model"
import {ListingStatus} from "./_listingStatus"
import {CurrencyApproval} from "./currencyApproval.model"
import {BuyerApproval} from "./buyerApproval.model"
import {PurchaseHistory} from "./purchaseHistory.model"

@Entity_()
export class Listing {
    constructor(props?: Partial<Listing>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    owner!: Subject

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @BigIntColumn_({nullable: false})
    quantity!: bigint

    @Index_()
    @BigIntColumn_({nullable: false})
    pricePerToken!: bigint

    @Index_()
    @DateTimeColumn_({nullable: false})
    startTimestamp!: Date

    @Index_()
    @DateTimeColumn_({nullable: false})
    endTimestamp!: Date

    @Index_()
    @BooleanColumn_({nullable: false})
    isReserved!: boolean

    @Index_()
    @Column_("varchar", {length: 9, nullable: false})
    status!: ListingStatus

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: true})
    updatedAt!: Date | undefined | null

    @Index_()
    @StringColumn_({nullable: true})
    transactionHash!: string | undefined | null

    @OneToMany_(() => CurrencyApproval, e => e.listing)
    currencyApprovals!: CurrencyApproval[]

    @OneToMany_(() => BuyerApproval, e => e.listing)
    buyerApprovals!: BuyerApproval[]

    @OneToMany_(() => PurchaseHistory, e => e.listing)
    purchaseHistory!: PurchaseHistory[]
}
