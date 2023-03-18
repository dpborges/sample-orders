export function logStart(argNames, args: IArguments) {
 console.log('==========================================')
 console.log('>>>> INSIDE', argNames[0])
 let i = 1;
 for (const singleArg of args) {
    let argValue = singleArg;
    console.log(`PARM: ${argNames[i]}`);
    console.log(singleArg);
    i++;
 }
}

export function logStop(funcName, returnName, returnValue) {
  console.log('>>>> END OF ', funcName);
  console.log(`Parm: ${returnName}`)
  console.log(returnValue)
  console.log('------------------------------------------')
  console.log('------------------------------------------')
}
  