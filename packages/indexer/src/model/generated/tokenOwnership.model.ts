import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {NFT} from "./nft.model"

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

    @StringColumn_({nullable: false})
    ownerAddress!: string

    @BigIntColumn_({nullable: false})
    balance!: bigint

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
