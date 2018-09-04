import * as net from "net";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

chai.use(chaiAsPromised);
const { expect } = chai;

import config from "../../src/config";
import { Connection, createConnection } from "../../src/localSite/Connection";

describe("The Connection class", () => {
  let server: MockServer;
  let conn: Connection | undefined;
  let serverConn: MockServerConnection | undefined;

  before(async () => {
    server = await MockServer.start();
    config.set("local:port", server.address().port);
  });

  afterEach(async () => {
    await Promise.all(
      [conn, serverConn]
        .filter((x): x is Connection | MockServerConnection => x != null)
        .map(x => x.stop())
    );
  });

  after(async () => {
    server.stop();
  });

  it("start should connect to the remote host/port", async () => {
    conn = createConnection(config.get("local"));
    [serverConn] = await Promise.all([
      server.waitForConnection(),
      conn.start()
    ]);

    expect(serverConn).to.exist;
  });

  it("should reconnect if disconnected", async () => {
    conn = createConnection(config.get("local"));
    [serverConn] = await Promise.all([
      server.waitForConnection(),
      conn.start()
    ]);

    server.stop();
    serverConn.stop();

    server = await MockServer.start();
    serverConn = await server.waitForConnection();
  });

  it("sendData should send the buffer's bytes to the remote socket", async () => {
    conn = createConnection(config.get("local"));
    [serverConn] = await Promise.all([
      server.waitForConnection(),
      conn.start()
    ]);

    const sent = Buffer.from("abcdefgh");
    const [recvd] = await Promise.all([
      serverConn.waitForBytes(sent.length),
      conn.sendData(sent)
    ]);

    expect(recvd).to.deep.equal(sent);
  });

  it("'data' event should trigger when data is received", async () => {
    conn = createConnection(config.get("local"));
    [serverConn] = await Promise.all([
      server.waitForConnection(),
      conn.start()
    ]);

    const sent = Buffer.from("abcdefgh");
    const [recvd] = await Promise.all([
      awaitEvent<Buffer>(conn, "data"),
      serverConn.send(sent)
    ]);

    expect(recvd).to.deep.equal(sent);
  });
});

class MockServer {
  readonly server: net.Server;

  static lastPort?: number;

  static async start(port?: number) {
    const server = new MockServer();
    await server.start();
    return server;
  }

  constructor() {
    this.server = net.createServer();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(MockServer.lastPort, undefined, undefined, () => {
        MockServer.lastPort = this.address().port;
        resolve();
      });
    });
  }

  async stop() {
    return new Promise<void>(resolve => {
      this.server.close(resolve);
    });
  }

  async waitForConnection(timeout?: number): Promise<MockServerConnection> {
    const socket = await awaitEvent<net.Socket>(
      this.server,
      "connection",
      timeout
    );
    return new MockServerConnection(socket);
  }

  address() {
    return this.server.address() as net.AddressInfo;
  }
}

class MockServerConnection {
  constructor(public socket: net.Socket) {}

  async waitForBytes(count: number, timeout?: number): Promise<Buffer> {
    return awaitEvent<Buffer>(this.socket, "data", timeout);
  }

  async send(data: Buffer) {
    return new Promise((resolve, reject) => {
      this.socket.write(data, (err: Error) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async stop() {
    this.socket.destroy();
    this.socket.unref();
  }
}

type EmitterLike = {
  once(event: string, handler: (...args: any[]) => void): void;
};

function awaitEvent<T>(
  emitter: EmitterLike,
  event: string,
  timeout: number = 500
) {
  return new Promise<T>((resolve, reject) => {
    console.log("awaiting event", event);
    emitter.once(event, (...args: any[]) => {
      // console.log("event fired", event, args);
      resolve(args[0]);
    });
    setTimeout(() => {
      reject(new Error("timed out waiting for event " + event));
    }, timeout);
  });
}
