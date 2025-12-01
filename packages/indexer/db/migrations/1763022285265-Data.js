module.exports = class Data1763022285265 {
    name = 'Data1763022285265'

    async up(db) {
        await db.query(`ALTER TABLE "offer" DROP CONSTRAINT "FK_9b53f302c9b662370b7865a4297"`)
        await db.query(`DROP INDEX "public"."IDX_dba13de832980011b5d815c8dd"`)
        await db.query(`DROP INDEX "public"."IDX_9b53f302c9b662370b7865a429"`)
        await db.query(`ALTER TABLE "auction" RENAME COLUMN "nft_id" TO "nft_id_id"`)
        await db.query(`CREATE INDEX "IDX_dba13de832980011b5d815c8dd" ON "auction" ("nft_id_id") `)
        await db.query(`CREATE INDEX "IDX_71609884f4478ed41be6672a66" ON "offer" ("nft_id") `)
        await db.query(`ALTER TABLE "offer" ADD CONSTRAINT "FK_71609884f4478ed41be6672a668" FOREIGN KEY ("nft_id") REFERENCES "nft"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "offer" ADD CONSTRAINT "FK_9b53f302c9b662370b7865a4297" FOREIGN KEY ("nft_id") REFERENCES "nft"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`CREATE INDEX "IDX_dba13de832980011b5d815c8dd" ON "auction" ("nft_id") `)
        await db.query(`CREATE INDEX "IDX_9b53f302c9b662370b7865a429" ON "offer" ("nft_id") `)
        await db.query(`ALTER TABLE "auction" RENAME COLUMN "nft_id_id" TO "nft_id"`)
        await db.query(`DROP INDEX "public"."IDX_dba13de832980011b5d815c8dd"`)
        await db.query(`DROP INDEX "public"."IDX_71609884f4478ed41be6672a66"`)
        await db.query(`ALTER TABLE "offer" DROP CONSTRAINT "FK_71609884f4478ed41be6672a668"`)
    }
}
