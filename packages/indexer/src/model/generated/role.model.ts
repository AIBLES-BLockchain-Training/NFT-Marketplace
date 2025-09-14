import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {RoleAssignment} from "./roleAssignment.model"

@Entity_()
export class Role {
    constructor(props?: Partial<Role>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    roleName!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    roleHash!: string

    @StringColumn_({nullable: true})
    description!: string | undefined | null

    @OneToMany_(() => RoleAssignment, e => e.role)
    assignments!: RoleAssignment[]
}
