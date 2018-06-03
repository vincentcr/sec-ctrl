package main

import (
	"encoding/json"
	"sec-ctl/cloud/db"
	"sec-ctl/pkg/sites"
	"sec-ctl/pkg/ws"
)

type siteConnector struct {
	id         db.UUID
	controller *siteController
	conn       *ws.Conn
	queue      *queue
}

func newSiteConnector(ctrl *siteController, conn *ws.Conn, queue *queue) (*siteConnector, error) {
	cx := &siteConnector{
		id:         ctrl.site.ID,
		controller: ctrl,
		conn:       conn,
		queue:      queue,
	}

	go func() {
		cx.readLoop()
	}()

	go func() {
		cx.send(ws.ControlMessage{Code: ws.CtrlGetState})
	}()

	go func() {
		queue.startConsumeLoop(getSiteQueueName(ctrl.site.ID, "commands"), func(msg qMessage) error {
			cmd := sites.UserCommand{}
			err := json.Unmarshal(msg.data, &cmd)
			if err != nil {
				return err
			}
			err = cx.conn.Write(cmd)
			if err != nil {
				cx.handleConnErr(err)
			}
			return err
		})
	}()

	return cx, nil
}

func (cx *siteConnector) readLoop() {
	for {
		i, err := cx.conn.Read()
		if err != nil {
			cx.handleConnErr(err)
			break
		}

		switch o := i.(type) {
		case sites.SystemState:
			cx.controller.updateState(o)
		case sites.StateChange:
			cx.controller.processStatechange(o)
		case sites.Event:
			cx.controller.processEvent(o)
		default:
			logger.Panicf("Unexpected message: %#v", i)
		}
	}
}

func (cx *siteConnector) foo() {

}
