'use strict';

// file module
const fileModule = require('../system/file-module');

// path list
const pathList = {
  ch: 'src/data/text/ch',
  en: 'src/data/text/en',
  jp: 'src/data/text/jp',
  main: 'src/data/text/main',
};

// Not kanji
const regNotKanji = /[^\u3100-\u312F\u3400-\u4DBF\u4E00-\u9FFF]/;

// get text path
function getTextPath(dir = '', ...args) {
  return fileModule.getRootPath(pathList[dir], ...args);
}

// get temp text path
function getTempTextPath(...args) {
  return fileModule.getUserDataPath('temp', ...args);
}

// read text
function readText(path = '', sort = true, map = false, srcIndex = 0, rplIndex = 1) {
  try {
    let array = [];
    let data = fileModule.read(path, 'json');

    if (Array.isArray(data)) {
      array = data;
    } else {
      throw path + ' is not an array.';
    }

    // map array
    if (map) {
      array = mapArray(array, srcIndex, rplIndex);
    }

    // clear array
    array = clearArray(array);

    // sort array
    if (sort) {
      array = sortArray(array);
    }

    return array;
  } catch (error) {
    console.log(error);
    fileModule.write(path, '[]');
    return [];
  }
}

// read overwrite EN
function readOverwriteEN(rplIndex = 1) {
  return readMultiText(fileModule.getRootPath(pathList.ch, 'overwrite-en'), 0, rplIndex);
}

// read overwrite JP
function readOverwriteJP(rplIndex = 1) {
  return readMultiText(fileModule.getRootPath(pathList.ch, 'overwrite-jp'), 0, rplIndex);
}

// read subtitle EN
function readSubtitleEN() {
  return readMultiText(fileModule.getRootPath(pathList.en, 'subtitle'), 0, 1);
}

// read subtitle JP
function readSubtitleJP() {
  return readMultiText(fileModule.getRootPath(pathList.jp, 'subtitle'), 0, 1);
}

// read main
function readMain(srcIndex = 0, rplIndex = 1) {
  return readMultiText(fileModule.getRootPath(pathList.main), srcIndex, rplIndex);
}

// read multi texts
function readMultiText(filePath = '', srcIndex = 0, rplIndex = 1) {
  try {
    const fileList = fileModule.readdir(filePath);
    let array = [];

    if (fileList.length > 0) {
      fileList.forEach((value) => {
        if (value !== 'hidden.json') {
          array = array.concat(readText(fileModule.getPath(filePath, value), false, true, srcIndex, rplIndex));
        }
      });
    }

    return sortArray(array);
  } catch (error) {
    console.log(error);
    return [];
  }
}

// read temp
function readTemp(name = '', sort = true) {
  return readText(getTempTextPath(name), sort);
}

// write temp
function writeTemp(name = '', data = []) {
  fileModule.write(getTempTextPath(name), data, 'json');
}

// map array
function mapArray(array = [], index0 = 0, index1 = 1) {
  if (!checkArray(array)) {
    return [];
  }

  array.forEach((value, index, array) => {
    array[index] = [value[index0], value[index1]];
  });

  return array;
}

// clear array
function clearArray(array = []) {
  if (!checkArray(array)) {
    return [];
  }

  if (Array.isArray(array[0])) {
    // 2d
    for (let index = array.length - 1; index >= 0; index--) {
      const element = array[index];
      const text = element[0];
      const translatedText = element[1];

      if (
        typeof text === 'undefined' ||
        typeof translatedText === 'undefined' ||
        /(\/\/comment)|(^N\/A$)|(^$)/gi.test(text) ||
        /(\/\/comment)|(^N\/A$)/gi.test(translatedText)
      ) {
        array.splice(index, 1);
      }
    }
  } else {
    // not 2d
    for (let index = array.length - 1; index >= 0; index--) {
      const text = array[index];
      if (typeof text === 'undefined' || /(\/\/comment)|(^N\/A$)|(^$)/gi.test(text)) {
        array.splice(index, 1);
      }
    }
  }

  return array;
}

// sort array
function sortArray(array = []) {
  if (!checkArray(array)) {
    return [];
  }

  if (Array.isArray(array[0])) {
    if (Array.isArray(array[0][0])) {
      // 3d
      return array.sort((a, b) => b[0][0].length - a[0][0].length);
    } else {
      // 2d
      return array.sort((a, b) => b[0].length - a[0].length);
    }
  } else {
    // 1d
    return array.sort((a, b) => b.length - a.length);
  }
}

// combine array
function combineArray(...args) {
  return sortArray([].concat(...args));
}

// combine array with user
function combineArray2(customArray = [], ...args) {
  // arrays
  const otherArrays = combineArray(...args);
  const otherNames = otherArrays.map((x) => x[0]);
  let customArray2 = [].concat(customArray).map((x) => [x[0], x[1]]);

  // compare names
  for (let index = customArray2.length - 1; index >= 0; index--) {
    const customElement = customArray2[index];
    const customNames = customElement[0] || '';
    const targetIndex = Math.max(
      otherNames.indexOf(customNames),
      otherNames.indexOf(customNames + '#'),
      otherNames.indexOf(customNames + '##')
    );

    // remove elements from other array
    if (targetIndex >= 0) {
      otherArrays.splice(targetIndex, 1);
      otherNames.splice(targetIndex, 1);
    }
  }

  return combineArray(customArray2, otherArrays);
}

// combine array with temp
function combineArrayWithTemp(temp = [], ...args) {
  // array
  const combine = combineArray(...args);
  const combine0 = combine.map((x) => x[0]);
  let snapTemp = [].concat(temp);

  // search same name in temp and add its index to delete list
  for (let index = snapTemp.length - 1; index >= 0; index--) {
    const tempElement = snapTemp[index];
    const tempName = tempElement[0] || '';
    const tempType = tempElement[2] || '';
    const tempIndex = index;
    const combineIndex = Math.max(
      combine0.indexOf(tempName),
      combine0.indexOf(tempName + '#'),
      combine0.indexOf(tempName + '##')
    );

    // delete element
    if (
      tempType === 'temp' ||
      (tempType !== '' && tempName.length < 3 && regNotKanji.test(tempName) && !tempName.length.includes('#'))
    ) {
      // delete element from temp
      snapTemp.splice(tempIndex, 1);
    } else if (tempType === 'temp-npc') {
      // delete element from temp-npc
      if (combineIndex >= 0) {
        snapTemp.splice(tempIndex, 1);
      }
    } else {
      // delete element from combine
      if (combineIndex >= 0) {
        combine.splice(combineIndex, 1);
        combine0.splice(combineIndex, 1);
      }
    }
  }

  // sub snap temp
  snapTemp = snapTemp.map((x) => [x[0], x[1]]);

  return combineArray(snapTemp, combine);
}

// create RegExp array
function createRegExpArray(array = []) {
  let newArray = [];

  for (let index = 0; index < array.length; index++) {
    try {
      newArray.push([new RegExp(array[index][0], 'gi'), array[index][1]]);
    } catch (error) {
      //console.log(error);
    }
  }

  return newArray;
}

// check array
function checkArray(array = []) {
  return Array.isArray(array) && array.length > 0;
}

// module exports
module.exports = {
  getTextPath,
  readText,
  readOverwriteEN,
  readOverwriteJP,
  readSubtitleEN,
  readSubtitleJP,
  readMain,
  readTemp,
  writeTemp,
  sortArray,
  combineArray,
  combineArray2,
  combineArrayWithTemp,
  createRegExpArray,
};
