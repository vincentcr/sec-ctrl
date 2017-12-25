package main

import "sec-ctl/pkg/util"

type config struct {
	BindHost      string
	TPIBindPort   uint16
	RESTBindPort  uint16
	Password      string
	StateFilename string
}

var defaultConfig = config{
	BindHost:      "0.0.0.0",
	TPIBindPort:   4025,
	RESTBindPort:  9751,
	Password:      "mock123",
	StateFilename: "mock-state.json",
}

func loadConfig() (config, error) {
	cfg, err := util.LoadConfig("Mock", defaultConfig)
	return cfg.(config), err
}
