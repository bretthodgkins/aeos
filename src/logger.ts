const { DateTime } = require("luxon");

import { createWriteStream, WriteStream } from "fs";

import store from "./store";

class Logger {
  private logStream: WriteStream;

  constructor() {
    this.logStream = createWriteStream("access.log", { flags: "a" });
  }

  log(message: string) {
    const timestamp = DateTime.now().setZone('Australia/Sydney').toISO();
    if (store.getValue('enableLogToConsole') === 'true') {
      console.log(`${timestamp} ${message}`);
    }

    if (store.getValue('enableLogToFile') === 'true') {
      this.logStream.write(`${timestamp} ${message}\n`);
    }
  }
}

export default new Logger();