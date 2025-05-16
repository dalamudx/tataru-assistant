'use strict';

/**
 * 应用字体设置到当前文档
 * @param {Object} config - 应用配置对象
 */
function applyFontSettings(config) {
  if (config && config.dialog && typeof config.dialog.fontFamily === 'string') {
    if (config.dialog.fontFamily !== '') {
      document.body.style.fontFamily = `\"${config.dialog.fontFamily}\", sans-serif`;
    } else {
      document.body.style.fontFamily = ''; // 恢复到默认CSS字体
    }
  } else {
    console.warn('Tataru Assistant: config.dialog.fontFamily not found or not a string, using default body font.');
    document.body.style.fontFamily = ''; 
  }
}

// 导出函数以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyFontSettings
  };
} 