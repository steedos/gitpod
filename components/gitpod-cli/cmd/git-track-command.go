// Copyright (c) 2021 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License-AGPL.txt in the project root for license information.

package cmd

import (
	"context"
	"io"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"

	serverapi "github.com/gitpod-io/gitpod/gitpod-protocol"
	supervisor "github.com/gitpod-io/gitpod/supervisor/api"
)

var gitTrackCommandOpts struct {
	GitCommand string
}

var gitTrackCommand = &cobra.Command{
	Use:    "git-track-command",
	Short:  "Gitpod's Git command tracker",
	Long:   "Sending anonymous statistics about the executed git commands inside",
	Args:   cobra.ExactArgs(0),
	Hidden: true,
	Run: func(cmd *cobra.Command, args []string) {
		log.SetOutput(io.Discard)
		f, err := os.OpenFile(os.TempDir()+"/gitpod-git-credential-helper.log", os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
		if err == nil {
			defer f.Close()
			log.SetOutput(f)
		}

		log.Infof("gp git-track-command")

		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
		defer cancel()
		supervisorAddr := os.Getenv("SUPERVISOR_ADDR")
		if supervisorAddr == "" {
			supervisorAddr = "localhost:22999"
		}
		supervisorConn, err := grpc.Dial(supervisorAddr, grpc.WithInsecure())
		if err != nil {
			log.WithError(err).Fatal("error connecting to supervisor")
		}
		wsinfo, err := supervisor.NewInfoServiceClient(supervisorConn).WorkspaceInfo(ctx, &supervisor.WorkspaceInfoRequest{})
		if err != nil {
			log.WithError(err).Fatal("error getting workspace info from supervisor")
		}
		clientToken, err := supervisor.NewTokenServiceClient(supervisorConn).GetToken(ctx, &supervisor.GetTokenRequest{
			Host: wsinfo.GitpodApi.Host,
			Kind: "gitpod",
			Scope: []string{
				"function:trackEvent",
			},
		})
		if err != nil {
			log.WithError(err).Fatal("error getting token from supervisor")
		}
		client, err := serverapi.ConnectToServer(wsinfo.GitpodApi.Endpoint, serverapi.ConnectToServerOpts{
			Token:   clientToken.Token,
			Context: ctx,
			Log:     log.NewEntry(log.StandardLogger()),
		})
		if err != nil {
			log.WithError(err).Fatal("error connecting to server")
		}
		params := &serverapi.EventParams{
			Command:             gitTrackCommandOpts.GitCommand,
			WorkspaceId:         "test",
			WorkspaceInstanceId: "test",
			Timestamp:           time.Now().Unix(),
		}
		event := &serverapi.GitCommandEventParams{
			EventName:  "git_command",
			Parameters: *params,
		}
		log.WithField("command", gitTrackCommandOpts.GitCommand).
			Info("tracking the GitCommand event")

		err = client.TrackEvent(ctx, event)
		if err != nil {
			log.WithError(err).Fatal("error tracking git event")
		}
	},
}

func init() {
	rootCmd.AddCommand(gitTrackCommand)
	gitTokenValidator.Flags().StringVarP(&gitTokenValidatorOpts.GitCommand, "gitCommand", "c", "", "The Git command to be recorded")
	gitTokenValidator.MarkFlagRequired("gitCommand")
}
