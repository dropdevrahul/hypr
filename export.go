package main

import (
	"encoding/json"
	"log"
	"os"

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
	f, err := os.Create(filepath)
	if err != nil {
		log.Println(err)
		return err
	}

	defer f.Close()
	f.Write(js)

	return nil
}
