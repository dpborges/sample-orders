// The Standard response interface is used by commands using the request/reply pattern
export interface StandardErrorResponse  {
  shortmessage: string;
  longMessage?: string;  /* include info on how to fix error condition */
  doclink?:     string;  /* if there is human readable information on error, provide linke here */
}