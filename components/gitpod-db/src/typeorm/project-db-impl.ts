/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import { inject, injectable } from "inversify";
import { TypeORM } from "./typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from 'uuid';
import { PartialProject, Project, ProjectEnvVar } from "@gitpod/gitpod-protocol";
import { EncryptionService } from "@gitpod/gitpod-protocol/lib/encryption/encryption-service";
import { censor } from '@gitpod/gitpod-protocol/lib/util/censor';
import { ProjectDB } from "../project-db";
import { DBProject } from "./entity/db-project";
import { DBProjectEnvVar } from "./entity/db-project-env-vars";

@injectable()
export class ProjectDBImpl implements ProjectDB {
    @inject(TypeORM) typeORM: TypeORM;
    @inject(EncryptionService) protected readonly encryptionService: EncryptionService;

    protected async getEntityManager() {
        return (await this.typeORM.getConnection()).manager;
    }

    protected async getRepo(): Promise<Repository<DBProject>> {
        return (await this.getEntityManager()).getRepository<DBProject>(DBProject);
    }

    protected async getProjectEnvVarRepo(): Promise<Repository<DBProjectEnvVar>> {
        return (await this.getEntityManager()).getRepository<DBProjectEnvVar>(DBProjectEnvVar);
    }

    public async findProjectById(projectId: string): Promise<Project | undefined> {
        const repo = await this.getRepo();
        return repo.findOne({ id: projectId, markedDeleted: false });
    }

    public async findProjectByCloneUrl(cloneUrl: string): Promise<Project | undefined> {
        const repo = await this.getRepo();
        return repo.findOne({ cloneUrl, markedDeleted: false });
    }

    public async findProjectsByCloneUrls(cloneUrls: string[]): Promise<Project[]> {
        if (cloneUrls.length === 0) {
            return [];
        }
        const repo = await this.getRepo();
        const q = repo.createQueryBuilder("project")
            .where("project.markedDeleted = false")
            .andWhere(`project.cloneUrl in (${ cloneUrls.map(u => `'${u}'`).join(", ") })`)
        const result = await q.getMany();
        return result;
    }

    public async findTeamProjects(teamId: string): Promise<Project[]> {
        const repo = await this.getRepo();
        return repo.find({ teamId, markedDeleted: false });
    }

    public async findUserProjects(userId: string): Promise<Project[]> {
        const repo = await this.getRepo();
        return repo.find({ userId, markedDeleted: false });
    }

    public async storeProject(project: Project): Promise<Project> {
        const repo = await this.getRepo();
        return repo.save(project);
    }

    public async updateProject(partialProject: PartialProject): Promise<void> {
        const repo = await this.getRepo();
        const count = await repo.count({ id: partialProject.id, markedDeleted: false });
        if (count < 1) {
            throw new Error('A project with this ID could not be found');
        }
        await repo.update(partialProject.id, partialProject);
    }

    public async markDeleted(projectId: string): Promise<void> {
        const repo = await this.getRepo();
        const project = await repo.findOne({ id: projectId });
        if (project) {
            project.markedDeleted = true;
            await repo.save(project);
        }
    }

    public async setProjectEnvironmentVariable(projectId: string, name: string, value: string): Promise<void>{
        const envVarRepo = await this.getProjectEnvVarRepo();
        let envVar = await envVarRepo.findOne({ projectId, name, deleted: false });
        if (envVar) {
            envVar.value = value;
        } else {
            envVar = {
                id: uuidv4(),
                projectId,
                name,
                value,
                creationTime: new Date().toISOString(),
                deleted: false,
            };
        }
        await envVarRepo.save(envVar);
    }

    public async getProjectEnvironmentVariables(projectId: string): Promise<ProjectEnvVar[]> {
        const envVarRepo = await this.getProjectEnvVarRepo();
        const envVarsWithValue = await envVarRepo.find({ projectId, deleted: false });
        const envVars = envVarsWithValue.map(v => (censor(v, 'value') as any as ProjectEnvVar));
        return envVars;
    }

    public async deleteProjectEnvironmentVariable(projectId: string, name: string): Promise<void> {
        const envVarRepo = await this.getProjectEnvVarRepo();
        const envVar = await envVarRepo.findOne({ projectId, name, deleted: false });
        if (!envVar) {
            throw new Error('A environment variable with this name could not be found for this project');
        }
        envVar.deleted = true;
        envVarRepo.update(envVar.id, envVar);
    }
}
