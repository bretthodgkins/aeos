import logger from "./logger";

export type NotificationHandler = {
  name: string; // identifier
  handler: (title: string, body: string) => void;
}

let notificationHandlers: NotificationHandler[] = [
  { name: 'log', handler: logHandler },
];

export function registerNotificationHandler(handler: NotificationHandler) {
  notificationHandlers.push(handler);
}

export function unregisterNotificationHandler(name: string) {
  notificationHandlers = notificationHandlers.filter(handler => handler.name !== name);
}

export function logHandler(title: string, body: string) {
  logger.log(`${title}: ${body}`);
}

export function displayNotification(title: string, body: string) {
  for (const handler of notificationHandlers) {
    handler.handler(title, body);
  }
}
