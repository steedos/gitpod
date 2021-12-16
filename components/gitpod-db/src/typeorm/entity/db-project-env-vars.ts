/**
 * Copyright (c) 2022 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import { PrimaryColumn, Entity, Column } from "typeorm";
import { TypeORM } from "../typeorm";
import { ProjectEnvVarWithValue } from "@gitpod/gitpod-protocol";
import { Transformer } from "../transformer";
import { encryptionService } from "../user-db-impl";

@Entity()
// on DB but not Typeorm: @Index("ind_lastModified", ["_lastModified"])   // DBSync
export class DBProjectEnvVar implements ProjectEnvVarWithValue {
    @PrimaryColumn(TypeORM.UUID_COLUMN_TYPE)
    id: string;

    // projectId must be part of the primary key as otherwise malicious users could overwrite
    // the value of arbitrary user env vars because we use TypeORM.save. If the projectId were
    // not part of the primary key, this save call would overwrite env vars with arbitrary IDs,
    // allowing an attacker to steal other users environment variables.
    // But projectId is part of the primary key and we ensure that users can only overwrite/set variables
    // that belong to them.
    @PrimaryColumn(TypeORM.UUID_COLUMN_TYPE)
    projectId: string;

    @Column()
    name: string;

    @Column({
        type: "simple-json",
        transformer: Transformer.compose(
            Transformer.SIMPLE_JSON([]),
            Transformer.encrypted(() => encryptionService)
        )
    })
    value: string;

    @Column("varchar")
    creationTime: string;

    // This column triggers the db-sync deletion mechanism. It's not intended for public consumption.
    @Column()
    deleted: boolean;
}