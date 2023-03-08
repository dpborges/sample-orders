/**
 * Enums defining standard client error messages
 */

/* Specified in setReason */
export enum ClientErrorReasons {
  IncorrectSyntax  = 'Incorrect Syntax',
  UnexpectedResponse = 'Unexpected Response',
  TooLarge   = 'Size to large',
  InvalidRequest    = 'Request Invalid'
}

/* Specified in setLongMessage */
export enum ClientErrorDetail {
  TryAgainLater  = 'Try again later. If persists, report problem to site adminstrator.',
}