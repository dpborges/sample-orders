// The Standard response interface is used by commands using the request/reply pattern
export interface StandardErrorResponse  {
  statusCode:   number;
  message:      string;
  reason:       string;
  longMessage:  string;  /* include info on how to fix error condition, reason, and or fields affected */
  docLink:      string;  /* if there is human readable information on error, provide linke here */
}