import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {SubjectType} from "./_subjectType"
import {Collection} from "./collection.model"
import {Listing} from "./listing.model"
import {RoleAssignment} from "./roleAssignment.model"
import {PurchaseHistory} from "./purchaseHistory.model"

@Entity_()
export class Subject {
    constructor(props?: Partial<Subject>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("varchar", {length: 8, nullable: false})
    subjectType!: SubjectType

    @StringColumn_({nullable: false})
    name!: string

    @StringColumn_({nullable: true})
    avatarUrl!: string | undefined | null

    @StringColumn_({nullable: true})
    backgroundUrl!: string | undefined | null

    @StringColumn_({nullable: true})
    bio!: string | undefined | null

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @OneToMany_(() => Collection, e => e.creator)
    collections!: Collection[]

    @OneToMany_(() => Listing, e => e.owner)
    listings!: Listing[]

    @OneToMany_(() => RoleAssignment, e => e.subject)
    roleAssignments!: RoleAssignment[]

    @OneToMany_(() => PurchaseHistory, e => e.seller)
    purchaseHistoryAsSeller!: PurchaseHistory[]

    @OneToMany_(() => PurchaseHistory, e => e.buyer)
    purchaseHistoryAsBuyer!: PurchaseHistory[]
}
