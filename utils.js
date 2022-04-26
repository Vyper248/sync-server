const mergeStrings = (a, b) => {
    let set = new Set([...a, ...b]);
    return Array.from(set);
}

const mergeObjects = (a, b) => {
    let dataMap = {};
    let uniqueKey = a.syncKey;
    a.objects.forEach(obj => {
        let objKey = obj[uniqueKey];
        dataMap[objKey] = obj;
    });

    b.objects.forEach(obj => {
        let objKey = obj[uniqueKey];

        //object doesn't exist in first array, so add it (so long as not deleted)
        if (dataMap[objKey] === undefined && obj.deleted !== true) {
            dataMap[objKey] = obj;
        };

        //object exists in first and deleted in second, so make sure first is deleted too
        if (dataMap[objKey] && obj.deleted === true) {
            dataMap[objKey].deleted = true;
        }

        //otherwise object already exists and not deleted, don't need to do anything
    });

    //filter out any deleted objects
    return Object.values(dataMap).filter(obj => obj.deleted !== true);
}

const mergeData = (first, second) => {
    let dataMapFirst = {};
    let dataMapSecond = {};
    first.forEach(obj => dataMapFirst[obj.key] = obj);
    second.forEach(obj => dataMapSecond[obj.key] = obj);

    let mergedData = {};
    let keysChecked = new Set();

    Object.keys(dataMapFirst).forEach(key => {
        keysChecked.add(key);

        let firstObj = dataMapFirst[key];
        let secondObj = dataMapSecond[key];

        //if no data in second object, use first object
        if (secondObj === undefined) {
            mergedData[key] = firstObj;
            return;
        }

        //if basic array of strings, just merge them
        if (firstObj.type === 'strings') {
            //if there's a different in types, merge first object
            if (secondObj.type !== 'strings') {
                mergedData[key] = firstObj;
                return;
            }

            let objects = mergeStrings(firstObj.objects, secondObj.objects);
            mergedData[key] = {key, objects};
        }

        if (firstObj.type === 'objects') {
            //if there's a different in types, merge first object
            if (secondObj.type !== 'objects') {
                mergedData[key] = firstObj;
                return;
            }

            let objects = mergeObjects(firstObj, secondObj);
            mergedData[key] = {key, objects};
        }
    });

    //check any keys that didn't exist in firstObj and add to merged data
    Object.keys(dataMapSecond).forEach(key => {
        if (keysChecked.has(key)) return;
        mergedData[key] = dataMapSecond[key];
    });

    return Object.values(mergedData);
}

const filterDeleted = (array) => {
    array = array.map(object => {
        if (object.type === 'objects') {
            object.objects = object.objects.filter(obj => obj.deleted !== true);
        }

        return object;
    });
    
    return array;
}

module.exports = {mergeData, filterDeleted};