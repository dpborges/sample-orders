import { getFirstFailedStep } from "./get.first.failed.step";
// Returns the updated process status indicating whehter rollback was triggered.
// If rollback triggered it updates first step that failed.
export function getSagaResult(process): any {
  type FirstFailure = { step: string, name: string };
  let updatedProcess = { ...process }
  let firstFailure: FirstFailure = getFirstFailedStep(updatedProcess);
  let failureOccurred = firstFailure.step ? true : false;
  if (failureOccurred || process.rollbackTriggered) {
    updatedProcess.sagaSuccessful = false;
    let { step, name } = firstFailure;
    updatedProcess.sagaFailureReason = `Process failed at step ${step}: ${name}`
  }
  return updatedProcess;
}