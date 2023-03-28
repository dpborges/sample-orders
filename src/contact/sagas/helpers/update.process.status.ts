 /**
   * Update current step status
   * @param process contains state of the process
   * @param step    step name (eg. 'step1')
   * @param success provides whether process step completed successful
   * @returns updatedProcess
   */
 export function updateProcessStatus(process, step:string, success: boolean) {
  let processCopy = { ...process };
  processCopy[step].success = success;  /* assign success status */
  return processCopy;
}