const process = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { seq: 0, name: 'createAggregate',       success: false },
  step2: { seq: 1, name: 'saveAggregate',         success: false },
  step3: { seq: 2, name: 'generateCreatedEvent',  success: false },
  step4: { seq: 3, name: 'createdOutboxInstance', success: false },
  step5: { seq: 4, name: 'saveOutbox',            success: false }
}

export {
  process
}