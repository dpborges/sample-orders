// The Standard response interface is used by commands using the request/reply pattern
type Relation = 'self' | 'tbd';

type Link = { 
  href: string,
  rel: Relation
}

/* Response used when creating a resource */
export interface CreateEntityResponse  {
  id: number | string;
  link: Link;
}