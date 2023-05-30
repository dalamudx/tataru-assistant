'use strict';

// language table
const { languageEnum, languageIndex } = require('../system/engine-module');

// correction function
const cfen = require('./correction-function-en');
const cf = require('./correction-function');

// translator module
const tm = require('../system/translate-module');

// dialog module
const dialogModule = require('../system/dialog-module');

// file module
const fileModule = require('../system/file-module');

// npc channel
const npcChannel = ['003D', '0044', '2AB9'];

// temp path
const tempPath = fileModule.getUserDataPath('temp');

// correction queue
let correctionQueueItems = [];
let correctionQueueInterval = null;

// document
let chArray = {
    // force replace
    overwrite: [],

    // after
    afterTranslation: [],

    // replace
    main: [],

    // player
    player: [],

    // temp
    chTemp: [],

    // combine
    combine: [],
};

let enArray = {
    // ignore
    ignore: [],

    // en => en
    en1: [],
    en2: [],
};

function loadJSON(languageTo) {
    // clear queue interval
    clearInterval(correctionQueueInterval);
    correctionQueueInterval = null;

    const sub0 = languageIndex[languageEnum.en];
    const sub1 = languageIndex[languageTo];
    const chineseDirectory = sub1 === languageIndex[languageEnum.zht] ? 'text/cht' : 'text/chs';
    const englishDirectory = 'text/en';

    // ch array
    chArray.overwrite = cf.combineArrayWithTemp(cf.readJSON(tempPath, 'overwriteTemp.json'), cf.readJSONOverwrite(chineseDirectory, 'overwriteEN'));
    chArray.afterTranslation = cf.readJSON(chineseDirectory, 'afterTranslation.json');

    chArray.main = cf.readJSONMain(sub0, sub1);
    chArray.player = cf.readJSON(tempPath, 'player.json');
    chArray.chTemp = cf.readJSON(tempPath, 'chTemp.json');

    // combine
    chArray.combine = cf.combineArrayWithTemp(chArray.chTemp, chArray.player, chArray.main);

    // en array
    enArray.ignore = cf.readJSON(englishDirectory, 'ignore.json');
    enArray.en1 = cf.readJSON(englishDirectory, 'en1.json');
    enArray.en2 = cf.readJSON(englishDirectory, 'en2.json');

    // start/restart queue interval
    correctionQueueInterval = setInterval(() => {
        const item = correctionQueueItems.shift();

        if (item) {
            startCorrection(item.dialogData, item.translation);
        }
    }, 1000);
}

function addToCorrectionQueue(dialogData, translation) {
    correctionQueueItems.push({
        dialogData: dialogData,
        translation: translation,
    });
}

async function startCorrection(dialogData, translation) {
    try {
        // skip check
        if (translation.skip && cf.skipCheck(dialogData.code, dialogData.name, dialogData.text, enArray.ignore)) {
            return;
        }

        // set id and timestamp
        if (!dialogData.id) {
            const timestamp = new Date().getTime();
            dialogData.id = 'id' + timestamp;
            dialogData.timestamp = timestamp;
        }

        // add dialog
        dialogModule.addDialog(dialogData.id, dialogData.code);

        // name translation
        let translatedName = '';
        if (cfen.isChinese(dialogData.name, translation)) {
            translatedName = cf.replaceText(dialogData.name, chArray.combine);
        } else {
            if (npcChannel.includes(dialogData.code)) {
                if (translation.fix) {
                    translatedName = await nameCorrection(dialogData.name, translation);
                } else {
                    translatedName = await tm.translate(dialogData.name, translation);
                }
            } else {
                translatedName = dialogData.name;
            }
        }

        // text translation
        let translatedText = '';
        if (cfen.isChinese(dialogData.text, translation)) {
            translatedText = cf.replaceText(dialogData.text, chArray.combine);
        } else {
            if (translation.fix) {
                translatedText = await textCorrection(dialogData.name, dialogData.text, translation);
            } else {
                translatedText = await tm.translate(dialogData.text, translation);
            }
        }

        // set audio text
        dialogData.audioText = dialogData.text;

        // update dialog
        dialogModule.updateDialog(dialogData.id, translatedName, translatedText, dialogData, translation);
    } catch (error) {
        console.log(error);
        dialogModule.updateDialog(dialogData.id, 'Error', error, dialogData, translation);
    }
}

async function nameCorrection(name, translation) {
    if (name === '') {
        return '';
    }

    // same check
    const target1 = cf.sameAsArrayItem(name, chArray.combine);
    const target2 = cf.sameAsArrayItem(name + '#', chArray.combine);
    if (target1) {
        return target1[0][1];
    } else if (target2) {
        return target2[0][1].replaceAll('#', '');
    } else {
        // code
        const codeResult = cfen.replaceTextByCode(name, chArray.combine);

        // translate name
        let translatedName = '';
        translatedName = codeResult.text;

        // skip check
        if (!cfen.canSkipTranslation(translatedName, codeResult.table)) {
            // translate
            translatedName = await tm.translate(translatedName, translation, codeResult.table);
        }

        // clear code
        translatedName = cf.clearCode(translatedName, codeResult.table);

        // mark fix
        translatedName = cf.markFix(translatedName, true);

        // table
        translatedName = cf.replaceText(translatedName, codeResult.table);

        // save to temp
        saveName(name, translatedName);

        return translatedName;
    }
}

async function textCorrection(name, text, translation) {
    if (text === '') {
        return;
    }

    // force overwrite
    const target = cf.sameAsArrayItem(text, chArray.overwrite);
    if (target) {
        return cf.replaceText(target[0][1], chArray.combine);
    } else {
        // mark fix
        text = cf.markFix(text);

        // en1
        text = cf.replaceText(text, enArray.en1);

        // combine
        const codeResult = cfen.replaceTextByCode(text, chArray.combine);
        text = codeResult.text;

        // en2
        text = cf.replaceText(text, enArray.en2);

        // value fix before
        const valueResult = cf.valueFixBefore(text);
        text = valueResult.text;

        // skip check
        if (!cfen.canSkipTranslation(text, codeResult.table)) {
            // translate
            text = await tm.translate(text, translation, codeResult.table);
        }

        // clear code
        text = cf.clearCode(text, codeResult.table);

        // after translation
        text = cf.replaceText(text, chArray.afterTranslation);

        // mark fix
        text = cf.markFix(text, true);

        // value fix after
        text = cf.valueFixAfter(text, valueResult.table);

        // table
        text = cf.replaceText(text, codeResult.table);

        return text;
    }
}

function saveName(name = '', translatedName = '') {
    if (name === translatedName) {
        return;
    }

    chArray.chTemp = fileModule.read(fileModule.getPath(tempPath, 'chTemp.json'), 'json') || [];

    if (name.length < 3) {
        chArray.chTemp.push([name + '#', translatedName, 'temp']);
    } else {
        chArray.chTemp.push([name, translatedName, 'temp']);
    }

    // set combine
    chArray.combine = cf.combineArrayWithTemp(chArray.chTemp, chArray.player, chArray.main);

    // write
    fileModule.write(fileModule.getPath(tempPath, 'chTemp.json'), chArray.chTemp, 'json');
}

// module exports
module.exports = {
    loadJSON_EN: loadJSON,
    addToCorrectionQueue_EN: addToCorrectionQueue,
};