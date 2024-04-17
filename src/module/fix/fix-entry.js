'use strict';

// config module
const configModule = require('../system/config-module');

// dialog module
const dialogModule = require('../system/dialog-module');

// language table
const { languageEnum, fixList } = require('../system/engine-module');

// translate module
const translateModule = require('../system/translate-module');

// fix module
const enFix = require('./en-fix');
const jpFix = require('./jp-fix');

// npc channel
const npcChannel = ['003D', '0044', '2AB9'];

// player channel
const playerChannel = getPlayerChannel();

// entry interval
let lastTimestamp = 0;
let running = false;
let entryIntervalItem = [];
let entryInterval = getEntryInterval();

// set running
function setRunning(value) {
  running = value;
}

// add task
function addTask(dialogData) {
  // check id and timestamp
  if (!dialogData.id || !dialogData.timestamp) {
    let timestamp = new Date().getTime();
    if (timestamp <= lastTimestamp) timestamp = lastTimestamp + 1;
    lastTimestamp = timestamp;
    dialogData.id = 'id' + timestamp;
    dialogData.timestamp = timestamp;
  }

  // check translation
  if (!dialogData.translation) {
    dialogData.translation = configModule.getConfig().translation;
  }

  // push
  entryIntervalItem.push(dialogData);
}

// restart entry interval
function restartEntryInterval() {
  clearInterval(entryInterval);
  entryIntervalItem = [];
  entryInterval = getEntryInterval();
}

// get entry interval
function getEntryInterval() {
  return setInterval(() => {
    if (running) entry();
  }, 1000);
}

// entry
async function entry() {
  const config = configModule.getConfig();
  let dialogData = entryIntervalItem.shift();

  if (!dialogData) return;

  // add dialog
  dialogModule.addDialog(dialogData.id, dialogData.code);

  // clear content
  dialogData.name = dialogData.name.replace(/[\r\n]/g, '');
  dialogData.text = dialogData.text.replace(/[\r\n]/g, '');

  // set translated content
  dialogData.translatedName = dialogData.name;
  dialogData.translatedText = dialogData.text;
  dialogData.audioText = dialogData.text;

  // get language
  const dataLanguage = getLanguage(dialogData);

  if (config.translation.fix && fixList.includes[dataLanguage]) {
    if (dataLanguage === languageEnum.ja) {
      dialogData.translation.from = languageEnum.ja;
      dialogData = await jpFix.start(dialogData);
    } else if (dataLanguage === languageEnum.en) {
      dialogData.translation.from = languageEnum.en;
      dialogData = await enFix.start(dialogData);
    } else {
      // other fix
    }
  } else {
    if (npcChannel.includes(dialogData.code)) {
      dialogData.translatedName = translateModule.translate(dialogData.name, dialogData.translation);
    }

    dialogData.translatedText = translateModule.translate(dialogData.text, dialogData.translation);
  }

  // update dialog
  if (dialogData.translatedText !== '') {
    dialogModule.updateDialog(
      dialogData.id,
      dialogData.code,
      dialogData.translatedName,
      dialogData.translatedText,
      dialogData
    );
  } else {
    dialogModule.removeDialog(dialogData.id);
  }
}

// get language
function getLanguage(dialogData) {
  return isPlayerChannel(dialogData.code) ? dialogData.translation.fromPlayer : dialogData.translation.from;
}

// is player channel
function isPlayerChannel(code) {
  return playerChannel.includes(code);
}

// get player channel
function getPlayerChannel() {
  return [
    // Say
    '000A',

    // Shout
    '000B',

    // Party
    '000E',

    // Tell
    '000D',

    // FreeCompany
    '0018',

    // Yell
    '001E',

    // Alliance
    '000F',

    // LinkShell
    '0010',
    '0011',
    '0012',
    '0013',
    '0014',
    '0015',
    '0016',
    '0017',

    // CWLS
    '0025',
    '0065',
    '0066',
    '0067',
    '0068',
    '0069',
    '006A',
    '006B',

    // NoviceNetwork
    '001B',
  ];
}

// module exports
module.exports = {
  setRunning,
  addTask,
  restartEntryInterval,
};
