const { DateTime } = require("luxon");

import { createWriteStream, WriteStream } from "fs";

import config from "./config";

class Logger {
  private logStream: WriteStream;

  constructor() {
    const logFile = config.getLogPath();
    this.logStream = createWriteStream(logFile, { flags: "a" });
  }

  log(message: string) {
    const timestamp = DateTime.now().setZone('Australia/Sydney').toISO();
    if (config.getConfigurationSetting('enableLogToConsole')) {
      console.log(`${timestamp} ${message}`);
    }

    if (config.getConfigurationSetting('enableLogToFile')) {
      this.logStream.write(`${timestamp} ${message}\n`);
    }
  }
}

export default new Logger();