/* Constructs a before and after image for a given update request aggregate. */

export function buildBeforeAndAfterImage(updateRequest, originalObject) {

  // Helper Functions
  function getKeysFromUpdateRequest(updateRequest): Array<string> {
    /* excludes id property */
    return Object.keys(updateRequest).filter(prop => prop !== 'id')
  }
  function getKeysFromOriginalObject(originalObject): Array<string> {
    /* excludes id property */
    return Object.keys(originalObject).filter(prop => prop !== 'id')
  }
  function getCommonKeys(updateKeys, originalObjectKeys) {
    return updateKeys.filter((updateProp) => originalObjectKeys.filter((updateProp) => originalObjectKeys.includes(updateProp)));
  }
  function buildUpdateRequestImage(commonKeys, originalObject) {
    let tempObject = {};
    commonKeys.forEach((prop) => tempObject[prop] = originalObject[prop]);
    return tempObject;
  }

  // Main Logic
  let keysWithUpdates        = getKeysFromUpdateRequest(updateRequest);
  let keysFromOriginalObject = getKeysFromOriginalObject(originalObject);
  let commonKeys             = getCommonKeys(keysWithUpdates, keysFromOriginalObject);
  let beforeUpdateImage      = buildUpdateRequestImage(commonKeys, originalObject)
  
  let updates = {
    before: beforeUpdateImage,
    after: updateRequest
  }
  
  return updates;
}