import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, BooleanColumn as BooleanColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {PermissionEventType} from "./_permissionEventType"
import {Role} from "./role.model"
import {Subject} from "./subject.model"

@Entity_()
export class PermissionEvent {
    constructor(props?: Partial<PermissionEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("varchar", {length: 18, nullable: false})
    eventType!: PermissionEventType

    @Index_()
    @ManyToOne_(() => Role, {nullable: true})
    role!: Role | undefined | null

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    subject!: Subject | undefined | null

    @BooleanColumn_({nullable: false})
    granted!: boolean

    @Index_()
    @StringColumn_({nullable: false})
    grantedBy!: string

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
