import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {Subject} from "./subject.model"
import {Role} from "./role.model"

@Entity_()
export class RoleAssignment {
    constructor(props?: Partial<RoleAssignment>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Subject, {nullable: true})
    subject!: Subject

    @Index_()
    @ManyToOne_(() => Role, {nullable: true})
    role!: Role

    @DateTimeColumn_({nullable: false})
    assignedAt!: Date

    @StringColumn_({nullable: true})
    assignedBy!: string | undefined | null

    @Index_()
    @StringColumn_({nullable: true})
    transactionHash!: string | undefined | null
}
