import { StandardErrorResponse } from "./error.response";

export class BaseError {

  statusCode:  number;
  message:     string;  /* generic message like 'Bad Request' */
  reason:      string;  /* use to qualify short generic message */
  longMessage: string;  /* explain how to fix or provide fields affected */ 
  docLink:     string;  /* provide doc link that documents how to fix error, if available  */ 

  /* if a constructor parm not provided, use setter methods to set properties */
  constructor(statusCodeOrMessage: string | number ) {
    if (typeof statusCodeOrMessage === "string" ) {
      this.message = statusCodeOrMessage || '';
    } else if (typeof statusCodeOrMessage === "number") {
      const statusCode = statusCodeOrMessage;
      this.setErrorProperties(statusCode); /* expects this method to be defined in subclass */
    } 
  }

  setDocLink(docLink: string) {
    this.docLink = docLink;
  }

  setMessage(msg: string) {
    this.message = msg;
  }

  setStatusCode(code: number) {
    this.statusCode = code;
  }

  setLongMessage(longMsg: string)  {
    this.longMessage = longMsg;
  }

  setReason(reason: string) {
    this.reason = reason;
  }

  toString(): StandardErrorResponse {
    let errorResponse: StandardErrorResponse;
    if (this.statusCode) { errorResponse.statusCode = this.statusCode;  } 
    if (this.message) { errorResponse.message = this.message;  } 
    if (this.longMessage) { errorResponse.longMessage = this.longMessage;  } 
    if (this.docLink) { errorResponse.docLink = this.docLink;  } 
    return errorResponse;
  }

  /* this class is defined by the specific subtype (e. ClientError, ServerError) */
  setErrorProperties(statusCode: number) { };
 
}

