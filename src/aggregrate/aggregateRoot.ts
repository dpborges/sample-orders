export class AggregateRoot {

  private id: number;
  private version: number = -1;

  constructor() {

  }

  getId(): number {
    return this.id;
  }
  getVersion(): number {
    return this.version;
  }
    

}