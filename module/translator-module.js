'use strict';

const { ipcRenderer } = require('electron');
const { languageEnum, AvailableEngine, getOption } = require('./engine-module');

async function translate(text, translation, table = []) {
    let engine = translation.engine;
    const autoChange = translation.autoChange;

    // set option
    let option = getOption(engine, translation.from, translation.to, text);

    // initialize
    let translatedText = '';
    let retryCount = 0;
    let missingCodes = [];

    do {
        // fix text
        option.text = fixCode(option.text, missingCodes);

        // translate
        translatedText = ipcRenderer.sendSync('translate', engine, option);
        console.log(engine + ':', translatedText);

        // add count
        retryCount++;

        if (translatedText === '') {
            console.log('Response is empty.');

            // auto change
            if (autoChange) {
                for (let index = 0; index < AvailableEngine.length; index++) {
                    const nextEngine = AvailableEngine[index];

                    // find new engine
                    if (nextEngine !== engine) {
                        console.log(`Use ${nextEngine}.`);

                        // set new engine
                        engine = nextEngine;

                        // set new option
                        option = getOption(engine, translation.from, translation.to, option.text);

                        // retranslate
                        translatedText = ipcRenderer.sendSync('translate', engine, option);

                        if (translatedText !== '') {
                            break;
                        }
                    }
                }
            }
        }

        // missing code check
        missingCodes = missingCodeCheck(translatedText, table);
    } while (missingCodes.length > 0 && retryCount < 3);

    return await zhtConvert(translatedText, translation.to);
}

async function zhtConvert(text, languageTo) {
    if (languageTo === languageEnum.zht && text !== '') {
        const option = {
            from: 'zh-CN',
            to: 'zh-TW',
            text: text
        }
        const response = ipcRenderer.sendSync('translate', 'Google', option);
        return response !== '' ? response : text;
    } else {
        return text;
    }
}

function missingCodeCheck(text, table) {
    let missingCodes = [];

    if (table.length > 0) {
        for (let index = 0; index < table.length; index++) {
            const code = table[index][0];
            if (!new RegExp(code, 'gi').test(text)) {
                missingCodes.push(code);
            }
        }
    }

    return missingCodes;
}

function fixCode(text, missingCodes) {
    if (missingCodes.length > 0) {
        for (let index = 0; index < missingCodes.length; index++) {
            const code = missingCodes[index][0];
            const codeRegExp = new RegExp(`(${code}+)`, 'gi');

            text = text.replace(codeRegExp, '$1' + code);
        }
    }

    return text;
}

exports.translate = translate;