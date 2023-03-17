// The Standard response interface for commands using the request/reply pattern
// https://stateless.co/hal_specification.html

/* basic link  */
type Link = { href: string };

/* documentation link  */
type DocLink = { 
  name: string ;
  href: string;
  templated: boolean;
};

/* Type of relations; all relations are optional */
type NamedLinks = {
  self?: Link,
  next?: Link,
  find?: Link,
  /* create additional relations here ... */
  curies: Array<DocLink>,
  items?: Array<Link>  /* supports multiple links that shares same relation such as collection */
}

type ResponseAttrs = { 
  id?: number | string, 
  namedLinks?: NamedLinks,
  updates?: Updates
}

type Updates = { 
  id: string | number, 
  domain: string, 
  before: any, 
  after: any 
};

/* Base Response  */
export class BaseResponse  {
  protected id?:      string | number;
  protected _links:   NamedLinks;   /* object with named relations */
  protected updates?: Updates;

  constructor(id?: string | number, namedLinks?:NamedLinks, updates?: Updates ) {
    if (id)         { this.id = id }
    if (namedLinks) { this._links = namedLinks }
    if (updates)    { this.updates = updates }
  }

  setId(id) {
    this.id = id
  }
  setNamedLinks(namedLinks) {
    this._links = namedLinks
  }
  setUpdateImages(updates: Updates) {
    this.updates = updates;
  }
}
