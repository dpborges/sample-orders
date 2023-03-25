const process = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { seq: 0, name: 'saveAggregate',         success: false },
  // step2: { seq: 1, name: 'generateCreatedEvent',  success: false },
  // step3: { seq: 2, name: 'createdOutboxInstance', success: false },
  // step4: { seq: 3, name: 'saveOutbox',            success: false }
}

export {
  process
}