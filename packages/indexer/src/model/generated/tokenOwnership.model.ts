import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {NFT} from "./nft.model"
import {Subject} from "./subject.model"

@Entity_()
export class TokenOwnership {
    constructor(props?: Partial<TokenOwnership>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    ownerAddress!: Subject

    @Index_()
    @BigIntColumn_({nullable: false})
    balance!: bigint

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
