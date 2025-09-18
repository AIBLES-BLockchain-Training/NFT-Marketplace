import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_, FloatColumn as FloatColumn_, BigIntColumn as BigIntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {CurrencyApproval} from "./currencyApproval.model"
import {PurchaseHistory} from "./purchaseHistory.model"

@Entity_()
export class SupportedCurrency {
    constructor(props?: Partial<SupportedCurrency>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    name!: string

    @Index_()
    @StringColumn_({nullable: false})
    symbol!: string

    @IntColumn_({nullable: false})
    decimals!: number

    @Index_()
    @BooleanColumn_({nullable: false})
    isActive!: boolean

    @FloatColumn_({nullable: false})
    feePercentage!: number

    @BigIntColumn_({nullable: false})
    totalAmountFee!: bigint

    @OneToMany_(() => CurrencyApproval, e => e.currency)
    currencyApprovals!: CurrencyApproval[]

    @OneToMany_(() => PurchaseHistory, e => e.currency)
    purchaseHistory!: PurchaseHistory[]
}
