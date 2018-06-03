package main

import (
	"encoding/json"
	"fmt"
	"sec-ctl/cloud/config"
	"sec-ctl/cloud/db"
	"sec-ctl/pkg/sites"
	"sec-ctl/pkg/ws"
	"sync"
	"time"
)

const queueNameSiteRemoved = "sites.removed"

type siteRegistry struct {
	db             *db.DB
	queue          *queue
	connectedSites sync.Map // map[db.UUID]SiteController
}

func newRegistry(dbConn *db.DB, cfg config.Config) (*siteRegistry, error) {

	q, err := newQueue(cfg.RedisHost, cfg.RedisPort)
	if err != nil {
		return nil, err
	}

	sr := &siteRegistry{
		db:             dbConn,
		queue:          q,
		connectedSites: sync.Map{},
	}

	q.startConsumeLoop(queueNameSiteRemoved, func(msg qMessage) error {
		siteID := db.UUID(msg.data)
		sr.connectedSites.Delete(siteID)
		return nil
	})

	return sr, nil
}

func (r *siteRegistry) initRemoteSite(site db.Site, conn *ws.Conn) {

	remoteSite := newRemoteSite(site, conn, r.queue)
	r.connectedSites.Store(site.ID, remoteSite)

	r.queue.startConsumeLoop(getSiteQueueName(site.ID, "events"), func(msg qMessage) error {
		var evt sites.Event
		if err := json.Unmarshal(msg.data, &evt); err != nil {
			logger.Panicf("failed to parse event from json %v: %v", msg.data, err)
		}

		_, err := r.db.CreateEvent(site.ID, evt.Time, string(evt.Level), evt)
		return err
	})
}

func (r *siteRegistry) getSite(user db.User, id db.UUID) (db.Site, error) {

	s, err := r.db.FetchSiteByID(id)
	if err != nil {
		return db.Site{}, err
	}

	if !user.ID.Equals(s.OwnerID) {
		return db.Site{}, fmt.Errorf("Unauthorized")
	}

	return s, nil
}

func (r *siteRegistry) sendCommand(id db.UUID, cmd sites.UserCommand) error {

	data, err := json.Marshal(cmd)
	if err != nil {
		return err
	}

	expires := time.Now().Add(60 * time.Second)
	queueName := getSiteQueueName(id, "commands")
	return r.queue.publishEx(queueName, data, expires)
}

func (r *siteRegistry) getLatestEvents(id db.UUID, max uint) ([]db.SiteEvent, error) {
	return r.db.GetSiteEvents(id, 0, max)
}
