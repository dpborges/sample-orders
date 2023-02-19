import { AggregateRoot } from './aggregateRoot';
import { Injectable } from '@nestjs/common';

// @Injectable()
export class AggregateService<T> extends AggregateRoot {

  constructor(
    
  ) {super(); }

  test() {
    console.log(">>> Inside Test Method")
  }

  create(payload): any {
    return "This is the Returned Aggregate"
  }



}
