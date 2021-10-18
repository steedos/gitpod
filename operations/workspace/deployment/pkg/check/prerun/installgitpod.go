package prerun

import "github.com/gitpod-io/gitpod/ws-deployment/pkg/common"

// CreateClusterPreruns represents preruns before installing gitpod
type InstallGitpodPreruns struct {
	Cluster        *common.WorkspaceCluster
	ProjectContext *common.ProjectContext
	PreRuns        []*IPreRun
}

// CreatePreRuns creates a set of pre runs to be executed before actual installation
// of gitpod. It populates the calling object's `PreRuns` field
func (gp *InstallGitpodPreruns) CreatePreRuns() error {
	gp.addGitpodNotAlreadyInstalled()
	panic("I am not implemented yet!")
}

// Fill this so that it talks to the kubernetes cluster and verifies that gitpod
// is not already installed
func (gp *InstallGitpodPreruns) addGitpodNotAlreadyInstalled() {
	panic("I am not implemented yet")
}
