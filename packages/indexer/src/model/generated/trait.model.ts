import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Collection} from "./collection.model"
import {NFT} from "./nft.model"

@Entity_()
export class Trait {
    constructor(props?: Partial<Trait>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Collection, {nullable: true})
    collection!: Collection

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @StringColumn_({nullable: true})
    displayType!: string | undefined | null

    @Index_()
    @StringColumn_({nullable: false})
    traitType!: string

    @Index_()
    @StringColumn_({nullable: false})
    value!: string
}
