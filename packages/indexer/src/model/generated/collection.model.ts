import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, ManyToOne as ManyToOne_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {CollectionType} from "./_collectionType"
import {Subject} from "./subject.model"
import {NFT} from "./nft.model"
import {Trait} from "./trait.model"
import {CollectionTraitStat} from "./collectionTraitStat.model"

@Entity_()
export class Collection {
    constructor(props?: Partial<Collection>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    name!: string

    @Index_()
    @StringColumn_({nullable: false})
    symbol!: string

    @Column_("varchar", {length: 7, nullable: false})
    collectionType!: CollectionType

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    creator!: Subject

    @BigIntColumn_({nullable: false})
    totalSupply!: bigint

    @BigIntColumn_({nullable: true})
    floorPrice!: bigint | undefined | null

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @OneToMany_(() => NFT, e => e.collection)
    nfts!: NFT[]

    @OneToMany_(() => Trait, e => e.collection)
    traits!: Trait[]

    @OneToMany_(() => CollectionTraitStat, e => e.collection)
    traitStats!: CollectionTraitStat[]
}
