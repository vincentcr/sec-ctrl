package main

import (
	"log"
	"os"
	"sec-ctl/cloud/config"
	"sec-ctl/cloud/db"
)

var logger = log.New(os.Stderr, "[cloud] ", log.LstdFlags|log.Lshortfile)

type app struct {
	db       *db.DB
	registry *siteRegistry
	config   config.Config
}

func main() {

	cfg, err := config.Load()
	if err != nil {
		logger.Panicln(err)
	}

	db, err := db.OpenDB(cfg)
	if err != nil {
		logger.Panicln(err)
	}

	registry, err := newRegistry(db, cfg)
	if err != nil {
		logger.Panicln(err)
	}

	runRESTAPI(registry, db, cfg.RESTBindHost, cfg.RESTBindPort)
}
