import { StandardErrorResponse } from "./error.response";
import { BaseError } from "./base.error";

export class ClientError extends BaseError {

  constructor(statusCodeOrMessage: string | number ) {
    super(statusCodeOrMessage);
  }

  /* defines error properties associated to statusCode. This method will be called by 
     BaseError class when user sets the status code. */
  setErrorProperties(statusCode: number) {
    switch (statusCode) {
      case 400:
        this.setStatusCode(400);
        this.setMessage("Bad Request");
        break;
      case 1:
        break;
      default:
    }
  }

}

