const deleteContactProcess = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { name: 'loadAggregate',         success: false },
  step2: { name: 'deleteAggregate',         success: false },
  step3: { name: 'generateContactDeletedEvent',  success: false },
  step4: { name: 'createOutboxInstance',         success: false },
  // step7: { name: 'saveOutboxInstance',         success: false },
  // step8: { name: 'triggerOutbox',         success: false }
}

export {
  deleteContactProcess
}