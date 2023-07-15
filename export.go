package main

import (
	"encoding/json"
	"log"
	"os"
	"os/user"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) Export(r RequestResult) error {
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "untitled-01.json",
		Title:           "Export",
	})
	if err != nil {
		log.Println(err)
		return err
	}

	js, err := json.MarshalIndent(&r, "", "    ")
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
	f.Write(js)

	return nil
}
