import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Collection} from "./collection.model"

@Entity_()
export class CollectionTraitStat {
    constructor(props?: Partial<CollectionTraitStat>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Collection, {nullable: true})
    collection!: Collection

    @Index_()
    @StringColumn_({nullable: false})
    traitType!: string

    @Index_()
    @StringColumn_({nullable: false})
    traitValue!: string

    @IntColumn_({nullable: false})
    nftCount!: number
}
