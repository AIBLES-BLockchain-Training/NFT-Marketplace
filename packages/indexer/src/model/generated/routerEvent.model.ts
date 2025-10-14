import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {RouterEventType} from "./_routerEventType"

@Entity_()
export class RouterEvent {
    constructor(props?: Partial<RouterEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("varchar", {length: 14, nullable: false})
    eventType!: RouterEventType

    @Index_()
    @StringColumn_({nullable: false})
    contractAddress!: string

    @Index_()
    @StringColumn_({nullable: false})
    selector!: string

    @StringColumn_({nullable: true})
    data!: string | undefined | null

    @Index_()
    @StringColumn_({nullable: false})
    sender!: string

    @BigIntColumn_({nullable: true})
    value!: bigint | undefined | null

    @Index_()
    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number
}
