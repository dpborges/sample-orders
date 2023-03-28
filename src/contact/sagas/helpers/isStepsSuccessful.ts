export function isStepsSuccessful(steps, process) {
  let successFlagsArray = steps.map(step => process[step].success);
  let isSuccessful = (stepSuccess) => stepSuccess;
  let stepsSuccessful = successFlagsArray.every(isSuccessful);
  return stepsSuccessful;
}