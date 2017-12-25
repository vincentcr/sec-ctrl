package main

import (
	"log"
	"os"
)

var logger = log.New(os.Stderr, "[mock] ", log.LstdFlags|log.Lshortfile)

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Panicln(err)
	}

	if err = Run(cfg.BindHost, cfg.TPIBindPort, cfg.RESTBindPort, cfg.Password, cfg.StateFilename); err != nil {
		log.Panicln(err)
	}
}
