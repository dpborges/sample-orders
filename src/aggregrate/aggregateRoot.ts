import { Injectable } from '@nestjs/common';

export class AggregateRoot {

  private id: number;
  private version: number = 1;
  private generateEvents = true;

  constructor() {}

  getId(): number {
    return this.id;
  }
  
  getInitialVersion(): number {
    return this.version;
  }

}