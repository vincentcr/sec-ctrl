= SEC-CTRL

SEC-CTRL monitors and controls an on-premise alarm system.  It will report activity to and receive
commands from the cloud via AWS IoT.


SEC-CTRL is built out of these components:
 * `local`: an on-premise monitor daemon, collecting events and sending commands to the monitor process
 * `mock`: a mock TPI implementation for testing without access to physical device. Also useful for, eg, simluating alarms.
 * `cloud/event-processor`: a lambda processing incoming events from devices:
    * saves events and state to a DynamoDB database
    * sends alarms to a SNS queue for sending SMS
 * `cloud/api`: a REST API to sends commands to AWS IoT and retrieves state from DynamoDB

`local` communicates with the cloud via AWS IoT.  Events are retrieved from the on-premise device
via a TCP socket, pushed to a redis queue, and then delived to AWS IoT. Commands retrieved from the
cloud work the other way around.

AWS IoT <-> local <-> redis <-> local <-> envisalink

Having Redis in the middle serves as a buffer
