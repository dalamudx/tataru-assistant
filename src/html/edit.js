'use strict';

// electron
const { ipcRenderer } = require('electron');

// all language list
const allLanguageList = ['Japanese', 'English', 'Traditional-Chinese', 'Simplified-Chinese', 'Korean', 'Russian', 'Italian'];

// target log
let targetLog = null;

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', async () => {
  setIPC();
  await setView();
  setEvent();
  setButton();
});

// set IPC
function setIPC() {
  // change UI text
  ipcRenderer.on('change-ui-text', async () => {
    const config = await ipcRenderer.invoke('get-config');
    document.dispatchEvent(new CustomEvent('change-ui-text', { detail: config }));
  });

  // send data
  ipcRenderer.on('send-data', async (event, id) => {
    await readLog(id);
  });
  
  // 接收字体更新消息
  ipcRenderer.on('update-font-settings', (event, config) => {
    applyFontSettings(config);
  });
}

// 应用字体设置
function applyFontSettings(config) {
  if (config && config.dialog && typeof config.dialog.fontFamily === 'string') {
    if (config.dialog.fontFamily !== '') {
      document.body.style.fontFamily = `\"${config.dialog.fontFamily}\", sans-serif`;
    } else {
      document.body.style.fontFamily = ''; // 恢复到默认CSS字体
    }
  }
}

// set view
async function setView() {
  const config = await ipcRenderer.invoke('get-config');

  document.getElementById('select-engine').innerHTML = await ipcRenderer.invoke('get-engine-select');
  document.getElementById('select-from').innerHTML = await ipcRenderer.invoke('get-source-select');
  document.getElementById('select-to').innerHTML = await ipcRenderer.invoke('get-target-select');

  document.getElementById('select-engine').value = config.translation.engine;
  document.getElementById('select-from').value = config.translation.from;
  document.getElementById('select-to').value = config.translation.to;

  document.getElementById('checkbox-replace').checked = config.translation.replace;
  
  // 应用字体设置
  applyFontSettings(config);

  // change UI text
  ipcRenderer.send('change-ui-text');
}

// set event
function setEvent() {
  // move window
  document.addEventListener('move-window', (e) => {
    ipcRenderer.send('move-window', e.detail, false);
  });

  document.getElementById('checkbox-replace').oninput = async () => {
    const config = await ipcRenderer.invoke('get-config');
    config.translation.replace = document.getElementById('checkbox-replace').checked;
    await ipcRenderer.invoke('set-config', config);
  };
}

// set button
function setButton() {
  // restart
  document.getElementById('button-restart-translate').onclick = async () => {
    const config = await ipcRenderer.invoke('get-config');

    const dialogData = {
      id: targetLog.id,
      code: targetLog.code,
      name: targetLog.name,
      text: targetLog.text,
      timestamp: targetLog.timestamp,
      translation: config.translation,
    };

    if (!dialogData.translation.replace) {
      // clear id and timestamp
      dialogData.id = null;
      dialogData.timestamp = null;
    }

    dialogData.translation.engine = document.getElementById('select-engine').value;
    dialogData.translation.from = document.getElementById('select-from').value;
    dialogData.translation.fromPlayer = document.getElementById('select-from').value;
    dialogData.translation.to = document.getElementById('select-to').value;

    ipcRenderer.send('add-task', dialogData);
  };

  // load json
  document.getElementById('button-load-json').onclick = () => {
    ipcRenderer.send('load-json');
  };

  // report translation
  document.getElementById('button-report-translation').onclick = () => {
    ipcRenderer.send('execute-command', 'explorer "https://forms.gle/1iX2Gq4G1itCy3UH9"');
  };

  // save custom
  document.getElementById('button-save-custom').onclick = () => {
    const textBefore = document.getElementById('textarea-before').value.replaceAll('\n', '').trim();
    const textAfter = document.getElementById('textarea-after').value.replaceAll('\n', '').trim();
    const type = document.getElementById('select-type').value;

    if (textBefore.length > 1) {
      ipcRenderer.send('save-user-custom', textBefore, textAfter, type);
      ipcRenderer.send('add-notification', 'WORD_SAVED');
    } else {
      ipcRenderer.send('add-notification', 'LENGTH_TOO_SHORT');
    }
  };

  // delete custom
  document.getElementById('button-delete-custom').onclick = () => {
    const textBefore = document.getElementById('textarea-before').value.replaceAll('\n', '').trim();
    const type = document.getElementById('select-type').value;

    if (textBefore.length > 1) {
      ipcRenderer.send('delete-user-custom', textBefore, type);
      ipcRenderer.send('add-notification', 'WORD_DELETED');
    } else {
      ipcRenderer.send('add-notification', 'LENGTH_TOO_SHORT');
    }
  };

  // edit custom
  document.getElementById('button-edit-custom').onclick = () => {
    ipcRenderer.send('create-window', 'custom');
  };

  // close
  document.getElementById('img-button-close').onclick = () => {
    ipcRenderer.send('close-window');
  };
}

// read log
async function readLog(id = '') {
  const logPath = await ipcRenderer.invoke('get-user-data-path', 'log');

  try {
    const config = await ipcRenderer.invoke('get-config');
    const milliseconds = parseInt(id.slice(2));
    const filePath = await ipcRenderer.invoke('get-path', logPath, await createLogName(milliseconds));
    const log = await ipcRenderer.invoke('read-json', filePath, false);

    targetLog = log[id];

    if (targetLog) {
      // show audio
      await showAudio();

      // show text
      showText();

      // set select-engine
      if (targetLog?.translation?.engine) {
        document.getElementById('select-engine').value = fixLogValue(
          targetLog.translation.engine,
          ['Youdao', 'Baidu', 'Caiyun', 'Papago', 'DeepL', 'GPT', 'Cohere', 'Gemini', 'Kimi', 'LLM-API'],
          config.translation.engine
        );
      }

      // set select-from
      if (targetLog?.translation?.from) {
        document.getElementById('select-from').value = fixLogValue(targetLog.translation.from, allLanguageList, config.translation.from);
      }

      // set select-to
      if (targetLog?.translation?.to) {
        document.getElementById('select-to').value = fixLogValue(targetLog.translation.to, allLanguageList, config.translation.to);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

// show audio
async function showAudio() {
  const text = targetLog.audio_text || targetLog.text;

  if (text !== '') {
    try {
      const urlList = await ipcRenderer.invoke('google-tts', text, targetLog.translation.from);
      console.log('TTS url:', urlList);

      let innerHTML = '';
      for (let index = 0; index < urlList.length; index++) {
        const url = urlList[index];

        innerHTML += `
                    <audio controls preload="metadata">
                        <source src="${url}" type="audio/ogg">
                        <source src="${url}" type="audio/mpeg">
                    </audio>
                    <br>
                `;
      }

      document.getElementById('div-audio').innerHTML = innerHTML;
    } catch (error) {
      console.log(error);
    }
  }
}

// show text
function showText() {
  const divText1 = document.getElementById('div-text1');
  const name1 = targetLog.name;
  const text1 = targetLog.text;

  const divText2 = document.getElementById('div-text2');
  const name2 = targetLog.translated_name;
  const text2 = targetLog.translated_text;

  divText1.innerHTML = `<span>${name1 !== '' ? name1 + '：<br>' : ''}${text1}</span>`;
  divText2.innerHTML = `<span>${name2 !== '' ? name2 + '：<br>' : ''}${text2}</span>`;
}

/*
// report translation
function reportTranslation() {
  // google form
  const formId = '1FAIpQLScj8LAAHzy_nTIbbJ1BSqNzyZy3w5wFrLxDVUMbY0BIAjaIAg';
  const entry1 = 'entry.195796166';
  const entry2 = 'entry.1834106335';
  const entry3 = 'entry.2057890818';
  const entry4 = 'entry.654133178';

  try {
    const text1 = (targetLog.name !== '' ? targetLog.name + ': ' : '') + targetLog.text;
    const text2 =
      (targetLog.translated_name !== '' ? targetLog.translated_name + ': ' : '') + targetLog.translated_text;
    const path =
      `/forms/d/e/${formId}/formResponse?` +
      `${entry1}=待處理` +
      `&${entry2}=${targetLog.translation.engine}` +
      `&${entry3}=${text1}` +
      `&${entry4}=${text2}`;

    ipcRenderer.send('post-form', encodeURI(path));
    ipcRenderer.send('show-info', '回報完成');
  } catch (error) {
    console.log(error);
    ipcRenderer.send('show-info', '' + error);
  }
}
*/

// fix log value
function fixLogValue(value = '', valueArray = [], defaultValue = '') {
  if (!valueArray.includes(value)) value = defaultValue;
  return value;
}

// create log name
async function createLogName(milliseconds = null) {
  return await ipcRenderer.invoke('create-log-name', milliseconds);
}
