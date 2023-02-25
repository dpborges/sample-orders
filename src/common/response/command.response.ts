// The Standard response interface is used by commands using the request/reply pattern
type Relation = 'self' | 'tbd';

type Link = { 
  href: string,
  rel: Relation
}
export interface StandardResponse  {
  id: number | string;
  link: Link;
}