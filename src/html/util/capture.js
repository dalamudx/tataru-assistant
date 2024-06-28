'use strict';

// electron
const { ipcRenderer } = require('electron');

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  setIPC();

  setView();
  setEvent();
  setButton();
});

// set IPC
function setIPC() {
  // change UI text
  ipcRenderer.on('change-ui-text', () => {
    const config = ipcRenderer.sendSync('get-config');
    document.dispatchEvent(new CustomEvent('change-ui-text', { detail: config }));
  });
}

// set view
function setView() {
  const config = ipcRenderer.sendSync('get-config');
  document.getElementById('select-type').value = config.captureWindow.type;
  document.getElementById('select-from').innerHTML = ipcRenderer.sendSync('get-source-select');
  document.getElementById('select-from').value = config.translation.from;
  document.getElementById('checkbox-split').checked = config.captureWindow.split;
  document.getElementById('checkbox-edit').checked = config.captureWindow.edit;
  showScreenshotButton(config);
  setCanvasSize();
}

// set event
function setEvent() {
  // move window
  document.addEventListener('move-window', (e) => {
    ipcRenderer.send('move-window', e.detail, false);
  });

  // on resize
  window.onresize = () => {
    setCanvasSize();
  };

  // checkbox
  document.getElementById('checkbox-split').oninput = () => {
    const config = ipcRenderer.sendSync('get-config');
    config.captureWindow.split = document.getElementById('checkbox-split').checked;
    ipcRenderer.send('set-config', config);
  };

  document.getElementById('checkbox-edit').oninput = () => {
    const config = ipcRenderer.sendSync('get-config');
    config.captureWindow.edit = document.getElementById('checkbox-edit').checked;
    ipcRenderer.send('set-config', config);
  };

  // select
  document.getElementById('select-type').onchange = () => {
    const config = ipcRenderer.sendSync('get-config');
    config.captureWindow.type = document.getElementById('select-type').value;
    ipcRenderer.send('set-config', config);
    ipcRenderer.send('check-api', document.getElementById('select-type').value);
    showScreenshotButton(config);
  };

  // canvas event
  setCanvasEvent(document.getElementById('canvas-select'));
}

// set button
function setButton() {
  // screenshot
  document.getElementById('button-screenshot').onclick = () => {
    // minimize all windows
    ipcRenderer.send('minimize-all-windows');

    // set capture data
    const captureData = createData();

    // start recognize
    ipcRenderer.send('start-recognize', captureData);
  };

  // close
  document.getElementById('img-button-close').onclick = () => {
    ipcRenderer.send('close-window');
  };
}

// show screenshot button
function showScreenshotButton(config) {
  document.getElementById('button-screenshot').hidden = config.captureWindow.type !== 'google-vision';
}

// set canvas size
function setCanvasSize() {
  // set canvas
  const canvas = document.getElementById('canvas-select');

  // set size
  canvas.setAttribute('width', window.innerWidth);
  canvas.setAttribute('height', window.innerHeight);
}

// set canvas event
function setCanvasEvent() {
  // set canvas
  const canvas = document.getElementById('canvas-select');

  // set line width
  const lineWidth = getLineWidth();

  // set mouse position
  const screenMouseDown = { x: 0, y: 0 };
  const screenMouseUp = { x: 0, y: 0 };
  const clientMouseDown = { x: 0, y: 0 };

  // on mouse down
  canvas.onmousedown = (event) => {
    // set mousedown screen position
    screenMouseDown.x = event.screenX;
    screenMouseDown.y = event.screenY;

    // set mousedown client position
    clientMouseDown.x = event.clientX;
    clientMouseDown.y = event.clientY;

    // on mouse move
    canvas.onmousemove = (event) => {
      drawRectangle(clientMouseDown.x, clientMouseDown.y, event.clientX, event.clientY);
    };

    // on mouse up
    canvas.onmouseup = (event) => {
      // stop drawing
      canvas.onmouseup = null;
      canvas.onmousemove = null;

      // clear rectangle
      clearRectangle();

      // set mouseup screen position
      screenMouseUp.x = event.screenX;
      screenMouseUp.y = event.screenY;

      // set capture data
      const captureData = createData();

      // set rectangle size
      captureData.rectangleSize = getRectangleSize(
        screenMouseDown.x,
        screenMouseDown.y,
        screenMouseUp.x,
        screenMouseUp.y
      );

      // start recognize
      if (captureData.rectangleSize.width > 0 && captureData.rectangleSize.height > 0) {
        ipcRenderer.send('start-recognize', captureData);
      }
    };
  };

  // draw rectangle
  function drawRectangle(startX, startY, endX, endY) {
    if (canvas.getContext) {
      // set rectangle size
      const rectangleSize = getRectangleSize(startX, startY, endX, endY);
      const ctx = canvas.getContext('2d');

      // clear rectangle
      clearRectangle();

      // draw rectangle
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(rectangleSize.x, rectangleSize.y, rectangleSize.width, rectangleSize.height);
    }
  }

  // clear rectangle
  function clearRectangle() {
    if (canvas.getContext) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// get line width
function getLineWidth() {
  let lineWidth = 1;

  try {
    lineWidth = 0.1 * parseInt(getComputedStyle(document.documentElement).fontSize);
  } catch (error) {
    console.log(error);
  }

  if (isNaN(lineWidth)) {
    lineWidth = 1;
  }

  return lineWidth;
}

// create data
function createData() {
  return {
    type: document.getElementById('select-type').value,
    from: document.getElementById('select-from').value,
    split: document.getElementById('checkbox-split').checked,
    edit: document.getElementById('checkbox-edit').checked,
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
    },
    rectangleSize: {
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
    },
  };
}

// get rectangle size
function getRectangleSize(startX, startY, endX, endY) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(startX - endX),
    height: Math.abs(startY - endY),
  };
}
