package config

import "sec-ctl/pkg/util"

// Config represents the cloud configuration options
type Config struct {
	RESTBindHost string
	RESTBindPort uint16

	WSBindHost string
	WSBindPort uint16

	DBHost     string
	DBPort     uint16
	DBUsername string
	DBPassword string
	DBName     string

	RedisHost string
	RedisPort uint16
}

var defaultConfig = Config{
	RESTBindHost: "0.0.0.0",
	RESTBindPort: 9753,
	WSBindHost:   "0.0.0.0",
	WSBindPort:   9754,

	DBHost:     "localhost",
	DBPort:     5432,
	DBPassword: "secctl_dev",
	DBUsername: "secctl_dev",
	DBName:     "secctl_dev",

	RedisPort: 6739,
}

var testConfig = Config{
	DBPort:    2346,
	RedisPort: 2347,
}

// Load loads the configuration
func Load() (Config, error) {
	return load(defaultConfig)
}

// LoadTest loads the configuration for tests
func LoadTest() (Config, error) {
	return load(defaultConfig, testConfig)
}

func load(srcs ...interface{}) (Config, error) {
	cfg, err := util.LoadConfig("Cloud", srcs...)
	if err != nil {
		return Config{}, err
	}
	return cfg.(Config), err
}
