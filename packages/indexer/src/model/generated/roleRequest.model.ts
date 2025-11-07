import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Subject} from "./subject.model"
import {Role} from "./role.model"
import {RequestStatus} from "./_requestStatus"

@Entity_()
export class RoleRequest {
    constructor(props?: Partial<RoleRequest>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    requester!: Subject

    @Index_()
    @ManyToOne_(() => Role, {nullable: true})
    role!: Role

    @Index_()
    @Column_("varchar", {length: 8, nullable: false})
    status!: RequestStatus

    @Index_()
    @DateTimeColumn_({nullable: false})
    requestedAt!: Date

    @DateTimeColumn_({nullable: true})
    processedAt!: Date | undefined | null

    @Index_()
    @StringColumn_({nullable: true})
    processedBy!: string | undefined | null

    @Index_()
    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number
}
