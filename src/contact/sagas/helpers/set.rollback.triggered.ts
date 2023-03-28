/**
 * Set rollbackTriggered flag
 * @param process contains state of the process
 * @param step    step name (eg. 'step1')
 * @param success provides whether process step completed successful
 * @returns updatedProcess
 */
export function setRollbackTriggered(process) {
  let processCopy = { ...process };
  processCopy.rollbackTriggered = true;   
  return processCopy;
}