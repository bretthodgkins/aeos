import logger from "./logger";

export type NotificationHandler = {
  name: string; // identifier
  handler: (title: string, body: string) => void;
}

class Notifications {
  private handlers: NotificationHandler[];

  constructor() {
    this.handlers = [
      { name: 'log', handler: this.logHandler },
    ];
  }

  registerHandler(handler: NotificationHandler) {
    this.handlers.push(handler);
  }

  unregisterHandler(name: string) {
    this.handlers = this.handlers.filter(handler => handler.name !== name);
  }

  push(title: string, body: string) {
    for (const handler of this.handlers) {
      handler.handler(title, body);
    }
  }

  private logHandler(title: string, body: string) {
    logger.log(`${title}: ${body}`);
  }
}

export default new Notifications();