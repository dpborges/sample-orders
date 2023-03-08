export interface MessageHeader {
  sessionId:  string;      /* sessionId needed downstream */
  [key: string]: string;   /* allows for adding additional string properties to header */

}