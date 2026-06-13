package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/user"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ExportFormat struct {
	Request        Request
	RequestHeaders [][]Header
	RequestBodies  []string
	Result         RequestResult
}

func (a *App) Export(req Request, reqHeaders [][]Header, reqBodies []string, r RequestResult) error {
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "untitled-01.json",
		Title:           "Export",
	})
	if err != nil {
		log.Println(err)
		return err
	}

	out := ExportFormat{
		Request:        req,
		RequestHeaders: reqHeaders,
		RequestBodies:  reqBodies,
		Result:         r,
	}

	js, err := json.MarshalIndent(&out, "", "    ")
	if err != nil {
		log.Println(err)
		return err
	}

	user, _ := user.Current()
	log.Println("writing file as user", user.Username)

	f, err := os.Create(filepath)
	if err != nil {
		log.Println(err)
		return err
	}

	defer f.Close()
	if _, err := f.Write(js); err != nil {
		log.Println(err)
		return err
	}

	return nil
}

// saveTextFile opens a native save dialog and writes plain text to the chosen path.
func saveTextFile(ctx context.Context, defaultName, contents string) error {
	if defaultName == "" {
		defaultName = "response.txt"
	}

	fp, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultName,
		Title:           "Save response body",
	})
	if err != nil {
		log.Println(err)
		return err
	}

	if fp == "" {
		// user cancelled the dialog
		return nil
	}

	f, err := os.Create(fp)
	if err != nil {
		log.Println(err)
		return err
	}
	defer f.Close()

	if _, err := f.WriteString(contents); err != nil {
		log.Println(err)
		return err
	}

	return nil
}
