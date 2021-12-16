/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import { ProjectEnvVar } from "@gitpod/gitpod-protocol";
import { useContext, useEffect, useState } from "react";
import { getGitpodService } from "../service/service";
import { ProjectContext } from "./project-context";
import { ProjectSettingsPage } from "./ProjectSettings";

export default function () {
    const { project } = useContext(ProjectContext);
    const [ envVars, setEnvVars ] = useState<ProjectEnvVar[]>([]);

    const updateEnvVars = async (projectId: string) => {
        const vars = await getGitpodService().server.getProjectEnvironmentVariables(projectId);
        setEnvVars(vars);
    }

    useEffect(() => {
        if (!project) {
            return;
        }
        updateEnvVars(project.id);
    }, [project]);

    const setEnvVar = async (name: string, value: string) => {
        if (!project) {
            return;
        }
        await getGitpodService().server.setProjectEnvironmentVariable(project.id, name, value);
        await updateEnvVars(project.id);
    }

    return <ProjectSettingsPage project={project}>
        <h3>Project Variables</h3>
        <ul>{envVars.map(e => <li>{e.name}</li>)}</ul>
        <button onClick={() => setEnvVar('TEST', 'VALUE')}>Create</button>
    </ProjectSettingsPage>;
}