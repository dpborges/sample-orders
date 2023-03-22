import { StandardErrorResponse } from "./error.response";

/**
 * Base class used to generate Error Message to send back as an error response. 
 * To use it, define your own classification of errors by extending from this class
 * and overriding the setError Properties. This method will set the various 
 * error properties based on the error number.
 */ 
export class BaseError {

  statusCode:  number;
  message:     string;  /* generic message like 'Bad Request' */
  longMessage: string;
  reason:      string;

  /* if a constructor parm not provided, use setter methods to set properties */
  constructor(statusCodeOrMessage: string | number ) {
    if (typeof statusCodeOrMessage === "string" ) {
      this.message = statusCodeOrMessage || '';
    } else if (typeof statusCodeOrMessage === "number") {
      const statusCode = statusCodeOrMessage;
      this.setErrorProperties(statusCode); /* expects this method to be defined in subclass */
    } 
  }
  
  setMessage(msg: string) {
    this.message = msg;
  }

  setStatusCode(code: number) {
    this.statusCode = code;
  }

   /* Appends to message property to provide more specific reason for the generic error 
      code. This is called first,followed by setLongMessage, so reading flows better.
      Note that this method returns this, which allows you to chain a the 
      setLongMessage() method. */
  setReason(reason: string) {
    this.message = `${this.message}; ${reason}`;
    return this;
  }

  /* appends to message to provide an explanation, solution, or link of external 
     documentation available. This is typically called after setReason */ 
  setLongMessage(longMsg: string)  {
    this.message = `${this.message}; ${longMsg}`;
  }

  toString(): StandardErrorResponse {
    let errorResponse: StandardErrorResponse;
    if (this.statusCode) { errorResponse.statusCode = this.statusCode;  } 
    if (this.message) { errorResponse.message = this.message;  } 
    return errorResponse;
  }

  /* this class is defined by the specific subtype (e. ClientError, ServerError) */
  setErrorProperties(statusCode: number) { };
 
}

