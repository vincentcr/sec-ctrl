package sites

type SystemState struct {
	Partitions    []Partition
	Zones         []Zone
	Alarms        []Alarm
	TroubleStatus SystemTroubleStatus
}

type StateChangeType byte

const (
	StateChangePartition StateChangeType = iota
	StateChangeZone
	StateChangeSystemTroubleStatus
)

type StateChange struct {
	Type StateChangeType
	Data interface{}
}
