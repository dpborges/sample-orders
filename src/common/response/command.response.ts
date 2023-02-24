// The Standard response interface is used by commands using the request/reply pattern
type selflink = { 
  href: string,
  rel: string
}
export interface StandardResponse  {
  id: number | string;
  link: selflink;
}