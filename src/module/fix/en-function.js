'use strict';

// fix function
const fixFunction = require('./fix-function');

// en json
const enJson = require('./en-json');

// en text function
function replaceTextByCode(text = '', array = []) {
  if (text === '' || !Array.isArray(array) || !array.length > 0) {
    return {
      text: text,
      table: [],
      aiTable: [],
    };
  }

  // set parameters
  const srcIndex = 0;
  const rplIndex = 1;
  let codeIndex = 0;
  let codeString = 'BCFGJLMNPRSTVWXYZ';
  let tempText = text;
  let tempTable = fixFunction.includesArrayItem(text, array, srcIndex, true) || [];
  let table = [];
  let aiTable = [];

  // sort temp table
  tempTable = tempTable.sort((a, b) => b[0].length - a[0].length);

  // set temp text
  const tempTextArray = tempText.match(/\b[A-Z]+[a-z]+\b/g);
  if (tempTextArray) {
    for (let index = 0; index < tempTextArray.length; index++) {
      const element = tempTextArray[index];
      tempText = tempText.replaceAll(element, element.toUpperCase());
    }
  }

  // clear code
  const characters = tempText.match(/[A-Z]/g);
  if (characters) {
    for (let index = 0; index < characters.length; index++) {
      codeString = codeString.replaceAll(characters[index].toUpperCase(), '');
    }
  }

  // search and replace
  for (let index = 0; index < tempTable.length && codeIndex < codeString.length; index++) {
    const element = tempTable[index];
    const searchElement = fixFunction.removeRegSymbol(element[srcIndex]);
    const searchElementPlural = getPluralType(searchElement);
    const searchElementAdjective = getAdjectiveType(searchElement);
    let searchReg = null;

    if (enJson.getEnArray().uncountable.includes(searchElement)) {
      searchReg = new RegExp(`\\b(${searchElement}|${searchElementAdjective})\\b`, 'gi');
    } else {
      searchReg = new RegExp(`\\b(${searchElementPlural}|${searchElement}|${searchElementAdjective})\\b`, 'gi');
    }

    if (searchReg.test(text)) {
      text = text.replace(searchReg, codeString[codeIndex]);
      table.push([codeString[codeIndex], element[rplIndex]]);
      aiTable.push([element[srcIndex], element[rplIndex]]);
      codeIndex++;
    }
  }

  const result = {
    text,
    table,
    aiTable,
  };

  console.log('tempTable:', tempTable);
  console.log('codeString:', codeString);
  console.log('result:', result);

  return result;
}

function needTranslation(text = '', table = []) {
  // remove table index
  const enReg = '(' + table.map((value) => value[0]).join(')|(') + ')';
  if (enReg !== '') {
    text = text.replace(new RegExp(enReg, 'gi'), '');
  }

  // remove marks
  text = text.replace(/[^A-Za-z]/g, '');
  console.log('needTranslation:', text !== '');

  return text !== '';
}

function getPluralType(text = '') {
  if (/(s|x|z|sh|ch)$/gi.test(text)) {
    return text + 'es';
  } else if (/(f|fe)$/gi.test(text)) {
    return text.replace(/(f|fe)$/gi, 'ves');
  } else if (/[^aeiou]y$/gi.test(text)) {
    return text.replace(/y$/gi, 'ies');
  } else if (/[^aeiou]o$/gi.test(text)) {
    return text + 'es';
  }

  return text + 's';
}

function getAdjectiveType(text = '') {
  if (/(s|x|z|sh|ch)$/gi.test(text)) {
    return text + 'en';
  } else if (/(f|fe)$/gi.test(text)) {
    return text.replace(/(f|fe)$/gi, 'ven');
  } else if (/[^aeiou]y$/gi.test(text)) {
    return text.replace(/y$/gi, 'ien');
  } else if (/(a|e|i|o|u)$/gi.test(text)) {
    return text.replace(/(a|e|i|o|u)$/gi, 'an');
  }

  return text + 'an';
}

function isChinese(text = '') {
  const chLength = text.match(/[\u3400-\u9FFF]/gi)?.length || 0;
  return chLength > 0;
}

// module exports
module.exports = {
  replaceTextByCode,
  needTranslation,
  isChinese,
};
