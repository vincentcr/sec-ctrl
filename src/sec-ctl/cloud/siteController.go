package main

import (
	"sec-ctl/cloud/db"
	"sec-ctl/pkg/sites"
)

type siteController struct {
	site      db.Site
	db        *db.DB
	reg       *siteRegistry
	connector *siteConnector
	connected bool
}

func (sc siteController) getState() {
}

func (sc *siteController) updateState(st sites.SystemState) {

}
